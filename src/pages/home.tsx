import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TooltipTypo } from "@/components/ui/tooltip-typo";
import { RangeSlider } from "@/components/ui/range-slider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PensionChart } from "@/components/charts/pension-chart";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { ProgressIndicator, LoadingOverlay, useProgressIndicator } from "@/components/ui/progress-indicator";
import { ConfirmationDialog, ResetConfirmation, useConfirmation } from "@/components/ui/confirmation-dialog";
import { ScreenReaderOnly, SkipLink, AccessibleField, AccessibleButton, useAnnouncer } from "@/components/ui/accessibility-helpers";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import type { TabType, FormData } from "@/lib/types";
import type { SimulationResults } from "@/lib/types";
import ErrorBoundary, { useErrorHandler } from "@/components/ui/ErrorBoundary";
import { FadeIn, SlideIn, ScaleIn, StaggerContainer, StaggerItem, ScrollReveal, HoverScale, PageTransition } from "@/components/ui/animations";
import { User, Settings, Check, X, Download, Calculator, Info, TrendingUp, Shield, AlertCircle, Eye, EyeOff, Moon, Sun, HelpCircle, Zap, Save, BarChart3 } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
// PDF generator lazy loaded on-demand for better performance
// import { generatePensionPDF } from "@/services/pdf-generator";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useAutoSave } from "@/hooks/useAutoSave";

const formSchema = z.object({
  currentAge: z.number().min(18).max(80),
  startAge: z.number().min(16).max(80),
  termYears: z.number().min(5).max(45),
  monthlyContribution: z.number().min(0),
  startInvestment: z.number().min(0),
  targetMaturityValue: z.union([z.number().min(0), z.literal(0), z.null(), z.undefined()]).optional().nullable(),
  payoutStartAge: z.number().min(62).max(85),
  payoutEndAge: z.number().min(62).max(85),
  payoutMode: z.enum(["annuity", "flex"]),
  annuityRate: z.number().min(0).max(1),
  safeWithdrawalRate: z.number().min(0).max(1).optional(),
});

interface HomeProps {
  initialTab?: TabType;
}

