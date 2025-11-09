import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  BarChart3,
  DollarSign,
  PieChart,
  ArrowRight,
  Sparkles,
  Target,
  TrendingDown,
  Clock,
  Shield,
  Zap,
  Award,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/stores/onboardingStore';

interface PremiumDashboardProps {
  language?: 'de' | 'en';
}

export const PremiumDashboard: React.FC<PremiumDashboardProps> = ({ language = 'de' }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  // Fetch onboarding data from store
  const onboardingData = useOnboardingStore((state) => state.data);
  const isCompleted = useOnboardingStore((state) => state.isCompleted);

  const texts = {
    de: {
      welcome: 'Willkommen zurück',
      subtitle: 'Ihre finanzielle Zukunft im Überblick',
      quickActions: 'Schnellzugriff',
      calculator: 'Rente berechnen',
      calculatorDesc: 'Berechnen Sie Ihre zukünftige Altersvorsorge',
      comparison: 'Produkte vergleichen',
      comparisonDesc: 'Vergleichen Sie verschiedene Vorsorgemodelle',
      funds: 'Fonds analysieren',
      fundsDesc: 'Analysieren Sie Fondsperformance und Renditen',
      taxCalculator: 'Steuern berechnen',
      taxCalculatorDesc: 'Berechnen Sie Ihre Steuerbelastung',
      insights: 'Ihre Übersicht',
      currentSavings: 'Aktuelle Ersparnisse',
      projectedRetirement: 'Prognostizierte Rente',
      monthlyContribution: 'Monatliche Einzahlung',
      yearsUntilRetirement: 'Jahre bis Rente',
      features: 'Premium Features',
      secureData: 'Sichere Daten',
      secureDataDesc: 'Ihre Daten sind verschlüsselt und geschützt',
      instantCalc: 'Sofort-Berechnung',
      instantCalcDesc: 'Ergebnisse in Echtzeit',
      expertAdvice: 'Expertenrat',
      expertAdviceDesc: 'Professionelle Finanzberatung',
      getStarted: 'Jetzt starten',
      recentActivity: 'Kürzliche Aktivitäten',
      noActivity: 'Noch keine Aktivitäten',
    },
    en: {
      welcome: 'Welcome back',
      subtitle: 'Your financial future at a glance',
      quickActions: 'Quick Actions',
      calculator: 'Calculate Pension',
      calculatorDesc: 'Calculate your future retirement savings',
      comparison: 'Compare Products',
      comparisonDesc: 'Compare different pension models',
      funds: 'Analyze Funds',
      fundsDesc: 'Analyze fund performance and returns',
      taxCalculator: 'Calculate Taxes',
      taxCalculatorDesc: 'Calculate your tax burden',
      insights: 'Your Overview',
      currentSavings: 'Current Savings',
      projectedRetirement: 'Projected Pension',
      monthlyContribution: 'Monthly Contribution',
      yearsUntilRetirement: 'Years to Retirement',
      features: 'Premium Features',
      secureData: 'Secure Data',
      secureDataDesc: 'Your data is encrypted and protected',
      instantCalc: 'Instant Calculation',
      instantCalcDesc: 'Real-time results',
      expertAdvice: 'Expert Advice',
      expertAdviceDesc: 'Professional financial consulting',
      getStarted: 'Get Started',
      recentActivity: 'Recent Activity',
      noActivity: 'No recent activity',
    },
  };

  const t = texts[language];

  const quickActions = [
    {
      id: 'calculator',
      title: t.calculator,
      description: t.calculatorDesc,
      icon: Calculator,
      href: '/calculator',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/5',
    },
    {
      id: 'comparison',
      title: t.comparison,
      description: t.comparisonDesc,
      icon: BarChart3,
      href: '/vergleich',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-500/10 to-purple-600/5',
    },
    {
      id: 'funds',
      title: t.funds,
      description: t.fundsDesc,
      icon: TrendingUp,
      href: '/fonds',
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-500/10 to-green-600/5',
    },
    {
      id: 'tax',
      title: t.taxCalculator,
      description: t.taxCalculatorDesc,
      icon: DollarSign,
      href: '/tax-calculator',
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-500/10 to-orange-600/5',
    },
  ];

  // Calculate KPIs from onboarding data
  const kpis = useMemo(() => {
    // Calculate total current savings/assets
    const lifeInsuranceValue = onboardingData.lifeInsurance?.sum || 0;
    const fundsValue = onboardingData.funds?.balance || 0;
    const savingsValue = onboardingData.savings?.balance || 0;
    const totalSavings = lifeInsuranceValue + fundsValue + savingsValue;

    // Calculate monthly contributions
    const privatePensionContrib = onboardingData.privatePension?.contribution || 0;
    const riesterContrib = onboardingData.riester?.amount || 0;
    const ruerupContrib = onboardingData.ruerup?.amount || 0;
    const occupationalContrib = onboardingData.occupationalPension?.amount || 0;
    const totalMonthlyContrib = privatePensionContrib + riesterContrib + ruerupContrib + occupationalContrib;

    // Calculate projected retirement income from statutory pensions
    const publicPension = onboardingData.pensions?.public67 || 0;
    const civilPension = onboardingData.pensions?.civil67 || 0;
    const professionPension = onboardingData.pensions?.profession67 || 0;
    const zvkVblPension = onboardingData.pensions?.zvkVbl67 || 0;

    // Project pension from contributions (simplified calculation)
    // Assumes contributions continue until retirement with 4% average return
    // and converts accumulated capital to monthly pension using 4% withdrawal rate
    const yearsToRetirement = birthYear ? 67 - (currentYear - birthYear) : 30;
    const estimatedPensionFromContributions = (monthlyContribution: number, years: number): number => {
      if (monthlyContribution === 0 || years <= 0) return 0;
      const annualReturn = 0.04; // 4% average return
      const monthlyReturn = annualReturn / 12;
      const months = years * 12;

      // Future value of monthly contributions (annuity formula)
      const futureValue = monthlyContribution * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);

      // Convert to monthly pension (4% withdrawal rate)
      const monthlyPension = (futureValue * 0.04) / 12;
      return monthlyPension;
    };

    // Calculate estimated pensions from each contribution type
    const privatePensionEstimated = estimatedPensionFromContributions(privatePensionContrib, yearsToRetirement);
    const riesterPensionEstimated = estimatedPensionFromContributions(riesterContrib, yearsToRetirement);
    const ruerupPensionEstimated = estimatedPensionFromContributions(ruerupContrib, yearsToRetirement);
    const occupationalPensionEstimated = estimatedPensionFromContributions(occupationalContrib, yearsToRetirement);

    // Total projected pension includes both statutory pensions and estimated pensions from contributions
    const totalProjectedPension = publicPension + civilPension + professionPension + zvkVblPension +
                                   privatePensionEstimated + riesterPensionEstimated +
                                   ruerupPensionEstimated + occupationalPensionEstimated;

    // Calculate retirement year for display
    const retirementYear = birthYear ? birthYear + 67 : currentYear;

    // Format currency
    const formatCurrency = (value: number) => {
      if (value === 0) return language === 'de' ? 'Nicht angegeben' : 'Not specified';
      return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value);
    };

    return [
      {
        label: t.currentSavings,
        value: formatCurrency(totalSavings),
        change: isCompleted ? '+12.5%' : (language === 'de' ? 'Onboarding abschließen' : 'Complete onboarding'),
        trend: totalSavings > 0 ? 'up' as const : 'neutral' as const,
        icon: PieChart,
        color: 'from-blue-500 to-blue-600',
      },
      {
        label: t.projectedRetirement,
        value: formatCurrency(totalProjectedPension),
        change: language === 'de' ? 'pro Monat' : 'per month',
        trend: totalProjectedPension > 0 ? 'up' as const : 'neutral' as const,
        icon: Target,
        color: 'from-green-500 to-green-600',
      },
      {
        label: t.monthlyContribution,
        value: formatCurrency(totalMonthlyContrib),
        change: totalMonthlyContrib > 0 
          ? (language === 'de' ? `Aktiv: ${formatCurrency(totalMonthlyContrib)}` : `Active: ${formatCurrency(totalMonthlyContrib)}`)
          : (language === 'de' ? 'Keine Beiträge' : 'No contributions'),
        trend: 'neutral' as const,
        icon: TrendingUp,
        color: 'from-purple-500 to-purple-600',
      },
      {
        label: t.yearsUntilRetirement,
        value: yearsToRetirement > 0 ? yearsToRetirement.toString() : '-',
        change: yearsToRetirement > 0 
          ? (language === 'de' ? `Bis ${retirementYear}` : `Until ${retirementYear}`)
          : (language === 'de' ? 'Geburtsjahr angeben' : 'Enter birth year'),
        trend: 'neutral' as const,
        icon: Clock,
        color: 'from-orange-500 to-orange-600',
      },
    ];
  }, [onboardingData, isCompleted, language, t]);

  const features = [
    {
      icon: Shield,
      title: t.secureData,
      description: t.secureDataDesc,
    },
    {
      icon: Zap,
      title: t.instantCalc,
      description: t.instantCalcDesc,
    },
    {
      icon: Award,
      title: t.expertAdvice,
      description: t.expertAdviceDesc,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 pt-16 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>{language === 'de' ? 'Premium Finanzplanung' : 'Premium Financial Planning'}</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                {t.welcome}
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-success/5 rounded-full blur-3xl -z-10" />
      </section>

      <div className="container mx-auto px-4 lg:px-8 pb-20">
        {/* KPI Cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group"
                >
                  <Card className="kpi-card-premium group-hover:border-primary/30 transition-all duration-500 h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          "p-3 rounded-xl bg-gradient-to-r shadow-soft-lg",
                          kpi.color
                        )}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        {kpi.trend === 'up' && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-success bg-success-light px-2 py-1 rounded-full">
                            <TrendingUp className="h-3 w-3" />
                            {kpi.change}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                        <p className="stat-number">{kpi.value}</p>
                        {kpi.trend === 'neutral' && (
                          <p className="text-xs text-muted-foreground">{kpi.change}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-16"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t.quickActions}</h2>
              <p className="text-muted-foreground mt-2">
                {language === 'de' ? 'Starten Sie Ihre Finanzplanung' : 'Start your financial planning'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const isHovered = hoveredCard === action.id;

              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                >
                  <Link to={action.href}>
                    <motion.div
                      onHoverStart={() => setHoveredCard(action.id)}
                      onHoverEnd={() => setHoveredCard(null)}
                      whileHover={{ y: -8, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card className={cn(
                        "premium-card cursor-pointer group overflow-hidden h-full transition-all duration-500",
                        isHovered && "border-primary/40 shadow-soft-2xl"
                      )}>
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                          action.bgGradient
                        )} />
                        <CardHeader className="relative z-10 pb-4">
                          <div className="flex items-start justify-between">
                            <div className={cn(
                              "p-4 rounded-2xl bg-gradient-to-r shadow-soft-lg transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
                              action.gradient
                            )}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <motion.div
                              animate={{ x: isHovered ? 4 : 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                            </motion.div>
                          </div>
                          <CardTitle className="text-2xl mt-6 group-hover:text-primary transition-colors duration-300">
                            {action.title}
                          </CardTitle>
                          <CardDescription className="text-base mt-2">
                            {action.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-300">
                            <span>{t.getStarted}</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Premium Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">{t.features}</h2>
            <p className="text-muted-foreground text-lg">
              {language === 'de' ? 'Alles was Sie für Ihre Altersvorsorge brauchen' : 'Everything you need for your retirement planning'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 * index, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="glass-card text-center h-full">
                    <CardContent className="p-8">
                      <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <Card className="gradient-card text-center overflow-hidden">
            <CardContent className="p-12 md:p-16">
              <div className="max-w-2xl mx-auto space-y-6">
                <h2 className="text-4xl font-bold tracking-tight">
                  {language === 'de' ? 'Bereit für Ihre finanzielle Zukunft?' : 'Ready for your financial future?'}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {language === 'de'
                    ? 'Starten Sie jetzt mit der Planung Ihrer Altersvorsorge und sichern Sie sich eine sorgenfreie Zukunft.'
                    : 'Start planning your retirement now and secure a worry-free future.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link to="/calculator">
                    <Button size="lg" className="btn-premium-primary group">
                      {language === 'de' ? 'Jetzt berechnen' : 'Calculate Now'}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/vergleich">
                    <Button size="lg" variant="outline" className="btn-premium-secondary">
                      {language === 'de' ? 'Produkte vergleichen' : 'Compare Products'}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
};

export default PremiumDashboard;