function Home({ initialTab = "private-pension" }: HomeProps = {}) {
  const [location, setLocation] = useLocation();
  const searchParams = useSearch();

  // Parse tab from URL query parameter or use initialTab
  const getTabFromUrl = (): TabType => {
    const params = new URLSearchParams(searchParams);
    const tabParam = params.get('tab');
    const validTabs: TabType[] = ['private-pension', 'funds', 'fund-performance', 'comparison', 'custom-comparison'];

    if (tabParam && validTabs.includes(tabParam as TabType)) {
      return tabParam as TabType;
    }

    return initialTab;
  };

  const [activeTab, setActiveTabInternal] = useState<TabType>(getTabFromUrl());

  // Update tab and URL together
  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabInternal(tab);

    // Update URL with new tab parameter
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);

    // Use current pathname with new search params
    const currentPath = location.split('?')[0];
    const newUrl = `${currentPath}?${params.toString()}`;

    // Update URL without full page reload
    window.history.pushState(null, '', newUrl);
  }, [location, searchParams]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getTabFromUrl();
      setActiveTabInternal(newTab);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [searchParams]);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [chartType, setChartType] = useState<"line" | "area" | "composed" | "bar">("area");
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [showCostSettings, setShowCostSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Enhanced UI hooks
  const {
    status: progressStatus,
    message: progressMessage,
    progress: progressValue,
    updateProgress,
    startLoading: beginProgress,
    setSuccess: completeProgress,
    setError: failProgress,
    reset: resetProgress,
  } = useProgressIndicator();
  const { confirmation, confirmAction } = useConfirmation();
  const { announce } = useAnnouncer();
  const { handleError } = useErrorHandler();
  const progress = { status: progressStatus, value: progressValue, message: progressMessage };

  // Memoized compound interest calculation with validation
  const calculateFutureValue = useCallback((monthlyPayment: number, annualRate: number, years: number) => {
    try {
      if (monthlyPayment < 0 || annualRate < 0 || years < 0) {
        throw new Error('Values must be non-negative');
      }
      if (years > 100) {
        throw new Error('Investment period too long');
      }
      
      const monthlyRate = annualRate / 12;
      const totalMonths = years * 12;
      
      if (monthlyRate === 0) return monthlyPayment * totalMonths;
      return monthlyPayment * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
    } catch (error) {
      console.error('Calculation error:', error);
      return 0;
    }
  }, []);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonScenarios, setComparisonScenarios] = useState<SimulationResults[]>([]);
  const simulationTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (simulationTimer.current) {
        clearTimeout(simulationTimer.current);
      }
    };
  }, []);
  const [costSettings, setCostSettings] = useState({
    policyFeeAnnualPct: 0.004, // 0.4% - realistisch für Versicherungsgebühren
    policyFixedAnnual: 0,
    taxRatePayout: 0.17, // 17% effektive Besteuerung in der Auszahlungsphase (Standard)
    expectedReturn: 0.06, // 6.0% - realistische langfristige Aktienrendite 2024/2025
    ter: 0.008, // 0.8% - realistischer TER für aktive Fonds
    volatility: 0.18 // 18% - realistischere Volatilität für Aktienfonds
  });
  const [fundPerformance, setFundPerformance] = useState({
    maxPerformance: 8.5, // Realistischer für langfristige Aktienrendite
    minPerformance: 1.5, // Konservativer Mindestwert
    currentReturn: 6.5 // Angepasst an expectedReturn
  });
  const [fundsSettings, setFundsSettings] = useState({
    monthlyContribution: 500,
    termYears: 25,
    expectedReturn: 0.065, // Konsistent mit costSettings
    showCustomReturn: false
  });

  // Comparison tool state
  const [comparisonParams, setComparisonParams] = useState({
    currentAge: 35,
    retirementAge: 67,
    monthlyContribution: 500,
    annualIncome: 60000
  });

  // State für editierbare Endwerte
  const [editableValues, setEditableValues] = useState({
    monthlyPension: { isEditing: false, value: 0, originalValue: 0 },
    finalPayout: { isEditing: false, value: 0, originalValue: 0 },
    totalCosts: { isEditing: false, value: 0, originalValue: 0 },
    effectiveReturn: { isEditing: false, value: 0, originalValue: 0 }
  });

  const [tempEditValues, setTempEditValues] = useState({
    monthlyPension: '',
    finalPayout: '',
    totalCosts: '',
    effectiveReturn: ''
  });



  // Enhanced handler for editable values with validation
  const handleEditStart = useCallback((field: keyof typeof editableValues) => {
    const currentValue = editableValues[field].value || editableValues[field].originalValue;
    setTempEditValues(prev => ({ ...prev, [field]: currentValue.toString() }));
    setEditableValues(prev => ({
      ...prev,
      [field]: { ...prev[field], isEditing: true }
    }));
    setValidationErrors(prev => ({ ...prev, [field]: '' }));
    setFocusedField(field);
  }, [editableValues]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleEditCancel = useCallback((field: keyof typeof editableValues) => {
    setEditableValues(prev => ({
      ...prev,
      [field]: { ...prev[field], isEditing: false }
    }));
    setTempEditValues(prev => ({ ...prev, [field]: '' }));
  }, []);

  const handleEditSave = useCallback(async (field: keyof typeof editableValues) => {
    const newValue = parseFloat(tempEditValues[field]);
    
    // Enhanced validation
    if (isNaN(newValue)) {
      setValidationErrors(prev => ({ ...prev, [field]: 'Bitte geben Sie eine gültige Zahl ein' }));
      return;
    }
    
    if (newValue < 0) {
      setValidationErrors(prev => ({ ...prev, [field]: 'Wert muss positiv sein' }));
      return;
    }
    
    // Field-specific validation
    if (field === 'effectiveReturn' && (newValue < 0 || newValue > 1)) {
      setValidationErrors(prev => ({ ...prev, [field]: 'Rendite muss zwischen 0% und 100% liegen' }));
      return;
    }
    
    try {
      setIsLoading(true);
      setEditableValues(prev => ({
        ...prev,
        [field]: { ...prev[field], isEditing: false, value: newValue }
      }));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
      setFocusedField(null);
      
      toast({
        title: "✅ Wert gespeichert",
        description: `${field} wurde erfolgreich aktualisiert`,
      });
    } catch (error) {
      setValidationErrors(prev => ({ ...prev, [field]: 'Fehler beim Speichern' }));
      toast({
        title: "❌ Fehler",
        description: "Wert konnte nicht gespeichert werden",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [tempEditValues, toast, handleEditCancel]);

  const handleEditValueChange = useCallback((field: keyof typeof editableValues, value: string) => {
    setTempEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  // Memoized format currency function
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(value);
  }, []);

  // Memoized validation function
  const validateFormData = useCallback((data: FormData) => {
    const errors: Record<string, string> = {};
    
    if (data.currentAge < 18 || data.currentAge > 80) {
      errors.currentAge = 'Alter muss zwischen 18 und 80 Jahren liegen';
    }
    
    if (data.monthlyContribution < 0) {
      errors.monthlyContribution = 'Monatlicher Beitrag muss positiv sein';
    }
    
    if (data.payoutStartAge >= data.payoutEndAge) {
      errors.payoutStartAge = 'Rentenbeginn muss vor Rentenende liegen';
    }
    
    return errors;
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentAge: 30,
      startAge: 30,
      termYears: 30,
      monthlyContribution: 500,
      startInvestment: 10000,
      targetMaturityValue: null,
      payoutStartAge: 67,
      payoutEndAge: 85,
      payoutMode: "annuity",
      annuityRate: 0.025, // 2.5% - realistischere Annuitätsrate bei aktuellen Zinsen
      safeWithdrawalRate: 0.035, // 3.5% - konservativere Safe Withdrawal Rate
    },
  });

  // Onboarding integration - load data from onboarding store
  const { data: onboardingData, isCompleted } = useOnboardingStore();
  const { autoSave } = useAutoSave({
    debounceMs: 500,
    showToast: false, // Don't show toast for every auto-save in calculator
  });

  // Pre-fill form with onboarding data on mount
  useEffect(() => {
    const personal = onboardingData.personal || {};
    const privatePension = onboardingData.privatePension || {};
    const hasOnboardingData = isCompleted || (personal.age && privatePension.contribution);

    if (hasOnboardingData) {
      const currentAge = personal.age || 30;
      const monthlyContribution = privatePension.contribution || 500;

      // Update form values with onboarding data
      form.reset({
        currentAge,
        startAge: currentAge,
        termYears: Math.max(5, 67 - currentAge),
        monthlyContribution,
        startInvestment: 10000,
        targetMaturityValue: null,
        payoutStartAge: 67,
        payoutEndAge: 85,
        payoutMode: "annuity",
        annuityRate: 0.025,
        safeWithdrawalRate: 0.035,
      });

      // Update cost settings if we have more data
      // (Could add more sophisticated loading from onboarding in future)
    }
  }, [onboardingData, isCompleted, form]);

  // Auto-save changes back to onboarding store when form values change
  useEffect(() => {
    const subscription = form.watch((formData) => {
      if (formData.currentAge || formData.monthlyContribution) {
        autoSave({
          personal: {
            age: formData.currentAge || 30,
            birthYear: new Date().getFullYear() - (formData.currentAge || 30),
          },
          privatePension: {
            contribution: formData.monthlyContribution || 0,
          },
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form, autoSave]);

  const simulationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        setIsLoading(true);
        beginProgress(language === 'de' ? 'Simulation startet...' : 'Starting simulation...');
        updateProgress(10);
        announce(language === 'de' ? "Simulation wird gestartet..." : "Simulation is starting...");
        
        const payload = {
          ...data,
          startAge: data.startAge,
          scenarioId: "default", // For simulation without saving
          policyFeeAnnualPct: costSettings.policyFeeAnnualPct,
          policyFixedAnnual: costSettings.policyFixedAnnual,
          taxRatePayout: costSettings.taxRatePayout,
          expectedReturn: costSettings.expectedReturn,
          ter: costSettings.ter,
          volatility: costSettings.volatility,
          rebalancingEnabled: true,
        };
        
        updateProgress(50);
        const response = await apiRequest("POST", "/api/simulate", payload);
        updateProgress(80);
        const result = await response.json();
        updateProgress(100);
        
        return result;
      } catch (error) {
        handleError(error as Error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setSimulationResults(data);
      setIsLoading(false);
      completeProgress(language === 'de' ? 'Simulation abgeschlossen' : 'Simulation complete');
      setTimeout(() => resetProgress(), 400);
      announce(language === 'de' ? "Simulation erfolgreich abgeschlossen" : "Simulation completed successfully");
      toast({
        title: language === 'de' ? "🎯 Simulation abgeschlossen" : "🎯 Simulation complete",
        description: language === 'de' ? "Ihre Rentenprognose wurde erfolgreich berechnet" : "Your pension projection was calculated successfully",
      });
    },
    onError: (error) => {
      setIsLoading(false);
      failProgress(language === 'de' ? 'Fehler bei der Simulation' : 'Simulation failed');
      setTimeout(() => resetProgress(), 800);
      console.error('Simulation error:', error);
      announce(language === 'de' ? "Simulation fehlgeschlagen" : "Simulation failed");
      toast({
        title: language === 'de' ? "❌ Simulationsfehler" : "❌ Simulation error",
        description: language === 'de'
          ? "Die Berechnung konnte nicht durchgeführt werden. Bitte prüfen Sie Ihre Eingaben."
          : "The calculation could not be completed. Please verify your inputs.",
        variant: "destructive",
      });
    },
  });

  const saveScenarioMutation = useMutation({
    mutationFn: async () => {
      // First create scenario
      const scenarioResponse = await apiRequest("POST", "/api/scenarios", {
        name: `Szenario ${new Date().toLocaleDateString('de-DE')}`,
        description: "Automatisch gespeichertes Szenario"
      });
      const scenario = await scenarioResponse.json();

      // Then create pension plan
      const formData = form.getValues();
      await apiRequest("POST", "/api/pension-plans", {
        ...formData,
        scenarioId: scenario.id,
        policyFeeAnnualPct: costSettings.policyFeeAnnualPct,
        policyFixedAnnual: costSettings.policyFixedAnnual,
        taxRatePayout: costSettings.taxRatePayout,
        expectedReturn: costSettings.expectedReturn,
        ter: costSettings.ter,
        volatility: costSettings.volatility,
        rebalancingEnabled: true,
      });

      return scenario;
    },
    onSuccess: () => {
      setIsLoading(false);
      toast({
        title: "Erfolgreich gespeichert",
        description: "Das Szenario wurde erfolgreich gespeichert",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scenarios"] });
    },
    onError: () => {
      setIsLoading(false);
      toast({
        title: "Fehler",
        description: "Szenario konnte nicht gespeichert werden",
        variant: "destructive",
      });
    },
  });

  // Run simulation when form data changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Debounce simulation to prevent excessive API calls
      if (simulationTimer.current) {
        clearTimeout(simulationTimer.current);
      }
      
      simulationTimer.current = setTimeout(() => {
        const data = form.getValues();
        if (form.formState.isValid && !simulationMutation.isPending) {
          simulationMutation.mutate(data);
        }
      }, 300); // 300ms debounce
    });
    return () => {
      subscription.unsubscribe();
      if (simulationTimer.current) {
        clearTimeout(simulationTimer.current);
      }
    };
  }, [form.watch, simulationMutation]);

  // Run initial simulation
  useEffect(() => {
    const data = form.getValues();
    simulationMutation.mutate(data);
  }, []);

  // Update editable values when simulation results change
  useEffect(() => {
    if (simulationResults) {
      const monthlyPension = simulationResults.kpis.monthlyPension || 0;
      const finalPayout = simulationResults.kpis.projectedValue || 0;
      const totalCosts = simulationResults.kpis.totalCosts || 0;
      const effectiveReturn = simulationResults.kpis.netReturn || 0;

      setEditableValues(prev => ({
        monthlyPension: {
          ...prev.monthlyPension,
          originalValue: monthlyPension,
          value: prev.monthlyPension.value || monthlyPension
        },
        finalPayout: {
          ...prev.finalPayout,
          originalValue: finalPayout,
          value: prev.finalPayout.value || finalPayout
        },
        totalCosts: {
          ...prev.totalCosts,
          originalValue: totalCosts,
          value: prev.totalCosts.value || totalCosts
        },
        effectiveReturn: {
          ...prev.effectiveReturn,
          originalValue: effectiveReturn,
          value: prev.effectiveReturn.value || effectiveReturn
        }
      }));
    }
  }, [simulationResults]);

  // PDF Export Functionality
  const exportToPDF = async () => {
    if (!simulationResults) {
      toast({
        title: language === 'de' ? 'Fehler' : 'Error',
        description: language === 'de' ? 'Keine Simulationsergebnisse vorhanden' : 'No simulation results available',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Show loading toast
      toast({
        title: language === 'de' ? 'PDF wird erstellt...' : 'Creating PDF...',
        description: language === 'de' ? 'Bitte warten Sie, während Ihr Bericht generiert wird' : 'Please wait while your report is being generated'
      });

      // Dynamically import PDF generator (lazy loading for better performance)
      const { generatePensionPDF } = await import('@/services/pdf-generator');

      // Generate PDF using the enhanced service
      await generatePensionPDF({
        language,
        formData: form.getValues(),
        simulationResults,
        costSettings,
        comparisonData: comparisonScenarios.length > 0 ? comparisonScenarios : undefined
      });

      toast({
        title: language === 'de' ? 'PDF erfolgreich exportiert' : 'PDF exported successfully',
        description: language === 'de' ? 'Ihr detaillierter Bericht wurde als PDF gespeichert' : 'Your detailed report has been saved as PDF'
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: language === 'de' ? 'Export Fehler' : 'Export Error',
        description: language === 'de' ? 'PDF konnte nicht erstellt werden' : 'PDF could not be created',
        variant: 'destructive'
      });
    }
  };

  // Memoized chart data to prevent unnecessary re-calculations
  const combinedChartData = useMemo(() => {
    if (!simulationResults) return [];
    return [...simulationResults.seriesAnspar, ...simulationResults.seriesPayout];
  }, [simulationResults]);

  const ansparChartData = useMemo(() => {
    return simulationResults?.seriesAnspar || [];
  }, [simulationResults]);

  const payoutChartData = useMemo(() => {
    return simulationResults?.seriesPayout || [];
  }, [simulationResults]);

  // Enhanced translation function with proper typing
  const translations = {
    de: {
      "header.title": "Rentenrechner",
      "header.subtitle": "Intelligente Rentenplanung",
      "tabs.privatePension": "Private Rente",
      "tabs.funds": "Fonds",
      "tabs.fundPerformance": "Fond Leistung",
 
      "tabs.comparison": "Vergleich",
      "tabs.customComparison": "Benutzerdefinierter Vergleich",
      "section.investmentParams": "Anlageparameter",
      "input.monthlyContribution": "Monatlicher Beitrag",
      "private.termYears": "Laufzeit",
      "input.startInvestment": "Startkapital",
      "input.payoutStart": "Rentenbeginn",
      "input.payoutEnd": "Rentenende", 
      "input.targetMaturity": "Zielwert",
      "section.payoutPhase": "Auszahlungsphase",
      "simulation.results": "Simulationsergebnisse"
    },
    en: {
      "header.title": "Pension Calculator",
      "header.subtitle": "Smart Retirement Planning",
      "tabs.privatePension": "Private Pension",
      "tabs.funds": "Funds",
      "tabs.fundPerformance": "Fund Performance",

      "tabs.comparison": "Comparison",
      "tabs.customComparison": "Custom Comparison",
      "section.investmentParams": "Investment Parameters",
      "input.monthlyContribution": "Monthly Contribution",
      "private.termYears": "Duration",
      "input.startInvestment": "Initial Capital",
      "input.payoutStart": "Retirement Start",
      "input.payoutEnd": "Retirement End",
      "input.targetMaturity": "Target Value",
      "section.payoutPhase": "Payout Phase", 
      "simulation.results": "Simulation Results"
    }
  } as const;

  type TranslationKey = keyof typeof translations.de;
  
  const getTranslation = (key: TranslationKey): string => {
    return translations[language]?.[key] || key;
  };

  const tabs = [
    { id: "private-pension", label: getTranslation("tabs.privatePension") },
    { id: "funds", label: getTranslation("tabs.funds") },
    { id: "fund-performance", label: getTranslation("tabs.fundPerformance") },

    { id: "comparison", label: getTranslation("tabs.comparison") },
    { id: "custom-comparison", label: getTranslation("tabs.customComparison") },
  ] as const;


  return (
    <ErrorBoundary>
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background ios-safe-area">
        {/* Progress Indicator */}
        <ProgressIndicator 
          status={progress.status}
          progress={progress.value}
          message={progress.message}
          size="sm"
          className="fixed top-4 right-4 z-50"
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <LoadingOverlay
            isVisible={isLoading}
            message={language === 'de' ? 'Berechnung läuft...' : 'Calculating...'}
          />
        )}
        
        {/* Confirmation Dialog */}
        {confirmation.isOpen && (
          <ResetConfirmation
            onConfirm={confirmation.onConfirm}
            onCancel={confirmation.onCancel}
            isLoading={confirmation.isLoading}
          />
        )}
      {/* Enhanced Apple-style Header */}
      <FadeIn delay={0.1}>
        <header className="bg-card/95 backdrop-blur-xl border-b border-border/50 px-6 py-6 sticky top-0 z-50 animate-fade-in shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <div className="text-primary-foreground font-bold text-lg">€</div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight" data-testid="header-title">
                {getTranslation("header.title")}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {getTranslation("header.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Tax Calculator Link */}
            <Link to="/tax-calculator">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800 transition-all duration-200"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {language === 'de' ? 'Steuerrechner' : 'Tax Calculator'}
              </Button>
            </Link>
            {/* Language Switcher */}
            <div className="flex items-center bg-secondary/80 rounded-xl p-1">
              <button
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  language === 'de' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setLanguage('de')}
                data-testid="button-lang-de"
              >
                🇩🇪 DE
              </button>
              <button
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  language === 'en' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setLanguage('en')}
                data-testid="button-lang-en"
              >
                🇬🇧 EN
              </button>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-10 h-10 rounded-xl bg-secondary hover:bg-accent transition-all duration-200" 
              data-testid="button-profile"
            >
              <User className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
        </header>
      </FadeIn>

      {/* Apple-style Tab Navigation */}
      <SlideIn direction="down" delay={0.2}>
        <nav className="bg-card/95 backdrop-blur-xl border-b border-border/30 px-6 py-4 sticky top-[88px] z-40 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="apple-tabs w-fit mx-auto animate-scale-in bg-card/90 backdrop-blur-sm shadow-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`apple-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
              >
                <TooltipTypo text={tab.label}>
                  {tab.label}
                </TooltipTypo>
              </button>
            ))}
          </div>
        </div>
        </nav>
      </SlideIn>

      {/* Main Content */}
      <main className="flex-1 bg-background pb-8 relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card rounded-2xl p-8 shadow-2xl border border-border/50 max-w-sm w-full mx-4">
              <div className="flex flex-col items-center space-y-4">
                <LoadingSpinner size="lg" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {language === 'de' ? '🧮 Berechnung läuft...' : '🧮 Calculating...'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'de' ? 'Ihre Rentenprognose wird erstellt' : 'Creating your pension forecast'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "private-pension" && (
          <FadeIn delay={0.3}>
            <div className="max-w-7xl mx-auto px-6 py-8">
              <Form {...form}>
                <form className="space-y-8">
                {/* Enhanced Input Section */}
                <StaggerContainer>
                  <StaggerItem>
                    <section className="animate-slide-in-up">
                  <div className="modern-card-enhanced group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Calculator className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-foreground tracking-tight">
                              {getTranslation("section.investmentParams")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              {language === 'de' ? 'Legen Sie Ihre Anlagestrategie fest' : 'Define your investment strategy'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-muted-foreground font-medium">
                              {language === 'de' ? 'Live Berechnung' : 'Live Calculation'}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            className="text-xs hover:bg-accent/50 rounded-xl transition-all duration-200"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            {language === 'de' ? 'Erweitert' : 'Advanced'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-10 lg:grid-cols-2 xl:grid-cols-3">
                      <StaggerContainer staggerDelay={0.1}>

                      {/* Current Age */}
                      <StaggerItem>
                        <FormField
                        control={form.control}
                        name="currentAge"
                        render={({ field }) => (
                          <FormItem className="space-y-6">
                            <div className="space-y-2">
                              <FormLabel className="text-lg font-semibold text-foreground flex items-center space-x-2">
                                <span>{language === 'de' ? 'Aktuelles Alter' : 'Current Age'}</span>
                                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
                                  {field.value} {language === 'de' ? 'Jahre' : 'Years'}
                                </div>
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                {language === 'de' ? 'Ihr aktuelles Lebensalter' : 'Your current age'}
                              </p>
                            </div>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-primary z-10">👤</div>
                                <Input
                                  type="number"
                                  placeholder="30"
                                  value={field.value || ''}
                                  name={field.name}
                                  ref={field.ref}
                                  onBlur={field.onBlur}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? 25 : Number(e.target.value);
                                    if (!isNaN(value) && value >= 18 && value <= 80) {
                                      field.onChange(value);
                                      form.trigger('currentAge');
                                    }
                                  }}
                                  className="text-2xl font-bold h-20 pl-14 pr-6 bg-gradient-to-r from-background to-accent/20 border-2 border-border/30 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
                                  data-testid="input-current-age"
                                />
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                  <div className="text-sm text-muted-foreground font-medium">
                                    {language === 'de' ? 'Jahre' : 'years'}
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <div className="grid grid-cols-4 gap-3 mt-4">
                              {[25, 35, 45, 55].map((age) => (
                                <button
                                  key={age}
                                  type="button"
                                  onClick={() => {
                                    field.onChange(age);
                                    form.trigger('currentAge');
                                  }}
                                  className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    field.value === age
                                      ? 'bg-primary text-primary-foreground shadow-md'
                                      : 'bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {age}
                                </button>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      </StaggerItem>
                      
                      {/* Enhanced Term Years */}
                      <StaggerItem>
                        <FormField
                        control={form.control}
                        name="termYears"
                        render={({ field }) => (
                          <FormItem className="space-y-6">
                            <div className="space-y-2">
                              <FormLabel className="text-lg font-semibold text-foreground flex items-center space-x-2">
                                <span>{getTranslation("private.termYears")}</span>
                                <div className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                                  {field.value} {language === 'de' ? 'Jahre' : 'Years'}
                                </div>
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                {language === 'de' ? 'Wie lange möchten Sie einzahlen?' : 'How long do you want to contribute?'}
                              </p>
                            </div>
                            <FormControl>
                              <div className="bg-gradient-to-br from-accent/30 to-accent/10 rounded-2xl p-8 border border-border/30 hover:border-border/60 transition-all duration-300">
                                <div className="mb-6">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-muted-foreground">5 Jahre</span>
                                    <span className="text-sm font-medium text-muted-foreground">45 Jahre</span>
                                  </div>
                                  <RangeSlider
                                    min={5}
                                    max={45}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    suffix=" Jahre"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                  <div className="text-center p-2 bg-background/60 rounded-lg">
                                    <div className="font-semibold text-foreground">{language === 'de' ? 'Kurz' : 'Short'}</div>
                                    <div className="text-muted-foreground">5-15 {language === 'de' ? 'Jahre' : 'years'}</div>
                                  </div>
                                  <div className="text-center p-2 bg-background/60 rounded-lg">
                                    <div className="font-semibold text-foreground">{language === 'de' ? 'Mittel' : 'Medium'}</div>
                                    <div className="text-muted-foreground">15-30 {language === 'de' ? 'Jahre' : 'years'}</div>
                                  </div>
                                  <div className="text-center p-2 bg-background/60 rounded-lg">
                                    <div className="font-semibold text-foreground">{language === 'de' ? 'Lang' : 'Long'}</div>
                                    <div className="text-muted-foreground">30-45 {language === 'de' ? 'Jahre' : 'years'}</div>
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      </StaggerItem>
                      
                      {/* Enhanced Monthly Contribution */}
                      <StaggerItem>
                        <FormField
                        control={form.control}
                        name="monthlyContribution"
                        render={({ field }) => (
                          <FormItem className="space-y-6">
                            <div className="space-y-2">
                              <FormLabel className="text-lg font-semibold text-foreground flex items-center space-x-2">
                                <span>{getTranslation("input.monthlyContribution")}</span>
                                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                                  {formatCurrency(field.value * 12)}/Jahr
                                </div>
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                {language === 'de' ? 'Ihr regelmäßiger monatlicher Sparbetrag' : 'Your regular monthly savings amount'}
                              </p>
                            </div>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-primary z-10">€</div>
                                <Input
                                  type="number"
                                  placeholder="500"
                                  {...field}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    if (inputValue === '') {
                                      field.onChange(0);
                                    } else {
                                      const value = Number(inputValue);
                                      if (!isNaN(value) && value >= 0) {
                                        field.onChange(value);
                                      }
                                    }
                                  }}
                                  onFocus={(e) => {
                                    if (field.value === 0) {
                                      e.target.select();
                                    }
                                  }}
                                  className="text-2xl font-bold h-20 pl-14 pr-6 bg-gradient-to-r from-background to-accent/20 border-2 border-border/30 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
                                  data-testid="input-monthly-contribution"
                                />
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                  <div className="text-sm text-muted-foreground font-medium">
                                    {language === 'de' ? 'pro Monat' : 'per month'}
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <div className="grid grid-cols-4 gap-3 mt-4">
                              {[250, 500, 1000, 2000].map((amount) => (
                                <button
                                  key={amount}
                                  type="button"
                                  onClick={() => field.onChange(amount)}
                                  className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    field.value === amount
                                      ? 'bg-primary text-primary-foreground shadow-md'
                                      : 'bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {amount}€
                                </button>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      </StaggerItem>
                      
                      {/* Enhanced Start Investment */}
                      <StaggerItem>
                        <FormField
                        control={form.control}
                        name="startInvestment"
                        render={({ field }) => (
                          <FormItem className="space-y-6">
                            <div className="space-y-2">
                              <FormLabel className="text-lg font-semibold text-foreground flex items-center space-x-2">
                                <span>{getTranslation("input.startInvestment")}</span>
                                {field.value > 0 && (
                                  <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
                                    {language === 'de' ? 'Sofortstart' : 'Immediate start'}
                                  </div>
                                )}
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                {language === 'de' ? 'Einmalige Investition zu Beginn (optional)' : 'One-time investment at the beginning (optional)'}
                              </p>
                            </div>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-primary z-10">€</div>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    if (inputValue === '') {
                                      field.onChange(0);
                                    } else {
                                      const value = Number(inputValue);
                                      if (!isNaN(value) && value >= 0) {
                                        field.onChange(value);
                                      }
                                    }
                                  }}
                                  onFocus={(e) => {
                                    if (field.value === 0) {
                                      e.target.select();
                                    }
                                  }}
                                  className="text-2xl font-bold h-20 pl-14 pr-6 bg-gradient-to-r from-background to-accent/20 border-2 border-border/30 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
                                  data-testid="input-start-investment"
                                />
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                  <div className="text-sm text-muted-foreground font-medium">
                                    {language === 'de' ? 'einmalig' : 'one-time'}
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <div className="grid grid-cols-5 gap-3 mt-4">
                              {[0, 5000, 10000, 25000, 50000].map((amount) => (
                                <button
                                  key={amount}
                                  type="button"
                                  onClick={() => field.onChange(amount)}
                                  className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    field.value === amount
                                      ? 'bg-primary text-primary-foreground shadow-md'
                                      : 'bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {amount === 0 ? '0€' : `${amount/1000}k€`}
                                </button>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      </StaggerItem>
                      
                      {/* Enhanced Target Maturity Value - Spans full width */}
                      <StaggerItem>
                        <div className="lg:col-span-2 xl:col-span-3">
                        <FormField
                          control={form.control}
                          name="targetMaturityValue"
                          render={({ field }) => (
                            <FormItem className="space-y-6">
                              <div className="space-y-2">
                                <FormLabel className="text-lg font-semibold text-foreground flex items-center space-x-2">
                                  <span>{getTranslation("input.targetMaturity")}</span>
                                  <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full font-medium">
                                    {language === 'de' ? 'Optional' : 'Optional'}
                                  </div>
                                  {field.value && (
                                    <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full font-medium">
                                      {language === 'de' ? 'Zielorientiert' : 'Goal-oriented'}
                                    </div>
                                  )}
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  {language === 'de' ? 'Welchen Betrag möchten Sie zum Rentenbeginn erreichen?' : 'What amount would you like to reach at retirement?'}
                                </p>
                              </div>
                              <FormControl>
                                <div className="relative group">
                                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-primary z-10">€</div>
                                  <Input
                                    type="number"
                                    placeholder="Zielwert eingeben (optional)"
                                    value={field.value || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '') {
                                        field.onChange(null);
                                      } else {
                                        const numValue = Number(value);
                                        if (!isNaN(numValue) && numValue >= 0) {
                                          field.onChange(numValue);
                                        }
                                      }
                                    }}
                                    className="text-2xl font-bold h-20 pl-14 pr-6 bg-gradient-to-r from-background to-accent/20 border-2 border-border/30 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
                                    data-testid="input-target-maturity"
                                  />
                                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                    <div className="text-sm text-muted-foreground font-medium">
                                      {language === 'de' ? 'Zielwert' : 'target value'}
                                    </div>
                                  </div>
                                </div>
                              </FormControl>
                              <div className="grid grid-cols-6 gap-3 mt-4">
                                <button
                                  type="button"
                                  onClick={() => field.onChange(null)}
                                  className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    !field.value
                                      ? 'bg-primary text-primary-foreground shadow-md'
                                      : 'bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  Kein Ziel
                                </button>
                                {[250000, 500000, 750000, 1000000, 1500000].map((amount) => (
                                  <button
                                    key={amount}
                                    type="button"
                                    onClick={() => field.onChange(amount)}
                                    className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                      field.value === amount
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground'
                                    }`}
                                  >
                                    {amount >= 1000000 ? `${amount/1000000}M€` : `${amount/1000}k€`}
                                  </button>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        </div>
                      </StaggerItem>
                      </StaggerContainer>
                    </div>
                  </div>
                    </section>
                  </StaggerItem>
                </StaggerContainer>

                {/* Enhanced Payout Section */}
                <StaggerContainer>
                  <StaggerItem>
                    <section className="animate-slide-in-up">
                  <div className="modern-card-enhanced group hover:shadow-2xl transition-all duration-500">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <div className="w-6 h-6 bg-white rounded-md opacity-90"></div>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-foreground tracking-tight">
                            {getTranslation("section.payoutPhase")}
                          </h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            {language === 'de' ? 'Definieren Sie Ihre Rentenauszahlung' : 'Define your pension payout'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {form.watch("payoutEndAge") - form.watch("payoutStartAge")} {language === 'de' ? 'Jahre Rente' : 'Years of Pension'}
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-10 lg:grid-cols-1 xl:grid-cols-3 space-y-6 lg:space-y-0">

                      {/* Enhanced Payout Age Range */}
                      <div className="bg-gradient-to-br from-accent/30 to-accent/10 rounded-2xl p-8 border border-border/30 hover:border-border/60 transition-all duration-300">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {language === 'de' ? 'Rentendauer' : 'Pension Duration'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {language === 'de' ? 'Von wann bis wann möchten Sie Rente beziehen?' : 'When do you want to receive your pension?'}
                          </p>
                        </div>
                        
                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="payoutStartAge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold text-foreground flex items-center space-x-2">
                                  <span>{getTranslation("input.payoutStart")}</span>
                                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                                    {field.value} Jahre
                                  </div>
                                </FormLabel>
                                <Select
                                  value={field.value.toString()}
                                  onValueChange={(value) => field.onChange(Number(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-14 text-lg font-semibold bg-background/60 border-2 border-border/50 hover:border-primary/50 focus:border-primary rounded-xl" data-testid="select-payout-start-age">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl">
                                    {Array.from({ length: 9 }, (_, i) => i + 62).map((age) => (
                                      <SelectItem key={age} value={age.toString()} className="text-base">
                                        {age} {language === 'de' ? 'Jahre' : 'years'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="payoutEndAge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold text-foreground flex items-center space-x-2">
                                  <span>{getTranslation("input.payoutEnd")}</span>
                                  <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
                                    {field.value} Jahre
                                  </div>
                                </FormLabel>
                                <Select
                                  value={field.value.toString()}
                                  onValueChange={(value) => field.onChange(Number(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-14 text-lg font-semibold bg-background/60 border-2 border-border/50 hover:border-primary/50 focus:border-primary rounded-xl" data-testid="select-payout-end-age">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl">
                                    {Array.from({ length: 11 }, (_, i) => i + 75).map((age) => (
                                      <SelectItem key={age} value={age.toString()} className="text-base">
                                        {age} {language === 'de' ? 'Jahre' : 'years'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="bg-background/60 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-primary">
                              {form.watch("payoutEndAge") - form.watch("payoutStartAge")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {language === 'de' ? 'Jahre Rentenbezug' : 'Years of pension'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payout Mode */}
                      <FormField
                        control={form.control}
                        name="payoutMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("private.payoutMode")}</FormLabel>
                            <FormControl>
                              <SegmentedControl
                                options={[
                                  { value: "annuity", label: t("private.mode.annuity") },
                                  { value: "flex", label: t("private.mode.flex") },
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Mode-specific inputs */}
                      {form.watch("payoutMode") === "annuity" ? (
                        <FormField
                          control={form.control}
                          name="annuityRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("private.annuityRate")}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="3.0"
                                    value={field.value * 100}
                                    onChange={(e) => field.onChange(Number(e.target.value) / 100)}
                                    data-testid="input-annuity-rate"
                                  />
                                  <span className="absolute right-3 top-3 text-sm text-muted-foreground">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="safeWithdrawalRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("private.swr")}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="4.0"
                                    value={(field.value || 0) * 100}
                                    onChange={(e) => field.onChange(Number(e.target.value) / 100)}
                                    data-testid="input-safe-withdrawal-rate"
                                  />
                                  <span className="absolute right-3 top-3 text-sm text-muted-foreground">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </section>

                {/* Cost Section */}
                <section className="animate-slide-in-up">
                  <div className="apple-card p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                          <div className="w-4 h-4 bg-warning rounded-sm"></div>
                        </div>
                        <h3 className="text-xl font-semibold text-card-foreground tracking-tight">
                          {language === 'de' ? 'Kosten & Steuern' : 'Costs & Taxes'}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {showCostSettings && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setShowCostSettings(false);
                              toast({
                                title: language === 'de' ? 'Einstellungen gespeichert' : 'Settings saved',
                                description: language === 'de' ? 'Ihre Kosten-Einstellungen wurden übernommen' : 'Your cost settings have been applied'
                              });
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowCostSettings(!showCostSettings)}
                          className="hover:bg-accent"
                        >
                          {showCostSettings ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-3 p-4 bg-accent/30 rounded-xl hover:bg-accent/40 transition-colors">
                        <span className="text-sm text-muted-foreground font-medium">
                          {language === 'de' ? 'Policengebühr (jährlich)' : 'Policy Fee (annual)'}
                        </span>
                        {showCostSettings ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={costSettings.policyFeeAnnualPct * 100}
                            onChange={(e) => {
                              const value = Number(e.target.value) / 100;
                              if (!isNaN(value) && value >= 0 && value <= 10) {
                                setCostSettings(prev => ({ ...prev, policyFeeAnnualPct: value }));
                              }
                            }}
                            className="text-lg font-bold h-10 text-center"
                            placeholder="0.40"
                          />
                        ) : (
                          <div className="text-xl font-bold text-foreground">{(costSettings.policyFeeAnnualPct * 100).toFixed(2)}%</div>
                        )}
                      </div>
                      <div className="space-y-3 p-4 bg-accent/30 rounded-xl hover:bg-accent/40 transition-colors">
                        <span className="text-sm text-muted-foreground font-medium">
                          {language === 'de' ? 'TER Fonds' : 'TER Funds'}
                        </span>
                        {showCostSettings ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={costSettings.ter * 100}
                            onChange={(e) => {
                              const value = Number(e.target.value) / 100;
                              if (!isNaN(value) && value >= 0 && value <= 10) {
                                setCostSettings(prev => ({ ...prev, ter: value }));
                              }
                            }}
                            className="text-lg font-bold h-10 text-center"
                            placeholder="0.75"
                          />
                        ) : (
                          <div className="text-xl font-bold text-foreground">{(costSettings.ter * 100).toFixed(2)}%</div>
                        )}
                      </div>
                      <div className="space-y-3 p-4 bg-accent/30 rounded-xl hover:bg-accent/40 transition-colors">
                        <span className="text-sm text-muted-foreground font-medium">
                          {language === 'de' ? 'Steuersatz Auszahlung' : 'Tax Rate Payout'}
                        </span>
                        {showCostSettings ? (
                          <Input
                            type="number"
                            step="1"
                            value={costSettings.taxRatePayout * 100}
                            onChange={(e) => {
                              const value = Number(e.target.value) / 100;
                              if (!isNaN(value) && value >= 0 && value <= 1) {
                                setCostSettings(prev => ({ ...prev, taxRatePayout: value }));
                              }
                            }}
                            className="text-lg font-bold h-10 text-center"
                            placeholder="25"
                          />
                        ) : (
                          <div className="text-xl font-bold text-foreground">{(costSettings.taxRatePayout * 100).toFixed(0)}%</div>
                        )}
                      </div>
                      <div className="space-y-3 p-4 bg-accent/30 rounded-xl hover:bg-accent/40 transition-colors">
                        <span className="text-sm text-muted-foreground font-medium">
                          {language === 'de' ? 'Erwartete Rendite' : 'Expected Return'}
                        </span>
                        {showCostSettings ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={costSettings.expectedReturn * 100}
                            onChange={(e) => {
                              const value = Number(e.target.value) / 100;
                              if (!isNaN(value) && value >= 0 && value <= 0.5) {
                                setCostSettings(prev => ({ ...prev, expectedReturn: value }));
                              }
                            }}
                            className="text-lg font-bold h-10 text-center"
                            placeholder="7.5"
                          />
                        ) : (
                          <div className="text-xl font-bold text-foreground">{(costSettings.expectedReturn * 100).toFixed(1)}%</div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Advanced Settings Panel */}
                {showAdvancedSettings && (
                  <section className="animate-slide-in-up">
                    <div className="apple-card p-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                            <Settings className="w-4 h-4 text-primary" />
                          </div>
                          <h3 className="text-xl font-semibold text-card-foreground tracking-tight">
                            {language === 'de' ? 'Erweiterte Einstellungen' : 'Advanced Settings'}
                          </h3>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAdvancedSettings(false)}
                          className="hover:bg-accent"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Inflation Rate */}
                        <div className="space-y-3 p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all">
                          <label className="text-sm font-medium text-muted-foreground">
                            {language === 'de' ? 'Inflationsrate (%)' : 'Inflation Rate (%)'}
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={2.0}
                            className="text-lg font-bold h-12 text-center"
                            placeholder="2.0"
                          />
                          <p className="text-xs text-muted-foreground">
                            {language === 'de' ? 'Jährliche Inflationsrate' : 'Annual inflation rate'}
                          </p>
                        </div>

                        {/* Risk Tolerance */}
                        <div className="space-y-3 p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all">
                          <label className="text-sm font-medium text-muted-foreground">
                            {language === 'de' ? 'Risikotoleranz' : 'Risk Tolerance'}
                          </label>
                          <select className="w-full h-12 px-3 rounded-md border border-input bg-background text-lg font-bold text-center">
                            <option value="conservative">{language === 'de' ? 'Konservativ' : 'Conservative'}</option>
                            <option value="moderate" selected>{language === 'de' ? 'Moderat' : 'Moderate'}</option>
                            <option value="aggressive">{language === 'de' ? 'Aggressiv' : 'Aggressive'}</option>
                          </select>
                          <p className="text-xs text-muted-foreground">
                            {language === 'de' ? 'Ihre Risikobereitschaft' : 'Your risk appetite'}
                          </p>
                        </div>

                        {/* Rebalancing Frequency */}
                        <div className="space-y-3 p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all">
                          <label className="text-sm font-medium text-muted-foreground">
                            {language === 'de' ? 'Rebalancing' : 'Rebalancing'}
                          </label>
                          <select className="w-full h-12 px-3 rounded-md border border-input bg-background text-lg font-bold text-center">
                            <option value="monthly">{language === 'de' ? 'Monatlich' : 'Monthly'}</option>
                            <option value="quarterly" selected>{language === 'de' ? 'Quartalsweise' : 'Quarterly'}</option>
                            <option value="annually">{language === 'de' ? 'Jährlich' : 'Annually'}</option>
                          </select>
                          <p className="text-xs text-muted-foreground">
                            {language === 'de' ? 'Portfolio-Neuausrichtung' : 'Portfolio rebalancing'}
                          </p>
                        </div>

                        {/* Emergency Fund */}
                        <div className="space-y-3 p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all">
                          <label className="text-sm font-medium text-muted-foreground">
                            {language === 'de' ? 'Notgroschen (€)' : 'Emergency Fund (€)'}
                          </label>
                          <Input
                            type="number"
                            step="1000"
                            min="0"
                            value={10000}
                            className="text-lg font-bold h-12 text-center"
                            placeholder="10,000"
                          />
                          <p className="text-xs text-muted-foreground">
                            {language === 'de' ? 'Liquiditätsreserve' : 'Liquidity reserve'}
                          </p>
                        </div>

                        {/* Asset Allocation */}
                        <div className="space-y-3 p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all">
                          <label className="text-sm font-medium text-muted-foreground">
                            {language === 'de' ? 'Aktienanteil (%)' : 'Stock Allocation (%)'}
                          </label>
                          <Input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={70}
                            className="w-full h-3"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span className="font-bold text-primary">70%</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* Currency Hedging */}
                        <div className="space-y-3 p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all">
                          <label className="text-sm font-medium text-muted-foreground">
                            {language === 'de' ? 'Währungsabsicherung' : 'Currency Hedging'}
                          </label>
                          <div className="flex items-center space-x-3 h-12">
                            <input type="checkbox" className="w-5 h-5 rounded border-2" />
                            <span className="text-lg font-bold">
                              {language === 'de' ? 'Aktiviert' : 'Enabled'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {language === 'de' ? 'Schutz vor Währungsrisiken' : 'Protection against currency risks'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-end space-x-3">
                        <AccessibleButton
                          type="button"
                          variant="outline"
                          onClick={() => {
                            confirmAction(
                              'Alle Einstellungen zurücksetzen?',
                              'Diese Aktion kann nicht rückgängig gemacht werden. Alle erweiterten Einstellungen werden auf die Standardwerte zurückgesetzt.',
                              () => {
                                // Reset all settings to defaults
                                setCostSettings({
                                  policyFeeAnnualPct: 0.004,
                                  policyFixedAnnual: 0,
                                  taxRatePayout: 0.17,
                                  expectedReturn: 0.06,
                                  ter: 0.008,
                                  volatility: 0.18
                                });
                                setFundPerformance({
                                  maxPerformance: 8.5,
                                  minPerformance: 1.5,
                                  currentReturn: 6.5
                                });
                                setFundsSettings({
                                  monthlyContribution: 500,
                                  termYears: 25,
                                  expectedReturn: 0.065,
                                  showCustomReturn: false
                                });
                                form.reset();
                                announce('Alle Einstellungen wurden zurückgesetzt');
                                toast({
                                  title: language === 'de' ? 'Einstellungen zurückgesetzt' : 'Settings reset',
                                  description: language === 'de' ? 'Alle erweiterten Einstellungen wurden auf Standardwerte zurückgesetzt' : 'All advanced settings have been reset to default values'
                                });
                              }
                            );
                          }}
                          aria-label="Alle Einstellungen zurücksetzen"
                        >
                          {language === 'de' ? 'Zurücksetzen' : 'Reset'}
                        </AccessibleButton>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowAdvancedSettings(false);
                            toast({
                              title: language === 'de' ? 'Erweiterte Einstellungen gespeichert' : 'Advanced settings saved',
                              description: language === 'de' ? 'Ihre erweiterten Einstellungen wurden erfolgreich übernommen' : 'Your advanced settings have been successfully applied'
                            });
                          }}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {language === 'de' ? 'Speichern' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Fund Performance Section */}
                <section className="animate-slide-in-up">
                  <div className="apple-card p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                        </div>
                        <h3 className="text-xl font-semibold text-card-foreground tracking-tight">
                          {language === 'de' ? 'Fonds Performance' : 'Fund Performance'}
                        </h3>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {language === 'de' ? 'Verschiedene Szenarien' : 'Different scenarios'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">📈</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-green-800 dark:text-green-200">
                              {language === 'de' ? 'Optimistisch' : 'Optimistic'}
                            </h4>
                            <p className="text-sm text-green-600 dark:text-green-300">
                              12% {language === 'de' ? 'Rendite' : 'Return'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {language === 'de' ? 'Beste Marktbedingungen, starkes Wachstum' : 'Best market conditions, strong growth'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-green-500 text-green-700 hover:bg-green-500 hover:text-white"
                          onClick={() => {
                            setCostSettings(prev => ({ ...prev, expectedReturn: 0.12 }));
                            toast({
                              title: language === 'de' ? 'Optimistisches Szenario' : 'Optimistic Scenario',
                              description: language === 'de' ? 'Rendite auf 12% gesetzt' : 'Return set to 12%'
                            });
                          }}
                        >
                          {language === 'de' ? 'Anwenden' : 'Apply'}
                        </Button>
                      </div>

                      <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">📊</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                              {language === 'de' ? 'Realistisch' : 'Realistic'}
                            </h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">
                              7.5% {language === 'de' ? 'Rendite' : 'Return'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {language === 'de' ? 'Langfristiger Marktdurchschnitt' : 'Long-term market average'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-blue-500 text-blue-700 hover:bg-blue-500 hover:text-white"
                          onClick={() => {
                            setCostSettings(prev => ({ ...prev, expectedReturn: 0.075 }));
                            toast({
                              title: language === 'de' ? 'Realistisches Szenario' : 'Realistic Scenario',
                              description: language === 'de' ? 'Rendite auf 7.5% gesetzt' : 'Return set to 7.5%'
                            });
                          }}
                        >
                          {language === 'de' ? 'Anwenden' : 'Apply'}
                        </Button>
                      </div>

                      <div className="space-y-4 p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-700/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">📉</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                              {language === 'de' ? 'Konservativ' : 'Conservative'}
                            </h4>
                            <p className="text-sm text-orange-600 dark:text-orange-300">
                              4% {language === 'de' ? 'Rendite' : 'Return'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          {language === 'de' ? 'Sichere Anlagen, niedrigere Volatilität' : 'Safe investments, lower volatility'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-orange-500 text-orange-700 hover:bg-orange-500 hover:text-white"
                          onClick={() => {
                            setCostSettings(prev => ({ ...prev, expectedReturn: 0.04 }));
                            toast({
                              title: language === 'de' ? 'Konservatives Szenario' : 'Conservative Scenario',
                              description: language === 'de' ? 'Rendite auf 4% gesetzt' : 'Return set to 4%'
                            });
                          }}
                        >
                          {language === 'de' ? 'Anwenden' : 'Apply'}
                        </Button>
                      </div>
                </div>
              </div>
            </section>
                  </StaggerItem>
                  </StaggerContainer>
                </form>
              </Form>
            </div>
          </FadeIn>
        )}

        <FadeIn>
            {/* Enhanced Simulation Results */}
            {simulationResults && (
              <>
                {/* KPI Dashboard */}
                <section className="animate-fade-in">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="w-8 h-8 bg-chart-1/10 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-chart-1 rounded-sm"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">
                      {t("section.simulationResults")}
                    </h2>
                  </div>

                  {/* Enhanced KPI Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="kpi-card" data-testid="kpi-projected-value">
                      <div className="text-3xl font-bold text-success animated-number">
                        {formatCurrency(simulationResults.kpis.projectedValue)}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium mt-2">
                        {t("kpi.expectedMaturity")}
                      </div>
                      <div className="mt-4 text-xs text-success/80">
                        ↗ Prognose bei 7,5% Rendite
                      </div>
                    </div>
                    <div className="kpi-card" data-testid="kpi-target-gap">
                      <div className="text-3xl font-bold text-warning animated-number">
                        {formatCurrency(simulationResults.kpis.targetGap)}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium mt-2">
                        {t("kpi.targetDeviation")}
                      </div>
                      <div className="mt-4 text-xs text-warning/80">
                        {simulationResults.kpis.targetGap > 0 ? '△ Über Ziel' : '▽ Unter Ziel'}
                      </div>
                    </div>
                    <div className="kpi-card" data-testid="kpi-monthly-pension">
                      <div className="text-3xl font-bold text-primary animated-number">
                        {formatCurrency(simulationResults.kpis.monthlyPension)}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium mt-2">
                        {t("kpi.monthlyPension")}
                      </div>
                      <div className="mt-4 text-xs text-primary/80">
                        💰 Monatliche Auszahlung
                      </div>
                    </div>
                    <div className="kpi-card" data-testid="kpi-total-costs">
                      <div className="text-3xl font-bold text-destructive animated-number">
                        {formatCurrency(simulationResults.kpis.totalFees)}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium mt-2">
                        {t("kpi.totalCosts")}
                      </div>
                      <div className="mt-4 text-xs text-destructive/80">
                        📊 Gesamte Gebühren
                      </div>
                    </div>
                  </div>
                </section>

                {/* Premium Chart Analytics */}
                <section className="animate-slide-in-up">
                  <div className="apple-card p-8">
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-chart-1/10 rounded-lg flex items-center justify-center">
                          <div className="w-4 h-4 bg-chart-1 rounded-sm"></div>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground tracking-tight">
                            {t("chart.portfolioGrowth")}
                          </h3>
                          <p className="text-sm text-muted-foreground font-medium">
                            Interaktive Analyse mit Zoom und Vergleichslinien
                          </p>
                        </div>
                      </div>
                      <div className="segmented-control">
                        <SegmentedControl
                          value={chartType}
                          onValueChange={(value) => setChartType(value as "line" | "area" | "composed" | "bar")}
                          options={[
                            { label: "📈 Linie", value: "line" },
                            { label: "🎨 Fläche", value: "area" },
                            { label: "🔄 Kombi", value: "composed" },
                            { label: "📊 Balken", value: "bar" }
                          ]}
                          data-testid="chart-type-selector"
                        />
                      </div>
                    </div>
                    
                    <div className="chart-container p-6">
                      <PensionChart
                        data={combinedChartData}
                        type={chartType}
                        height={600}
                        showBrush={true}
                        showReferenceLine={true}
                        retirementAge={form.getValues().payoutStartAge}
                        targetAmount={form.getValues().targetMaturityValue || undefined}
                        className="w-full"
                      />
                    </div>
                  </div>
                </section>

                {/* Advanced Analytics Grid */}
                <div className="grid lg:grid-cols-2 gap-8 animate-slide-in-up">
                  {/* Detail Analysis */}
                  <div className="apple-card p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-6 h-6 bg-chart-2/10 rounded-lg flex items-center justify-center">
                        <div className="w-3 h-3 bg-chart-2 rounded-sm"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground tracking-tight">
                        Detailanalyse - Beiträge vs. Wachstum
                      </h4>
                    </div>
                    <div className="chart-container p-4">
                      <PensionChart
                        data={[...simulationResults.seriesAnspar, ...simulationResults.seriesPayout]}
                        type="area"
                        height={400}
                        showReferenceLine={true}
                        retirementAge={form.getValues().payoutStartAge}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Comprehensive Analysis */}
                  <div className="apple-card p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-6 h-6 bg-chart-3/10 rounded-lg flex items-center justify-center">
                        <div className="w-3 h-3 bg-chart-3 rounded-sm"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground tracking-tight">
                        Komplettanalyse - Portfolio, Beiträge & Gebühren
                      </h4>
                    </div>
                    <div className="chart-container p-4">
                      <PensionChart
                        data={[...simulationResults.seriesAnspar, ...simulationResults.seriesPayout]}
                        type="composed"
                        height={400}
                        showBrush={false}
                        showReferenceLine={true}
                        retirementAge={form.getValues().payoutStartAge}
                        targetAmount={form.getValues().targetMaturityValue || undefined}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <section className="animate-slide-in-up">
                  <div className="apple-card p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-chart-4/10 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-chart-4 rounded-sm"></div>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">
                        {t("chart.costBreakdown")}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-accent/20 rounded-xl hover:bg-accent/30 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-5 h-5 bg-primary rounded-lg"></div>
                          <span className="text-base font-medium text-foreground">{t("breakdown.contributions")}</span>
                        </div>
                        <span className="text-lg font-bold text-foreground" data-testid="breakdown-contributions">
                          {formatCurrency(simulationResults.kpis.totalContributions)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-accent/20 rounded-xl hover:bg-accent/30 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-5 h-5 bg-success rounded-lg"></div>
                          <span className="text-base font-medium text-foreground">{t("breakdown.capitalGains")}</span>
                        </div>
                        <span className="text-lg font-bold text-success" data-testid="breakdown-gains">
                          {formatCurrency(simulationResults.kpis.capitalGains)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-accent/20 rounded-xl hover:bg-accent/30 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-5 h-5 bg-warning rounded-lg"></div>
                          <span className="text-base font-medium text-foreground">{t("breakdown.totalCosts")}</span>
                        </div>
                        <span className="text-lg font-bold text-warning" data-testid="breakdown-costs">
                          {formatCurrency(simulationResults.kpis.totalCosts)}
                        </span>
                      </div>
                      <div className="border-t border-border/50 pt-4 mt-6">
                        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl">
                          <span className="text-base font-semibold text-foreground">{t("breakdown.netReturn")}</span>
                          <span className="text-xl font-bold text-primary" data-testid="breakdown-net-return">
                            {formatCurrency(simulationResults.kpis.netReturn)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Compound Interest Visualization */}
                <section className="animate-slide-in-up">
                  <div className="apple-card p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">
                        {language === 'de' ? 'Zinseszins-Effekt Visualisierung' : 'Compound Interest Visualization'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Compound Growth Breakdown */}
                      <div className="space-y-6">
                        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700/30">
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-4">
                            {language === 'de' ? 'Wachstums-Aufschlüsselung' : 'Growth Breakdown'}
                          </h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-green-700 dark:text-green-300">{language === 'de' ? 'Eingezahlte Beiträge' : 'Contributions Paid'}</span>
                              <span className="font-bold text-green-800 dark:text-green-200">
                                {formatCurrency(simulationResults.kpis.totalContributions)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-green-700 dark:text-green-300">{language === 'de' ? 'Zinserträge' : 'Interest Earnings'}</span>
                              <span className="font-bold text-green-800 dark:text-green-200">
                                {formatCurrency(simulationResults.kpis.capitalGains)}
                              </span>
                            </div>
                            <div className="border-t border-green-300/50 pt-3">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-green-800 dark:text-green-200">{language === 'de' ? 'Gesamtwert' : 'Total Value'}</span>
                                <span className="font-bold text-lg text-green-800 dark:text-green-200">
                                  {formatCurrency(simulationResults.kpis.projectedValue)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Growth Multiplier */}
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700/30">
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-4">
                            {language === 'de' ? 'Wachstums-Multiplikator' : 'Growth Multiplier'}
                          </h4>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                              {(simulationResults.kpis.projectedValue / simulationResults.kpis.totalContributions).toFixed(1)}x
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {language === 'de' ? 'Ihr Geld wächst auf das' : 'Your money grows to'} <strong>{(simulationResults.kpis.projectedValue / simulationResults.kpis.totalContributions).toFixed(1)}-fache</strong> {language === 'de' ? 'durch Zinseszins' : 'through compound interest'}
                            </p>
                          </div>
                        </div>

                        {/* Compound Interest Rate */}
                        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-700/30">
                          <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-4">
                            {language === 'de' ? 'Effektive Gesamtrendite' : 'Effective Total Return'}
                          </h4>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-purple-800 dark:text-purple-200 mb-2">
                              {(((simulationResults.kpis.projectedValue / simulationResults.kpis.totalContributions) ** (1 / form.getValues().termYears) - 1) * 100).toFixed(1)}%
                            </div>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                              {language === 'de' ? 'Jährliche Gesamtrendite über' : 'Annual total return over'} {form.getValues().termYears} {language === 'de' ? 'Jahre' : 'years'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Growth Chart */}
                      <div className="space-y-6">
                        <div className="chart-container p-4">
                          <h4 className="font-semibold text-foreground mb-4">
                            {language === 'de' ? 'Zinseszins-Entwicklung' : 'Compound Growth Development'}
                          </h4>
                          <PensionChart
                            data={simulationResults.seriesAnspar}
                            type="area"
                            height={300}
                            showReferenceLine={false}
                            className="w-full"
                          />
                        </div>

                        {/* Time Value Insight */}
                        <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-700/30">
                          <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-4">
                            💡 {language === 'de' ? 'Zeitwert-Einsicht' : 'Time Value Insight'}
                          </h4>
                          <p className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">
                            {language === 'de' 
                              ? `In den ersten 10 Jahren wächst Ihr Portfolio hauptsächlich durch Beiträge. In den späteren Jahren übernimmt der Zinseszins-Effekt und beschleunigt das Wachstum exponentiell.`
                              : `In the first 10 years, your portfolio grows mainly through contributions. In later years, compound interest takes over and accelerates growth exponentially.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Risk Assessment & Volatility */}
                <section className="animate-slide-in-up">
                  <div className="apple-card p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">
                        {language === 'de' ? 'Risiko-Assessment & Volatilität' : 'Risk Assessment & Volatility'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Risk Level Indicator */}
                      <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-700/30">
                        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-4">
                          {language === 'de' ? 'Risikostufe' : 'Risk Level'}
                        </h4>
                        <div className="text-center">
                          <div className="text-4xl mb-3">
                            {costSettings.volatility <= 0.1 ? '🟢' : costSettings.volatility <= 0.2 ? '🟡' : '🔴'}
                          </div>
                          <div className="text-lg font-bold text-red-800 dark:text-red-200">
                            {costSettings.volatility <= 0.1 
                              ? (language === 'de' ? 'Niedrig' : 'Low')
                              : costSettings.volatility <= 0.2 
                              ? (language === 'de' ? 'Mittel' : 'Medium')
                              : (language === 'de' ? 'Hoch' : 'High')
                            }
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                            {(costSettings.volatility * 100).toFixed(1)}% {language === 'de' ? 'Volatilität' : 'Volatility'}
                          </p>
                        </div>
                      </div>

                      {/* Best/Worst Case Scenarios */}
                      <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl border border-yellow-200 dark:border-yellow-700/30">
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
                          {language === 'de' ? 'Szenarien (±2σ)' : 'Scenarios (±2σ)'}
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-yellow-700 dark:text-yellow-300">{language === 'de' ? 'Bestes Szenario' : 'Best Case'}</span>
                              <span className="text-green-600 font-semibold">+{(costSettings.volatility * 2 * 100).toFixed(0)}%</span>
                            </div>
                            <div className="font-bold text-yellow-800 dark:text-yellow-200">
                              {formatCurrency(simulationResults.kpis.projectedValue * (1 + costSettings.volatility * 2))}
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-yellow-700 dark:text-yellow-300">{language === 'de' ? 'Worst Case' : 'Worst Case'}</span>
                              <span className="text-red-600 font-semibold">-{(costSettings.volatility * 2 * 100).toFixed(0)}%</span>
                            </div>
                            <div className="font-bold text-yellow-800 dark:text-yellow-200">
                              {formatCurrency(Math.max(simulationResults.kpis.totalContributions, simulationResults.kpis.projectedValue * (1 - costSettings.volatility * 2)))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Risk Mitigation Tips */}
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700/30">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-4">
                          🛡️ {language === 'de' ? 'Risiko-Minderung' : 'Risk Mitigation'}
                        </h4>
                        <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
                          <div className="flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{language === 'de' ? 'Lange Anlagedauer reduziert Risiko' : 'Long investment horizon reduces risk'}</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{language === 'de' ? 'Regelmäßige Einzahlungen glätten Schwankungen' : 'Regular contributions smooth volatility'}</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{language === 'de' ? 'Diversifikation minimiert Einzelrisiken' : 'Diversification minimizes individual risks'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Volatility Adjustment */}
                    <div className="mt-8 p-6 bg-gradient-to-r from-accent/30 to-accent/10 rounded-xl border border-border/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-foreground">
                          {language === 'de' ? 'Volatilität anpassen' : 'Adjust Volatility'}
                        </h4>
                        <span className="text-sm text-muted-foreground">
                          {(costSettings.volatility * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Button
                          variant={costSettings.volatility <= 0.1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCostSettings(prev => ({ ...prev, volatility: 0.08 }));
                            toast({
                              title: language === 'de' ? 'Konservatives Risiko' : 'Conservative Risk',
                              description: language === 'de' ? 'Volatilität auf 8% gesetzt' : 'Volatility set to 8%'
                            });
                          }}
                          className="h-12"
                        >
                          🐢 {language === 'de' ? 'Konservativ' : 'Conservative'}
                        </Button>
                        <Button
                          variant={costSettings.volatility > 0.1 && costSettings.volatility <= 0.2 ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCostSettings(prev => ({ ...prev, volatility: 0.15 }));
                            toast({
                              title: language === 'de' ? 'Ausgewogenes Risiko' : 'Balanced Risk',
                              description: language === 'de' ? 'Volatilität auf 15% gesetzt' : 'Volatility set to 15%'
                            });
                          }}
                          className="h-12"
                        >
                          ⚖️ {language === 'de' ? 'Ausgewogen' : 'Balanced'}
                        </Button>
                        <Button
                          variant={costSettings.volatility > 0.2 ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCostSettings(prev => ({ ...prev, volatility: 0.25 }));
                            toast({
                              title: language === 'de' ? 'Aggressives Risiko' : 'Aggressive Risk',
                              description: language === 'de' ? 'Volatilität auf 25% gesetzt' : 'Volatility set to 25%'
                            });
                          }}
                          className="h-12"
                        >
                          🚀 {language === 'de' ? 'Aggressiv' : 'Aggressive'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Inflation Adjustment Calculator */}
                <section className="animate-slide-in-up">
                  <div className="apple-card p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">
                        {language === 'de' ? 'Inflations-Anpassungsrechner' : 'Inflation Adjustment Calculator'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Current vs Future Purchasing Power */}
                      <div className="space-y-6">
                        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-700/30">
                          <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-4">
                            💰 {language === 'de' ? 'Kaufkraft-Vergleich' : 'Purchasing Power Comparison'}
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">
                                {language === 'de' ? 'Heutige Kaufkraft' : 'Today\'s Purchasing Power'}
                              </div>
                              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                                {formatCurrency(simulationResults.kpis.monthlyPension)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">
                                {language === 'de' ? 'Kaufkraft bei 2.5% Inflation (EZB-Ziel)' : 'Purchasing Power at 2.5% Inflation (ECB Target)'}
                              </div>
                              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                                {formatCurrency(simulationResults.kpis.monthlyPension / Math.pow(1.025, form.getValues().termYears))}
                              </div>
                              <div className="text-xs text-purple-600 dark:text-purple-400">
                                {language === 'de' ? 'Entspricht heutiger Kaufkraft' : 'Equivalent to today\'s purchasing power'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Inflation Impact */}
                        <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-700/30">
                          <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-4">
                            📉 {language === 'de' ? 'Inflations-Auswirkung' : 'Inflation Impact'}
                          </h4>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-orange-800 dark:text-orange-200 mb-2">
                              -{((1 - 1/Math.pow(1.02, form.getValues().termYears)) * 100).toFixed(0)}%
                            </div>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              {language === 'de' ? 'Kaufkraftverlust über' : 'Purchasing power loss over'} {form.getValues().termYears} {language === 'de' ? 'Jahre bei 2% Inflation' : 'years at 2% inflation'}
                            </p>
                          </div>
                        </div>

                        {/* Inflation Protection Strategy */}
                        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700/30">
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-4">
                            🛡️ {language === 'de' ? 'Inflations-Schutz' : 'Inflation Protection'}
                          </h4>
                          <div className="space-y-3 text-sm text-green-700 dark:text-green-300">
                            <div className="flex items-start space-x-2">
                              <span className="text-green-500 mt-1">✓</span>
                              <span>{language === 'de' ? 'Aktieninvestments bieten langfristigen Inflationsschutz' : 'Equity investments provide long-term inflation protection'}</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-green-500 mt-1">✓</span>
                              <span>{language === 'de' ? 'Erhöhung der Sparrate um 2-3% jährlich empfohlen' : 'Increase savings rate by 2-3% annually recommended'}</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-green-500 mt-1">✓</span>
                              <span>{language === 'de' ? 'Frühe Erhöhung der Beiträge maximiert Zinseszins' : 'Early contribution increases maximize compound interest'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inflation Scenarios */}
                      <div className="space-y-6">
                        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-xl border border-gray-200 dark:border-gray-700/30">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            {language === 'de' ? 'Inflations-Szenarien' : 'Inflation Scenarios'}
                          </h4>
                          <div className="space-y-4">
                            {[1, 2, 3, 4].map((inflationRate) => {
                              // Correct inflation calculation: use time until pension starts, not contribution period
                              const yearsUntilPension = form.getValues().payoutStartAge - form.getValues().startAge;
                              const realValue = simulationResults.kpis.monthlyPension / Math.pow(1 + inflationRate/100, yearsUntilPension);
                              return (
                                <div key={inflationRate} className="flex justify-between items-center py-2 border-b border-gray-300/50 dark:border-gray-600/50 last:border-b-0">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {inflationRate}% {language === 'de' ? 'Inflation' : 'Inflation'}
                                  </span>
                                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    {formatCurrency(realValue)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Inflation-Adjusted Strategy */}
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700/30">
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-4">
                            📊 {language === 'de' ? 'Inflations-Angepasste Strategie' : 'Inflation-Adjusted Strategy'}
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-blue-700 dark:text-blue-300">{language === 'de' ? 'Empfohlene Erhöhung' : 'Recommended Increase'}</span>
                              <span className="font-bold text-blue-800 dark:text-blue-200">+2.5% {language === 'de' ? 'jährlich' : 'annually'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-blue-700 dark:text-blue-300">{language === 'de' ? 'Beitrag in 10 Jahren' : 'Contribution in 10 years'}</span>
                              <span className="font-bold text-blue-800 dark:text-blue-200">
                                {formatCurrency(form.getValues().monthlyContribution * Math.pow(1.03, 10))}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-blue-700 dark:text-blue-300">{language === 'de' ? 'Zusatzertrag durch Erhöhung' : 'Additional return from increases'}</span>
                              <span className="font-bold text-green-600">+20-35%</span>
                            </div>
                          </div>
                        </div>

                        {/* Real Return Calculator */}
                        <div className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl border border-indigo-200 dark:border-indigo-700/30">
                          <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-4">
                            {language === 'de' ? 'Real-Rendite' : 'Real Return'}
                          </h4>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-indigo-800 dark:text-indigo-200 mb-2">
                              {((costSettings.expectedReturn - 0.025) * 100).toFixed(1)}%
                            </div>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                              {language === 'de' ? 'Rendite nach Abzug von 2,5% Inflation (EZB-Ziel)' : 'Return after subtracting 2.5% inflation (ECB target)'}
                            </p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                              {language === 'de' ? 'Basierend auf langfristigem EZB-Inflationsziel' : 'Based on long-term ECB inflation target'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Premium Action Center */}
                <section className="animate-fade-in pb-8">
                  <div className="apple-card p-8 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center shadow-sm">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground tracking-tight">
                          {language === 'de' ? 'Aktionen' : 'Actions'}
                        </h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <EnhancedTooltip content={language === 'de' ? 'Speichern Sie Ihr aktuelles Szenario für späteren Vergleich' : 'Save your current scenario for later comparison'}>
                          <Button
                            className="apple-button-primary h-14 text-base font-medium relative group overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                            onClick={() => {
                              setIsLoading(true);
                              toast({
                                title: language === 'de' ? 'Szenario wird gespeichert...' : 'Saving scenario...',
                                description: language === 'de' ? 'Bitte warten Sie, während Ihr Szenario gespeichert wird' : 'Please wait while your scenario is being saved'
                              });
                              saveScenarioMutation.mutate();
                            }}
                            disabled={saveScenarioMutation.isPending || isLoading}
                            data-testid="button-save-scenario"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {saveScenarioMutation.isPending || isLoading ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <Save className="w-5 h-5 mr-2" />
                            )}
                            {t("action.saveScenario")}
                          </Button>
                        </EnhancedTooltip>
                        
                        <EnhancedTooltip content={language === 'de' ? 'Exportieren Sie einen detaillierten PDF-Bericht Ihrer Simulation' : 'Export a detailed PDF report of your simulation'}>
                          <Button
                            variant="secondary"
                            className="apple-button-secondary h-14 text-base font-medium relative group overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                            onClick={exportToPDF}
                            disabled={!simulationResults || isLoading}
                            data-testid="button-export-report"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <Download className="w-5 h-5 mr-2" />
                            {language === 'de' ? 'PDF Bericht' : 'PDF Report'}
                          </Button>
                        </EnhancedTooltip>

                        <EnhancedTooltip content={language === 'de' ? 'Vergleichen Sie verschiedene Anlagestrategien miteinander' : 'Compare different investment strategies'}>
                          <Button 
                            variant="outline" 
                            className="apple-button-outline h-14 text-base font-medium relative group overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]" 
                            onClick={async () => {
                              if (!showComparison) {
                                setIsLoading(true);
                                try {
                                  // Generate comparison scenarios
                                  const currentData = form.getValues();
                                  const scenarios = [
                                    { ...currentData, monthlyContribution: currentData.monthlyContribution * 0.5, expectedReturn: 0.04, label: 'Konservativ (50% Beitrag, 4% Rendite)' },
                                    { ...currentData, label: 'Aktuell' },
                                    { ...currentData, monthlyContribution: currentData.monthlyContribution * 1.5, expectedReturn: 0.075, label: 'Aggressiv (150% Beitrag, 7.5% Rendite)' }
                                  ];
                                  
                                  const results = await Promise.all(scenarios.map(scenario => 
                                    apiRequest('POST', '/api/simulate', {
                                      ...scenario,
                                      scenarioId: 'comparison',
                                      policyFeeAnnualPct: costSettings.policyFeeAnnualPct,
                                      policyFixedAnnual: costSettings.policyFixedAnnual,
                                      taxRatePayout: costSettings.taxRatePayout,
                                      ter: costSettings.ter,
                                      volatility: costSettings.volatility,
                                      rebalancingEnabled: true
                                    }).then(res => res.json())
                                  ));
                                  
                                  setComparisonScenarios(results);
                                  setShowComparison(true);
                                  toast({
                                    title: language === 'de' ? 'Vergleich erstellt' : 'Comparison Created',
                                    description: language === 'de' ? 'Strategien wurden erfolgreich verglichen' : 'Strategies have been successfully compared'
                                  });
                                } catch (error) {
                                  console.error('Comparison error:', error);
                                  toast({
                                    title: language === 'de' ? 'Fehler beim Vergleich' : 'Comparison Error',
                                    description: language === 'de' ? 'Vergleich konnte nicht erstellt werden' : 'Could not create comparison',
                                    variant: 'destructive'
                                  });
                                } finally {
                                  setIsLoading(false);
                                }
                              } else {
                                setShowComparison(false);
                              }
                            }}
                            disabled={isLoading}
                            data-testid="button-compare"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {isLoading ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <BarChart3 className="w-5 h-5 mr-2" />
                            )}
                            {showComparison ? (language === 'de' ? 'Vergleich ausblenden' : 'Hide Comparison') : (language === 'de' ? 'Strategien vergleichen' : 'Compare Strategies')}
                          </Button>
                        </EnhancedTooltip>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Strategy Comparison */}
                {showComparison && comparisonScenarios.length > 0 && (
                  <section className="animate-slide-in-up">
                    <div className="apple-card p-8">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-chart-2/10 rounded-lg flex items-center justify-center">
                          <div className="w-4 h-4 bg-chart-2 rounded-sm"></div>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground tracking-tight">
                          {language === 'de' ? 'Strategie-Vergleich' : 'Strategy Comparison'}
                        </h3>
                      </div>

                      {/* Comparison Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {comparisonScenarios.map((scenario, index) => {
                          const labels = ['Konservativ', 'Aktuell', 'Aggressiv'];
                          const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500'];
                          const bgColors = ['bg-blue-50 dark:bg-blue-900/20', 'bg-green-50 dark:bg-green-900/20', 'bg-orange-50 dark:bg-orange-900/20'];
                          const borderColors = ['border-blue-200 dark:border-blue-700/30', 'border-green-200 dark:border-green-700/30', 'border-orange-200 dark:border-orange-700/30'];
                          const textColors = ['text-blue-800 dark:text-blue-200', 'text-green-800 dark:text-green-200', 'text-orange-800 dark:text-orange-200'];
                          
                          return (
                            <div key={index} className={`p-6 rounded-xl border ${bgColors[index]} ${borderColors[index]}`}>
                              <div className="flex items-center space-x-3 mb-4">
                                <div className={`w-4 h-4 ${colors[index]} rounded-full`}></div>
                                <h4 className={`font-semibold ${textColors[index]}`}>
                                  {labels[index]}
                                </h4>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <div className={`text-sm ${textColors[index]} opacity-80`}>{language === 'de' ? 'Prognostizierter Wert' : 'Projected Value'}</div>
                                  <div className={`text-2xl font-bold ${textColors[index]}`}>
                                    {formatCurrency(scenario.kpis.projectedValue)}
                                  </div>
                                </div>
                                <div>
                                  <div className={`text-sm ${textColors[index]} opacity-80`}>{language === 'de' ? 'Monatliche Rente' : 'Monthly Pension'}</div>
                                  <div className={`text-lg font-semibold ${textColors[index]}`}>
                                    {formatCurrency(scenario.kpis.monthlyPension)}
                                  </div>
                                </div>
                                <div>
                                  <div className={`text-sm ${textColors[index]} opacity-80`}>{language === 'de' ? 'Gesamtkosten' : 'Total Costs'}</div>
                                  <div className={`text-sm font-medium ${textColors[index]}`}>
                                    {formatCurrency(scenario.kpis.totalCosts)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Comparison Chart */}
                      <div className="chart-container p-4">
                        <h4 className="font-semibold text-foreground mb-4">
                          {language === 'de' ? 'Vergleichs-Chart' : 'Comparison Chart'}
                        </h4>
                        <div className="h-96 w-full">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground mb-2">{language === 'de' ? 'Portfolio-Entwicklung' : 'Portfolio Development'}</h5>
                              <PensionChart
                                data={comparisonScenarios[1]?.seriesAnspar || []}
                                type="line"
                                height={300}
                                showReferenceLine={false}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground mb-2">{language === 'de' ? 'Vergleichs-Übersicht' : 'Comparison Overview'}</h5>
                              <div className="space-y-4 pt-4">
                                {comparisonScenarios.map((scenario, index) => {
                                  const labels = ['Konservativ', 'Aktuell', 'Aggressiv'];
                                  const colors = ['text-blue-600', 'text-green-600', 'text-orange-600'];
                                  const currentScenario = comparisonScenarios[1];
                                  const difference = ((scenario.kpis.projectedValue - currentScenario.kpis.projectedValue) / currentScenario.kpis.projectedValue * 100);
                                  
                                  return (
                                    <div key={index} className="flex justify-between items-center p-3 bg-accent/20 rounded-lg">
                                      <span className={`font-medium ${colors[index]}`}>{labels[index]}</span>
                                      <div className="text-right">
                                        <div className="font-semibold">{formatCurrency(scenario.kpis.projectedValue)}</div>
                                        {index !== 1 && (
                                          <div className={`text-xs ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {difference > 0 ? '+' : ''}{difference.toFixed(1)}%
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}        </FadeIn>

        {/* Funds Calculator */}
        {activeTab === "funds" && (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="animate-slide-in-up">
              <div className="apple-card p-8">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-chart-2/10 rounded-xl flex items-center justify-center">
                    <div className="text-chart-2 font-bold text-lg">📈</div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                      Fonds-Sparplan Rechner
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                      Berechnen Sie Ihr Fondsvermögen ohne Versicherungsmantel
                    </p>
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-base font-medium text-foreground">Monatliche Sparrate</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="500"
                          value={fundsSettings.monthlyContribution}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (!isNaN(value) && value >= 0) {
                              setFundsSettings(prev => ({ ...prev, monthlyContribution: value }));
                              // Auto-save to onboarding
                              autoSave({
                                privatePension: { contribution: value }
                              });
                            }
                          }}
                          className="apple-input text-lg h-14 pr-12 w-full"
                          data-testid="input-funds-monthly"
                        />
                        <span className="absolute right-4 top-4 text-base text-muted-foreground font-medium">€</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-base font-medium text-foreground">Anlagedauer</label>
                      <div className="bg-accent/50 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-muted-foreground">5 Jahre</span>
                          <span className="text-lg font-semibold text-foreground">{fundsSettings.termYears} Jahre</span>
                          <span className="text-sm text-muted-foreground">40 Jahre</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="40"
                          value={fundsSettings.termYears}
                          onChange={(e) => setFundsSettings(prev => ({ ...prev, termYears: Number(e.target.value) }))}
                          className="w-full h-2 bg-accent rounded-full appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((fundsSettings.termYears - 5) / 35) * 100}%, hsl(var(--accent)) ${((fundsSettings.termYears - 5) / 35) * 100}%, hsl(var(--accent)) 100%)`
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-base font-medium text-foreground">Erwartete Rendite</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button 
                          onClick={() => setFundsSettings(prev => ({ ...prev, expectedReturn: 0.05 }))}
                          className={`p-4 rounded-xl text-center transition-colors ${
                            fundsSettings.expectedReturn === 0.05 
                              ? 'bg-primary/20 border-2 border-primary' 
                              : 'bg-accent/30 hover:bg-accent/50'
                          }`}
                        >
                          <div className={`text-lg font-bold ${
                            fundsSettings.expectedReturn === 0.05 ? 'text-primary' : 'text-foreground'
                          }`}>5%</div>
                          <div className={`text-xs ${
                            fundsSettings.expectedReturn === 0.05 ? 'text-primary' : 'text-muted-foreground'
                          }`}>Konservativ</div>
                        </button>
                        <button 
                          onClick={() => setFundsSettings(prev => ({ ...prev, expectedReturn: 0.07 }))}
                          className={`p-4 rounded-xl text-center transition-colors ${
                            fundsSettings.expectedReturn === 0.07 
                              ? 'bg-primary/20 border-2 border-primary' 
                              : 'bg-accent/30 hover:bg-accent/50'
                          }`}
                        >
                          <div className={`text-lg font-bold ${
                            fundsSettings.expectedReturn === 0.07 ? 'text-primary' : 'text-foreground'
                          }`}>7%</div>
                          <div className={`text-xs ${
                            fundsSettings.expectedReturn === 0.07 ? 'text-primary' : 'text-muted-foreground'
                          }`}>Ausgewogen</div>
                        </button>
                        <button 
                          onClick={() => setFundsSettings(prev => ({ ...prev, expectedReturn: 0.09 }))}
                          className={`p-4 rounded-xl text-center transition-colors ${
                            fundsSettings.expectedReturn === 0.09 
                              ? 'bg-primary/20 border-2 border-primary' 
                              : 'bg-accent/30 hover:bg-accent/50'
                          }`}
                        >
                          <div className={`text-lg font-bold ${
                            fundsSettings.expectedReturn === 0.09 ? 'text-primary' : 'text-foreground'
                          }`}>9%</div>
                          <div className={`text-xs ${
                            fundsSettings.expectedReturn === 0.09 ? 'text-primary' : 'text-muted-foreground'
                          }`}>Wachstum</div>
                        </button>
                      </div>
                      
                      {/* Custom Return Input */}
                      <div className="mt-4">
                        <button 
                          onClick={() => setFundsSettings(prev => ({ ...prev, showCustomReturn: !prev.showCustomReturn }))}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          {fundsSettings.showCustomReturn ? 'Ausblenden' : '+ Eigene Rendite eingeben'}
                        </button>
                        
                        {fundsSettings.showCustomReturn && (
                          <div className="mt-3 relative">
                            <input
                              type="number"
                              placeholder="8.5"
                              step="0.1"
                              min="-10"
                              max="20"
                              value={(fundsSettings.expectedReturn * 100).toFixed(1)}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                if (!isNaN(value)) {
                                  setFundsSettings(prev => ({ ...prev, expectedReturn: value / 100 }));
                                }
                              }}
                              className="apple-input text-base h-12 pr-12 w-full"
                              data-testid="input-custom-return"
                            />
                            <span className="absolute right-4 top-3 text-base text-muted-foreground font-medium">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="kpi-card">
                      <div className="text-3xl font-bold text-success animated-number">
                        {formatCurrency((() => {
          const monthlyRate = fundsSettings.expectedReturn / 12;
          const totalMonths = fundsSettings.termYears * 12;
          if (monthlyRate === 0) return fundsSettings.monthlyContribution * totalMonths;
          return fundsSettings.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
        })())}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium mt-2">
                        Prognostiziertes Endkapital
                      </div>
                      <div className="mt-4 text-xs text-success/80">
                        ↗ Bei {(fundsSettings.expectedReturn * 100).toFixed(1)}% Jahresrendite
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-accent/20 rounded-xl">
                        <div className="text-lg font-bold text-foreground">{formatCurrency(fundsSettings.monthlyContribution * 12 * fundsSettings.termYears)}</div>
                        <div className="text-xs text-muted-foreground">Eingezahlt</div>
                      </div>
                      <div className="p-4 bg-accent/20 rounded-xl">
                        <div className="text-lg font-bold text-primary">{formatCurrency(Math.max(0, (() => {
          const monthlyRate = fundsSettings.expectedReturn / 12;
          const totalMonths = fundsSettings.termYears * 12;
          const totalPaid = fundsSettings.monthlyContribution * totalMonths;
          const futureValue = monthlyRate === 0 ? totalPaid : fundsSettings.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
          return futureValue - totalPaid;
        })()))}</div>
                        <div className="text-xs text-muted-foreground">Kursgewinn</div>
                      </div>
                    </div>

                    <div className="bg-warning/10 rounded-xl p-6">
                      <h4 className="font-semibold text-warning mb-3">⚠ Wichtige Hinweise</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Keine Steuervorteile wie bei Versicherungen</li>
                        <li>• Volle Kapitalertragssteuer (26,375%)</li>
                        <li>• Höhere Flexibilität bei Auszahlung</li>
                        <li>• Geringere Gesamtkosten</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/30 mt-4">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">📋 Rechtliche Hinweise</h4>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
                        <p>• <strong>Keine Anlageberatung:</strong> Diese Berechnungen dienen ausschließlich der Information und stellen keine Anlageberatung dar.</p>
                        <p>• <strong>Keine Gewähr:</strong> Alle Angaben ohne Gewähr. Vergangene Wertentwicklungen sind kein Indikator für zukünftige Ergebnisse.</p>
                        <p>• <strong>Individuelle Beratung:</strong> Für eine auf Ihre persönliche Situation zugeschnittene Beratung wenden Sie sich an einen qualifizierten Finanzberater.</p>
                        <p>• <strong>Steuerliche Hinweise:</strong> Steuerliche Regelungen können sich ändern. Konsultieren Sie einen Steuerberater für aktuelle Informationen.</p>
                        <p>• <strong>Risiken:</strong> Kapitalanlagen sind mit Risiken verbunden. Der Wert kann schwanken und Verluste sind möglich.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section for Funds */}
                <div className="mt-8 space-y-8">
                  {/* Fund Growth Chart */}
                  <div className="apple-card p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-chart-2/10 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-chart-2 rounded-sm"></div>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">
                        Fondsentwicklung
                      </h3>
                    </div>
                    <div className="h-80">
                      <PensionChart 
                        data={ansparChartData}
                        type="area"
                        height={320}
                      />
                    </div>
                  </div>

                  {/* Fund Performance Comparison */}
                  <div className="apple-card p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-chart-5/10 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-chart-5 rounded-sm"></div>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">
                        Rendite-Szenarien
                      </h3>
                    </div>
                    
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-700/30">
                        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3">Pessimistisch (3% p.a.)</h4>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency((() => {
            const monthlyRate = 0.03 / 12;
            const totalMonths = fundsSettings.termYears * 12;
            return fundsSettings.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
          })())}</div>
                          <div className="text-sm text-red-600 dark:text-red-400">
                            {formatCurrency(Math.max(0, (() => {
              const monthlyRate = 0.03 / 12;
              const totalMonths = fundsSettings.termYears * 12;
              const totalPaid = fundsSettings.monthlyContribution * totalMonths;
              const futureValue = fundsSettings.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
              return futureValue - totalPaid;
            })()))} Kursgewinn
                          </div>
                          <div className="text-xs text-red-500 dark:text-red-500">
                            Bei konstanter 3% Rendite
                          </div>
                        </div>
                      </div>

                      <div className="bg-chart-2/10 dark:bg-chart-2/20 rounded-xl p-6 border border-chart-2/20 dark:border-chart-2/30">
                        <h4 className="font-semibold text-chart-2 mb-3">Realistisch (7% p.a.)</h4>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-chart-2">{formatCurrency((() => {
            const monthlyRate = 0.07 / 12;
            const totalMonths = fundsSettings.termYears * 12;
            return fundsSettings.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
          })())}</div>
                          <div className="text-sm text-chart-2/80">
                            {formatCurrency(Math.max(0, (() => {
              const monthlyRate = 0.07 / 12;
              const totalMonths = fundsSettings.termYears * 12;
              const totalPaid = fundsSettings.monthlyContribution * totalMonths;
              const futureValue = fundsSettings.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
              return futureValue - totalPaid;
            })()))} Kursgewinn
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Historischer MSCI World Durchschnitt
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700/30">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">Optimistisch (10% p.a.)</h4>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency((() => {
            const monthlyRate = 0.10 / 12;
            const totalMonths = fundsSettings.termYears * 12;
            return fundsSettings.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
          })())}</div>
                          <div className="text-sm text-green-600 dark:text-green-400">
                            {formatCurrency(Math.max(0, (() => {
              const monthlyRate = 0.10 / 12;
              const totalMonths = fundsSettings.termYears * 12;
              const totalPaid = fundsSettings.monthlyContribution * totalMonths;
              const futureValue = fundsSettings.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
              return futureValue - totalPaid;
            })()))} Kursgewinn
                          </div>
                          <div className="text-xs text-green-500 dark:text-green-500">
                            Bei konstanter 10% Rendite
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fund Performance Tab */}
        {activeTab === "fund-performance" && (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="animate-slide-in-up">
              <div className="apple-card p-8">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-chart-5/10 rounded-xl flex items-center justify-center">
                    <div className="text-chart-5 font-bold text-lg">📊</div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                      Fond Leistung Konfiguration
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                      Stellen Sie die Performance Parameter für Ihre Fondsinvestition ein
                    </p>
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-base font-medium text-foreground">Maximale Performance p.a.</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="9.0"
                          step="0.1"
                          min="0"
                          max="20"
                          value={fundPerformance.maxPerformance}
                          onChange={(e) => setFundPerformance(prev => ({ ...prev, maxPerformance: Number(e.target.value) }))}
                          className="apple-input text-lg h-14 pr-12 w-full"
                          data-testid="input-max-performance"
                        />
                        <span className="absolute right-4 top-4 text-base text-muted-foreground font-medium">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Optimistische Jahresrendite in guten Marktphasen
                      </p>
                    </div>

                    <div className="space-y-4">
                      <label className="text-base font-medium text-foreground">Minimale Performance p.a.</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="2.0"
                          step="0.1"
                          min="-10"
                          max="10"
                          value={fundPerformance.minPerformance}
                          onChange={(e) => setFundPerformance(prev => ({ ...prev, minPerformance: Number(e.target.value) }))}
                          className="apple-input text-lg h-14 pr-12 w-full"
                          data-testid="input-min-performance"
                        />
                        <span className="absolute right-4 top-4 text-base text-muted-foreground font-medium">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Konservative Jahresrendite in schwachen Marktphasen
                      </p>
                    </div>

                    <div className="space-y-4">
                      <label className="text-base font-medium text-foreground">MSCI World Zufallsperformance</label>
                      <button 
                        onClick={() => {
                          // Generate random performance based on MSCI World historical data (-37% to +47%)
                          const randomReturn = Math.random() * (47.4 - (-37.0)) + (-37.0);
                          const roundedReturn = Math.round(randomReturn * 10) / 10;
                          setFundPerformance(prev => ({ ...prev, currentReturn: roundedReturn }));
                          setCostSettings(prev => ({ ...prev, expectedReturn: roundedReturn / 100 }));
                          toast({
                            title: 'Zufällige Performance generiert',
                            description: `Neue erwartete Rendite: ${roundedReturn.toFixed(1)}% p.a.`
                          });
                        }}
                        className="apple-button w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
                        data-testid="button-random-performance"
                      >
                        🎲 Zufällige Performance generieren
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Generiert eine zufällige Jahresrendite basierend auf historischen MSCI World Daten (-37% bis +47%)
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/30">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                        Aktuelle Einstellungen
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Max. Performance:</span>
                          <span className="font-semibold text-blue-800 dark:text-blue-200">{fundPerformance.maxPerformance.toFixed(1)}% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Min. Performance:</span>
                          <span className="font-semibold text-blue-800 dark:text-blue-200">{fundPerformance.minPerformance.toFixed(1)}% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Ø Erwartete Rendite:</span>
                          <span className="font-semibold text-blue-800 dark:text-blue-200">{fundPerformance.currentReturn.toFixed(1)}% p.a.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-accent/50 rounded-xl p-6">
                      <h4 className="font-semibold text-foreground mb-4">MSCI World Historische Performance</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Beste Jahresperformance:</span>
                          <span className="font-semibold text-green-600">+47.4% (2009)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Schlechteste Jahresperformance:</span>
                          <span className="font-semibold text-red-600">-37.0% (2008)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ø Performance (30 Jahre):</span>
                          <span className="font-semibold text-foreground">8.2% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Volatilität:</span>
                          <span className="font-semibold text-foreground">15.8%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-700/30">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
                        ⚠️ Wichtiger Hinweis
                      </h4>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        <li>• Vergangene Performance ist keine Garantie für zukünftige Ergebnisse</li>
                        <li>• Fondsinvestments unterliegen Kursschwankungen</li>
                        <li>• Die tatsächliche Rendite kann erheblich von Prognosen abweichen</li>
                        <li>• Diversifikation reduziert aber eliminiert nicht das Verlustrisiko</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "comparison" && (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="animate-slide-in-up">
              {/* Comparison Tool Header */}
              <div className="apple-card p-8 mb-8">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                    <div className="text-white font-bold text-xl">📊</div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">
                      Vergleichsrechner
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                      Vergleichen Sie verschiedene Rentenprodukte direkt miteinander
                    </p>
                  </div>
                </div>

                {/* Comparison Parameters */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/30 mb-8">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">Vergleichsparameter</h3>
                  <div className="grid gap-6 lg:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Aktuelles Alter</label>
                      <input
                        type="number"
                        placeholder="35"
                        value={comparisonParams.currentAge}
                        onChange={(e) => setComparisonParams(prev => ({ ...prev, currentAge: Number(e.target.value) || 0 }))}
                        className="apple-input text-base h-12 w-full"
                        data-testid="comparison-current-age"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Renteneintrittsalter</label>
                      <input
                        type="number"
                        placeholder="67"
                        value={comparisonParams.retirementAge}
                        onChange={(e) => setComparisonParams(prev => ({ ...prev, retirementAge: Number(e.target.value) || 0 }))}
                        className="apple-input text-base h-12 w-full"
                        data-testid="comparison-retirement-age"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Monatlicher Beitrag</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="500"
                          value={comparisonParams.monthlyContribution}
                          onChange={(e) => setComparisonParams(prev => ({ ...prev, monthlyContribution: Number(e.target.value) || 0 }))}
                          className="apple-input text-base h-12 pr-8 w-full"
                          data-testid="comparison-monthly-contribution"
                        />
                        <span className="absolute right-3 top-3 text-sm text-muted-foreground">€</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Jahreseinkommen</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="60000"
                          value={comparisonParams.annualIncome}
                          onChange={(e) => setComparisonParams(prev => ({ ...prev, annualIncome: Number(e.target.value) || 0 }))}
                          className="apple-input text-base h-12 pr-8 w-full"
                          data-testid="comparison-annual-income"
                        />
                        <span className="absolute right-3 top-3 text-sm text-muted-foreground">€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Results */}
              <div className="grid gap-8 lg:grid-cols-3 mb-8">
                {/* Private Rente */}
                <div className="apple-card p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                      <div className="text-white font-bold text-sm">PR</div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary">Private Rente</h3>
                      <p className="text-xs text-primary/70">Fondsgebundene Rentenversicherung</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          {editableValues.monthlyPension.isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={tempEditValues.monthlyPension}
                                onChange={(e) => handleEditValueChange('monthlyPension', e.target.value)}
                                className="text-2xl font-bold text-primary bg-transparent border-b-2 border-primary w-24 focus:outline-none"
                                autoFocus
                              />
                              <span className="text-2xl font-bold text-primary">€</span>
                            </div>
                          ) : (
                            <div className="text-2xl font-bold text-primary mb-1">
                              €{editableValues.monthlyPension.value.toLocaleString()}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground">Monatliche Rente ab 67</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {editableValues.monthlyPension.isEditing ? (
                            <>
                              <button 
                                onClick={() => handleEditSave('monthlyPension')}
                                className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors group"
                              >
                                <Check className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                              </button>
                              <button 
                                onClick={() => handleEditCancel('monthlyPension')}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                              >
                                <X className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => handleEditStart('monthlyPension')}
                              className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors group"
                            >
                              <Settings className="w-4 h-4 text-primary/60 group-hover:text-primary" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Eingezahlt gesamt:</span>
                        <span className="text-sm font-medium">€192.000</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Ablaufleistung:</span>
                        <div className="flex items-center space-x-2">
                          {editableValues.finalPayout.isEditing ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium">€</span>
                              <input
                                type="number"
                                value={tempEditValues.finalPayout}
                                onChange={(e) => handleEditValueChange('finalPayout', e.target.value)}
                                className="text-sm font-medium bg-transparent border-b border-primary w-20 focus:outline-none"
                                autoFocus
                              />
                              <button 
                                onClick={() => handleEditSave('finalPayout')}
                                className="p-0.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors group"
                              >
                                <Check className="w-3 h-3 text-green-600 group-hover:text-green-700" />
                              </button>
                              <button 
                                onClick={() => handleEditCancel('finalPayout')}
                                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors group"
                              >
                                <X className="w-3 h-3 text-red-600 group-hover:text-red-700" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium">€{editableValues.finalPayout.value.toLocaleString()}</span>
                              <button 
                                onClick={() => handleEditStart('finalPayout')}
                                className="p-1 hover:bg-primary/10 rounded transition-colors group"
                              >
                                <Settings className="w-3 h-3 text-primary/60 group-hover:text-primary" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Gesamtkosten:</span>
                        <div className="flex items-center space-x-2">
                          {editableValues.totalCosts.isEditing ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium text-red-600">€</span>
                              <input
                                type="number"
                                value={tempEditValues.totalCosts}
                                onChange={(e) => handleEditValueChange('totalCosts', e.target.value)}
                                className="text-sm font-medium text-red-600 bg-transparent border-b border-red-600 w-20 focus:outline-none"
                                autoFocus
                              />
                              <button 
                                onClick={() => handleEditSave('totalCosts')}
                                className="p-0.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors group"
                              >
                                <Check className="w-3 h-3 text-green-600 group-hover:text-green-700" />
                              </button>
                              <button 
                                onClick={() => handleEditCancel('totalCosts')}
                                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors group"
                              >
                                <X className="w-3 h-3 text-red-600 group-hover:text-red-700" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-red-600">€{editableValues.totalCosts.value.toLocaleString()}</span>
                              <button 
                                onClick={() => handleEditStart('totalCosts')}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors group"
                              >
                                <Settings className="w-3 h-3 text-red-600/60 group-hover:text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Effektive Rendite:</span>
                        <div className="flex items-center space-x-2">
                          {editableValues.effectiveReturn.isEditing ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                value={tempEditValues.effectiveReturn}
                                onChange={(e) => handleEditValueChange('effectiveReturn', e.target.value)}
                                className="text-sm font-medium text-green-600 bg-transparent border-b border-green-600 w-16 focus:outline-none"
                                autoFocus
                                step="0.1"
                              />
                              <span className="text-sm font-medium text-green-600">% p.a.</span>
                              <button 
                                onClick={() => handleEditSave('effectiveReturn')}
                                className="p-0.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors group"
                              >
                                <Check className="w-3 h-3 text-green-600 group-hover:text-green-700" />
                              </button>
                              <button 
                                onClick={() => handleEditCancel('effectiveReturn')}
                                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors group"
                              >
                                <X className="w-3 h-3 text-red-600 group-hover:text-red-700" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-green-600">{editableValues.effectiveReturn.value}% p.a.</span>
                              <button 
                                onClick={() => handleEditStart('effectiveReturn')}
                                className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors group"
                              >
                                <Settings className="w-3 h-3 text-green-600/60 group-hover:text-green-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                {/* ETF Sparplan */}
                <div className="apple-card p-6 border-2 border-chart-2/30 bg-gradient-to-br from-chart-2/5 to-chart-2/10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-chart-2 rounded-xl flex items-center justify-center">
                      <div className="text-white font-bold text-sm">ETF</div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-chart-2">ETF Sparplan</h3>
                      <p className="text-xs text-chart-2/70">Direktanlage in Indexfonds</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                      <div className="text-2xl font-bold text-chart-2 mb-1">€1.389</div>
                      <div className="text-sm text-muted-foreground">Entnahme ab 67 (4% Regel)</div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Eingezahlt gesamt:</span>
                        <span className="text-sm font-medium">€192.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Depotwert:</span>
                        <span className="text-sm font-medium">€417.360</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Gesamtkosten:</span>
                        <span className="text-sm font-medium text-red-600">€3.339</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Brutto-Rendite:</span>
                        <span className="text-sm font-medium text-green-600">6.5% p.a.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Chart */}
              <div className="apple-card p-8 mb-8">
                <h3 className="text-xl font-semibold text-foreground mb-6">Vermögensentwicklung im Vergleich</h3>
                <div className="h-96">
                  <PensionChart
                    data={[
                      { age: 35, year: 2024, month: 0, portfolioValue: 0, contribution: 0, fees: 0, taxes: 0, isPayoutPhase: false },
                      { age: 45, year: 2034, month: 0, portfolioValue: 75000, contribution: 60000, fees: 0, taxes: 0, isPayoutPhase: false },
                      { age: 55, year: 2044, month: 0, portfolioValue: 180000, contribution: 120000, fees: 0, taxes: 0, isPayoutPhase: false },
                      { age: 65, year: 2054, month: 0, portfolioValue: 350000, contribution: 180000, fees: 0, taxes: 0, isPayoutPhase: false },
                      { age: 67, year: 2056, month: 0, portfolioValue: 387500, contribution: 192000, fees: 0, taxes: 0, isPayoutPhase: true, payout: 1500 },
                      { age: 75, year: 2064, month: 0, portfolioValue: 320000, contribution: 192000, fees: 0, taxes: 0, isPayoutPhase: true, payout: 1500 },
                      { age: 85, year: 2074, month: 0, portfolioValue: 180000, contribution: 192000, fees: 0, taxes: 0, isPayoutPhase: true, payout: 1500 }
                    ]}
                    type="line"
                    height={350}
                    showReferenceLine={true}
                    retirementAge={67}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Cost Analysis */}
                <div className="apple-card p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Kostenvergleich</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <span className="text-sm font-medium">Private Rente - Gesamtkosten</span>
                      <span className="text-sm font-bold text-red-600">€23.100</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm font-medium">ETF Sparplan - Gesamtkosten</span>
                      <span className="text-sm font-bold text-green-600">€3.339</span>
                    </div>
                  </div>
                </div>

                {/* Tax Analysis */}
                <div className="apple-card p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Steueranalyse</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-sm font-medium">Private Rente - Steuerersparnis</span>
                      <span className="text-sm font-bold text-blue-600">€0</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <span className="text-sm font-medium">ETF Sparplan - Vorabpauschale</span>
                      <span className="text-sm font-bold text-yellow-600">€2.880</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Section */}
              <div className="apple-card p-6 mt-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Vergleichsergebnisse exportieren</h3>
                    <p className="text-sm text-muted-foreground">Laden Sie eine detaillierte Analyse als PDF herunter</p>
                  </div>
                  <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all duration-200">
                    📄 PDF Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "custom-comparison" && (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="animate-slide-in-up">
              {/* Custom Comparison Tool Header */}
              <div className="apple-card p-8 mb-8">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <div className="text-white font-bold text-xl">⚖️</div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">
                      Benutzerdefinierter Fondsvergleich
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                      Vergleichen Sie zwei fondsgebundene Rentenversicherungen Ihrer Wahl
                    </p>
                  </div>
                </div>

                {/* General Parameters */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/30 mb-8">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">Allgemeine Parameter</h3>
                  <div className="grid gap-6 lg:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Aktuelles Alter</label>
                      <input
                        type="number"
                        placeholder="35"
                        defaultValue="35"
                        className="apple-input text-base h-12 w-full"
                        data-testid="input-current-age"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Renteneintrittsalter</label>
                      <input
                        type="number"
                        placeholder="67"
                        defaultValue="67"
                        className="apple-input text-base h-12 w-full"
                        data-testid="input-retirement-age"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Monatlicher Beitrag</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="500"
                          defaultValue="500"
                          className="apple-input text-base h-12 pr-8 w-full"
                          data-testid="input-monthly-contribution"
                        />
                        <span className="absolute right-3 top-3 text-sm text-muted-foreground">€</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Einmalzahlung</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="10000"
                          defaultValue="0"
                          className="apple-input text-base h-12 pr-8 w-full"
                          data-testid="input-lump-sum"
                        />
                        <span className="absolute right-3 top-3 text-sm text-muted-foreground">€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Fund Comparison Forms */}
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Fund A */}
                <div className="apple-card p-6 border-2 border-green-200 dark:border-green-700/30 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                      <div className="text-white font-bold text-sm">A</div>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="z.B. Debeka BR 25"
                        className="apple-input text-lg font-bold border-0 bg-transparent p-0 h-auto focus:ring-0 placeholder:text-green-600/60 text-green-800 dark:text-green-200"
                        data-testid="input-fund-a-name"
                      />
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Anbieter & Produktname eingeben
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Performance */}
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">Performance & Strategie</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-green-700 dark:text-green-300">Erwartete Performance p.a.</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="6.5"
                              className="apple-input text-sm h-10 pr-8 w-full"
                              data-testid="input-fund-a-performance"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-green-700 dark:text-green-300">Volatilität p.a.</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="15.2"
                              className="apple-input text-sm h-10 pr-8 w-full"
                              data-testid="input-fund-a-volatility"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-xs font-medium text-green-700 dark:text-green-300">Anlagestrategie</label>
                          <select className="apple-input text-sm h-10 w-full" data-testid="select-fund-a-strategy">
                            <option value="">Strategie wählen</option>
                            <option value="balanced">Ausgewogen (50/50 Aktien/Anleihen)</option>
                            <option value="growth">Wachstum (80/20 Aktien/Anleihen)</option>
                            <option value="conservative">Konservativ (30/70 Aktien/Anleihen)</option>
                            <option value="aggressive">Aggressiv (95/5 Aktien/Anleihen)</option>
                            <option value="custom">Individuell</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Costs */}
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">Kostenstruktur</h4>
                      <div className="space-y-3">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-green-700 dark:text-green-300">Abschlusskosten</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="2.5"
                                className="apple-input text-sm h-10 pr-8 w-full"
                                data-testid="input-fund-a-setup-costs"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-green-700 dark:text-green-300">Verteilung über</label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="5"
                                className="apple-input text-sm h-10 pr-12 w-full"
                                data-testid="input-fund-a-setup-years"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">Jahre</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-green-700 dark:text-green-300">Verwaltungskosten p.a.</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.8"
                                className="apple-input text-sm h-10 pr-8 w-full"
                                data-testid="input-fund-a-admin-costs"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-green-700 dark:text-green-300">Fondskosten (TER) p.a.</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.4"
                                className="apple-input text-sm h-10 pr-8 w-full"
                                data-testid="input-fund-a-ter"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-green-700 dark:text-green-300">Zusatzkosten p.a.</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.0"
                                className="apple-input text-sm h-10 pr-8 w-full"
                                data-testid="input-fund-a-extra-costs"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">Zusätzliche Features</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-green-700 dark:text-green-300">Garantierter Rentenfaktor</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="28.5"
                              className="apple-input text-sm h-10 pr-8 w-full"
                              data-testid="input-fund-a-pension-factor"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">€</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-green-700 dark:text-green-300">Beitragsgarantie</label>
                          <div className="relative">
                            <input
                              type="number"
                              placeholder="80"
                              className="apple-input text-sm h-10 pr-8 w-full"
                              data-testid="input-fund-a-guarantee"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-xs font-medium text-green-700 dark:text-green-300">Besonderheiten</label>
                          <div className="flex flex-wrap gap-2">
                            <label className="flex items-center space-x-2 text-xs">
                              <input type="checkbox" className="rounded border-green-300" data-testid="check-fund-a-flexible" />
                              <span>Flexible Beitragsanpassung</span>
                            </label>
                            <label className="flex items-center space-x-2 text-xs">
                              <input type="checkbox" className="rounded border-green-300" data-testid="check-fund-a-pause" />
                              <span>Beitragspausen möglich</span>
                            </label>
                            <label className="flex items-center space-x-2 text-xs">
                              <input type="checkbox" className="rounded border-green-300" data-testid="check-fund-a-additional" />
                              <span>Zuzahlungen möglich</span>
                            </label>
                            <label className="flex items-center space-x-2 text-xs">
                              <input type="checkbox" className="rounded border-green-300" data-testid="check-fund-a-online" />
                              <span>Online-Verwaltung</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fund B */}
                <div className="apple-card p-6 border-2 border-blue-200 dark:border-blue-700/30 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                      <div className="text-white font-bold text-sm">B</div>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="z.B. Allianz PrivatRente InvestFlex"
                        className="apple-input text-lg font-bold border-0 bg-transparent p-0 h-auto focus:ring-0 placeholder:text-blue-600/60 text-blue-800 dark:text-blue-200"
                        data-testid="input-fund-b-name"
                      />
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Anbieter & Produktname eingeben
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Performance */}
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Performance & Strategie</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Erwartete Performance p.a.</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="5.8"
                              className="apple-input text-sm h-10 pr-8 w-full"
                              data-testid="input-fund-b-performance"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Volatilität p.a.</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="13.8"
                              className="apple-input text-sm h-10 pr-8 w-full"
                              data-testid="input-fund-b-volatility"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Anlagestrategie</label>
                          <select className="apple-input text-sm h-10 w-full" data-testid="select-fund-b-strategy">
                            <option value="">Strategie wählen</option>
                            <option value="balanced">Ausgewogen (50/50 Aktien/Anleihen)</option>
                            <option value="growth">Wachstum (80/20 Aktien/Anleihen)</option>
                            <option value="conservative">Konservativ (30/70 Aktien/Anleihen)</option>
                            <option value="aggressive">Aggressiv (95/5 Aktien/Anleihen)</option>
                            <option value="custom">Individuell</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Costs */}
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Kostenstruktur</h4>
                      <div className="space-y-3">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Abschlusskosten</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="4.0"
                                className="apple-input text-sm h-10 pr-8 w-full"
                                data-testid="input-fund-b-setup-costs"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Verteilung über</label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="5"
                                className="apple-input text-sm h-10 pr-12 w-full"
                                data-testid="input-fund-b-setup-years"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">Jahre</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Verwaltungskosten p.a.</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="1.0"
                                className="apple-input text-sm h-10 pr-8 w-full"
                                data-testid="input-fund-b-admin-costs"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Fondskosten (TER) p.a.</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.6"
                                className="apple-input text-sm h-10 pr-8 w-full"
                                data-testid="input-fund-b-ter"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Zusatzkosten p.a.</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.1"
                                className="apple-input text-sm h-10 pr-8 w-full"
                                data-testid="input-fund-b-extra-costs"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Zusätzliche Features</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Garantierter Rentenfaktor</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="26.8"
                              className="apple-input text-sm h-10 pr-8 w-full"
                              data-testid="input-fund-b-pension-factor"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">€</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Beitragsgarantie</label>
                          <div className="relative">
                            <input
                              type="number"
                              placeholder="90"
                              className="apple-input text-sm h-10 pr-8 w-full"
                              data-testid="input-fund-b-guarantee"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Besonderheiten</label>
                          <div className="flex flex-wrap gap-2">
                            <label className="flex items-center space-x-2 text-xs">
                              <input type="checkbox" className="rounded border-blue-300" data-testid="check-fund-b-flexible" />
                              <span>Flexible Beitragsanpassung</span>
                            </label>
                            <label className="flex items-center space-x-2 text-xs">
                              <input type="checkbox" className="rounded border-blue-300" data-testid="check-fund-b-pause" />
                              <span>Beitragspausen möglich</span>
                            </label>
                            <label className="flex items-center space-x-2 text-xs">
                              <input type="checkbox" className="rounded border-blue-300" data-testid="check-fund-b-additional" />
                              <span>Zuzahlungen möglich</span>
                            </label>
                            <label className="flex items-center space-x-2 text-xs">
                              <input type="checkbox" className="rounded border-blue-300" data-testid="check-fund-b-online" />
                              <span>Online-Verwaltung</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculate Button */}
              <div className="mt-8 text-center">
                <button 
                  className="px-12 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  data-testid="button-calculate-comparison"
                >
                  Vergleich berechnen 📊
                </button>
              </div>

              {/* Results Section - Initially Hidden */}
              <div className="mt-8 space-y-8" style={{display: 'block'}}> 
                {/* Side-by-Side Results */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Fund A Results */}
                  <div className="apple-card p-6 border-2 border-green-200 dark:border-green-700/30 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                        <div className="text-white font-bold text-sm">A</div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                          Fonds A Ergebnisse
                        </h3>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Beispielberechnung: 500€/Monat, 32 Jahre
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">Projizierte Ergebnisse</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Eingezahlte Beiträge:</span>
                            <span className="font-bold">€192.000</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Kapital mit 67:</span>
                            <span className="font-bold text-green-700 dark:text-green-300">€418.200</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Garantiertes Kapital:</span>
                            <span className="font-bold text-green-600">€153.600</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Monatliche Rente:</span>
                            <span className="font-bold text-green-700 dark:text-green-300">€1.719/Monat</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Gesamtkosten:</span>
                            <span className="font-bold text-green-600">€23.100 (1.2%)</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">Bewertung</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Kosten-Effizienz:</span>
                            <div className="flex">
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Flexibilität:</span>
                            <div className="flex">
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-gray-300 rounded"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Renditechance:</span>
                            <div className="flex">
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fund B Results */}
                  <div className="apple-card p-6 border-2 border-blue-200 dark:border-blue-700/30 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                        <div className="text-white font-bold text-sm">B</div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">
                          Fonds B Ergebnisse
                        </h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Beispielberechnung: 500€/Monat, 32 Jahre
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Projizierte Ergebnisse</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Eingezahlte Beiträge:</span>
                            <span className="font-bold">€192.000</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Kapital mit 67:</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">€372.800</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Garantiertes Kapital:</span>
                            <span className="font-bold text-blue-600">€172.800</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Monatliche Rente:</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">€1.537/Monat</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Gesamtkosten:</span>
                            <span className="font-bold text-orange-600">€32.600 (1.7%)</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Bewertung</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Kosten-Effizienz:</span>
                            <div className="flex">
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-gray-300 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-gray-300 rounded"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Flexibilität:</span>
                            <div className="flex">
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Renditechance:</span>
                            <div className="flex">
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <div className="w-3 h-3 bg-gray-300 rounded"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparison Chart */}
                <div className="apple-card p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground tracking-tight">
                      Kapitalentwicklung im Vergleich
                    </h3>
                  </div>
                  
                  <div className="h-80 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-6">
                    <PensionChart 
                      data={[
                        {year: 2024, month: 0, age: 35, portfolioValue: 0, contribution: 0, fees: 0, taxes: 0, isPayoutPhase: false},
                        {year: 2030, month: 0, age: 41, portfolioValue: 45000, contribution: 36000, fees: 1800, taxes: 0, isPayoutPhase: false},
                        {year: 2035, month: 0, age: 46, portfolioValue: 98000, contribution: 66000, fees: 3500, taxes: 0, isPayoutPhase: false},
                        {year: 2040, month: 0, age: 51, portfolioValue: 168000, contribution: 96000, fees: 5800, taxes: 0, isPayoutPhase: false},
                        {year: 2045, month: 0, age: 56, portfolioValue: 260000, contribution: 126000, fees: 8800, taxes: 0, isPayoutPhase: false},
                        {year: 2050, month: 0, age: 61, portfolioValue: 380000, contribution: 156000, fees: 12500, taxes: 0, isPayoutPhase: false},
                        {year: 2055, month: 0, age: 66, portfolioValue: 535000, contribution: 186000, fees: 17200, taxes: 0, isPayoutPhase: false},
                        {year: 2056, month: 0, age: 67, portfolioValue: 570000, contribution: 192000, fees: 18500, taxes: 0, isPayoutPhase: false}
                      ]}
                      height={280}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="apple-card p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-success rounded-sm"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground tracking-tight">
                      Vergleichsauswertung
                    </h3>
                  </div>
                  
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-700/30">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-4">
                          🏆 Fonds A ist vorteilhafter
                        </h4>
                        <ul className="text-sm text-green-700 dark:text-green-300 space-y-2">
                          <li>• <strong>€45.400 mehr Kapital</strong> bei Rentenbeginn</li>
                          <li>• <strong>€182/Monat höhere Rente</strong> lebenslang</li>
                          <li>• <strong>30% niedrigere Gesamtkosten</strong> über die Laufzeit</li>
                          <li>• Bessere Performance bei gleicher Sicherheit</li>
                        </ul>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700/30">
                        <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-4">
                          ⚠️ Wichtige Überlegungen
                        </h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>• Garantieleistungen vergleichen</li>
                          <li>• Servicequalität berücksichtigen</li>
                          <li>• Unternehmensstabilität prüfen</li>
                          <li>• Flexibilität bei Änderungen</li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700/30">
                        <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-4">
                          📊 Kostenvergleich Details
                        </h4>
                        <div className="space-y-3 text-sm text-purple-700 dark:text-purple-300">
                          <div className="flex justify-between">
                            <span>Kostendifferenz gesamt:</span>
                            <span className="font-bold">€9.500</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Zusätzliche Rendite A:</span>
                            <span className="font-bold">0.7% p.a.</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kostenquote A:</span>
                            <span className="font-bold">1.2% p.a.</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kostenquote B:</span>
                            <span className="font-bold">1.7% p.a.</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/30">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-4">
                          💡 Handlungsempfehlung
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Wählen Sie Fonds A</strong>, wenn Sie Wert auf niedrige Kosten und höhere Renditen legen. 
                          <strong>Wählen Sie Fonds B</strong>, wenn höhere Garantien wichtiger sind als Renditechancen.
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 mt-6">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">
                          ⚖️ Haftungsausschluss
                        </h4>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                          <p><strong>Berechnungsgrundlagen:</strong> Alle Berechnungen basieren auf vereinfachten Modellen und aktuellen Steuergesetzen (Stand 2024). Änderungen der Gesetzeslage sind möglich.</p>
                          <p><strong>Produktspezifische Unterschiede:</strong> Tatsächliche Produkte können abweichende Konditionen, Garantien und Kostenstrukturen aufweisen.</p>
                          <p><strong>Marktrisiken:</strong> Fondsrenditen unterliegen Marktschwankungen. Historische Renditen sind keine Garantie für zukünftige Entwicklungen.</p>
                          <p><strong>Inflationsannahme:</strong> Berechnungen verwenden eine Inflationsrate von 2,5% p.a. (EZB-Ziel). Tatsächliche Inflation kann abweichen.</p>
                          <p><strong>Steuerliche Behandlung:</strong> Individuelle steuerliche Situation kann von den Annahmen abweichen. Konsultieren Sie einen Steuerberater.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Safe Area */}
      <div className="h-safe-area-inset-bottom bg-background"></div>
    </div>
  </PageTransition>
</ErrorBoundary>
);
}

export default memo(Home);
