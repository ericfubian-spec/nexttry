import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Shield,
  AlertCircle,
  Check,
  X,
  Info,
  Calculator,
  Percent,
  Calendar,
  PieChart,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DebekaComparisonProps {
  language?: 'de' | 'en';
}

interface ComparisonInputs {
  currentAge: number;
  monthlyContribution: number;
  currentAssets: number;
  retirementAge: number;
}

export const DebekaComparison: React.FC<DebekaComparisonProps> = ({ language = 'de' }) => {
  const [inputs, setInputs] = useState<ComparisonInputs>({
    currentAge: 35,
    monthlyContribution: 300,
    currentAssets: 0,
    retirementAge: 67,
  });

  const [activeTab, setActiveTab] = useState('overview');

  const texts = {
    de: {
      title: 'Debeka vs ETF vs Klassische Rente',
      subtitle: 'Der ultimative Vergleich: Welche Altersvorsorge lohnt sich wirklich?',
      yourInputs: 'Ihre Eingaben',
      currentAge: 'Aktuelles Alter',
      monthlyContribution: 'Monatliche Sparrate',
      currentAssets: 'Aktuelles Vermögen',
      retirementAge: 'Gewünschtes Rentenalter',
      years: 'Jahre',
      overview: 'Übersicht',
      taxAdvantage: 'Steuervorteil',
      costs: 'Kostenvergleich',
      scenarios: 'Szenarien',
      debeka: 'Debeka Fondsgebundene Rente',
      etf: 'ETF Sparplan',
      klassisch: 'Klassische Rentenversicherung',
      finalCapital: 'Endkapital',
      monthlyPension: 'Monatliche Rente',
      totalContributions: 'Gesamteinzahlungen',
      taxSavings: 'Steuerersparnis',
      netReturn: 'Nettorendite',
      recommendation: 'Empfehlung',
      winner: 'Sieger',
      taxDuringGrowth: 'Steuer während Ansparphase',
      taxDuringPayout: 'Steuer während Rentenphase',
      ertragsanteil: 'Ertragsanteil',
      abgeltungssteuer: 'Abgeltungssteuer',
      guaranteedIncome: 'Garantierte Rente',
      flexibility: 'Flexibilität',
      lifetimeGuarantee: 'Lebenslange Zahlung',
    },
    en: {
      title: 'Debeka vs ETF vs Traditional Pension',
      subtitle: 'The ultimate comparison: Which retirement plan really pays off?',
      yourInputs: 'Your Inputs',
      currentAge: 'Current Age',
      monthlyContribution: 'Monthly Savings',
      currentAssets: 'Current Assets',
      retirementAge: 'Desired Retirement Age',
      years: 'Years',
      overview: 'Overview',
      taxAdvantage: 'Tax Advantage',
      costs: 'Cost Comparison',
      scenarios: 'Scenarios',
      debeka: 'Debeka Fund-Linked Pension',
      etf: 'ETF Savings Plan',
      klassisch: 'Traditional Pension Insurance',
      finalCapital: 'Final Capital',
      monthlyPension: 'Monthly Pension',
      totalContributions: 'Total Contributions',
      taxSavings: 'Tax Savings',
      netReturn: 'Net Return',
      recommendation: 'Recommendation',
      winner: 'Winner',
      taxDuringGrowth: 'Tax During Accumulation',
      taxDuringPayout: 'Tax During Payout',
      ertragsanteil: 'Ertragsanteil',
      abgeltungssteuer: 'Capital Gains Tax',
      guaranteedIncome: 'Guaranteed Pension',
      flexibility: 'Flexibility',
      lifetimeGuarantee: 'Lifetime Payments',
    },
  };

  const t = texts[language];

  // Calculate comprehensive comparison
  const comparison = useMemo(() => {
    const years = inputs.retirementAge - inputs.currentAge;
    const months = years * 12;
    const totalContributions = inputs.monthlyContribution * months + inputs.currentAssets;

    // DEBEKA FONDSGEBUNDENE RENTENVERSICHERUNG
    const debekaGrowthRate = 0.06; // 6% annual (Debeka Global Shares historical avg)
    const debekaCosts = 0.013; // 1.3% annual (TER + management)
    const debekaNetGrowth = debekaGrowthRate - debekaCosts;
    const debekaMonthlyReturn = debekaNetGrowth / 12;

    // Tax-free accumulation (thesaurification)
    const debekaFutureValue =
      inputs.currentAssets * Math.pow(1 + debekaNetGrowth, years) +
      inputs.monthlyContribution * ((Math.pow(1 + debekaMonthlyReturn, months) - 1) / debekaMonthlyReturn);

    // Ertragsanteil taxation (17% at age 67)
    const debekaErtragsanteil = 0.17; // 17% of pension is taxable
    const debekaGrossMonthlyPension = (debekaFutureValue * 0.04) / 12; // 4% withdrawal
    const debekaTaxableAmount = debekaGrossMonthlyPension * debekaErtragsanteil;
    const debekaTax = debekaTaxableAmount * 0.25; // Assuming 25% personal tax rate
    const debekaNetMonthlyPension = debekaGrossMonthlyPension - debekaTax;

    // ETF SPARPLAN
    const etfGrowthRate = 0.07; // 7% annual (MSCI World historical avg)
    const etfCosts = 0.003; // 0.3% annual TER
    const etfGrossReturn = etfGrowthRate - etfCosts;

    // CRITICAL: Annual capital gains tax during accumulation (Abgeltungssteuer 26.375%)
    const abgeltungssteuer = 0.26375;
    const etfAnnualGains = etfGrossReturn;
    const etfTaxOnGains = etfAnnualGains * abgeltungssteuer;
    const etfNetGrowth = etfGrossReturn - etfTaxOnGains; // ~5.17% net after annual taxes
    const etfMonthlyReturn = etfNetGrowth / 12;

    const etfFutureValue =
      inputs.currentAssets * Math.pow(1 + etfNetGrowth, years) +
      inputs.monthlyContribution * ((Math.pow(1 + etfMonthlyReturn, months) - 1) / etfMonthlyReturn);

    // No additional tax on withdrawal (already taxed annually)
    const etfNetMonthlyPension = (etfFutureValue * 0.04) / 12;

    // KLASSISCHE RENTENVERSICHERUNG
    const klassischGrowthRate = 0.02; // 2% annual (conservative guaranteed)
    const klassischCosts = 0.01; // 1.0% annual costs
    const klassischNetGrowth = klassischGrowthRate - klassischCosts;
    const klassischMonthlyReturn = klassischNetGrowth / 12;

    // Tax-free accumulation
    const klassischFutureValue =
      inputs.currentAssets * Math.pow(1 + klassischNetGrowth, years) +
      inputs.monthlyContribution * ((Math.pow(1 + klassischMonthlyReturn, months) - 1) / klassischMonthlyReturn);

    // Ertragsanteil taxation (same as Debeka)
    const klassischGrossMonthlyPension = (klassischFutureValue * 0.04) / 12;
    const klassischTaxableAmount = klassischGrossMonthlyPension * debekaErtragsanteil;
    const klassischTax = klassischTaxableAmount * 0.25;
    const klassischNetMonthlyPension = klassischGrossMonthlyPension - klassischTax;

    // Tax advantage calculation (Debeka vs ETF over entire lifetime)
    const retirementYears = 20; // Assume 20 years of retirement
    const debeka30YearTax = debekaTax * 12 * retirementYears;
    const etfTaxDuringAccumulation = inputs.monthlyContribution * 12 * years * etfTaxOnGains / etfGrossReturn;
    const totalEtfTax = etfTaxDuringAccumulation;
    const taxAdvantage = totalEtfTax - debeka30YearTax;

    return {
      debeka: {
        finalCapital: debekaFutureValue,
        monthlyPension: debekaNetMonthlyPension,
        grossMonthlyPension: debekaGrossMonthlyPension,
        totalTax: debeka30YearTax,
        netReturn: debekaNetGrowth * 100,
        taxRate: debekaErtragsanteil * 100,
      },
      etf: {
        finalCapital: etfFutureValue,
        monthlyPension: etfNetMonthlyPension,
        grossMonthlyPension: etfNetMonthlyPension,
        totalTax: totalEtfTax,
        netReturn: etfNetGrowth * 100,
        taxRate: abgeltungssteuer * 100,
      },
      klassisch: {
        finalCapital: klassischFutureValue,
        monthlyPension: klassischNetMonthlyPension,
        grossMonthlyPension: klassischGrossMonthlyPension,
        totalTax: klassischTax * 12 * retirementYears,
        netReturn: klassischNetGrowth * 100,
        taxRate: debekaErtragsanteil * 100,
      },
      taxAdvantage,
      totalContributions,
      years,
    };
  }, [inputs]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Comparison cards
  const ResultCard = ({
    title,
    data,
    color,
    winner = false,
  }: {
    title: string;
    data: any;
    color: string;
    winner?: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <Card className={cn(
        "premium-card h-full transition-all duration-300",
        winner && "border-2 border-primary shadow-soft-2xl"
      )}>
        {winner && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-1 text-sm font-bold">
              {t.winner}
            </Badge>
          </div>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg bg-gradient-to-r",
              color
            )}>
              <PieChart className="h-5 w-5 text-white" />
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t.finalCapital}</p>
              <p className="text-lg font-bold">{formatCurrency(data.finalCapital)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.monthlyPension}</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(data.monthlyPension)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.netReturn}</p>
              <p className="text-sm font-semibold">{data.netReturn.toFixed(2)}% p.a.</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.taxSavings}</p>
              <p className="text-sm font-semibold">{formatCurrency(data.totalTax)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Determine winner
  const winner = comparison.debeka.monthlyPension > comparison.etf.monthlyPension &&
                comparison.debeka.monthlyPension > comparison.klassisch.monthlyPension
    ? 'debeka'
    : comparison.etf.monthlyPension > comparison.klassisch.monthlyPension
    ? 'etf'
    : 'klassisch';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="container mx-auto px-4 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm">
              <Calculator className="h-4 w-4" />
              <span>{language === 'de' ? 'Steueroptimierter Vergleich' : 'Tax-Optimized Comparison'}</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                {t.title}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <Card className="premium-card sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  {t.yourInputs}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{t.currentAge}</Label>
                  <Input
                    type="number"
                    value={inputs.currentAge}
                    onChange={(e) => setInputs({ ...inputs, currentAge: Number(e.target.value) })}
                    min={18}
                    max={67}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.monthlyContribution}</Label>
                  <Input
                    type="number"
                    value={inputs.monthlyContribution}
                    onChange={(e) => setInputs({ ...inputs, monthlyContribution: Number(e.target.value) })}
                    min={0}
                  />
                  <Slider
                    value={[inputs.monthlyContribution]}
                    onValueChange={(vals) => setInputs({ ...inputs, monthlyContribution: vals[0] })}
                    min={0}
                    max={1000}
                    step={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.currentAssets}</Label>
                  <Input
                    type="number"
                    value={inputs.currentAssets}
                    onChange={(e) => setInputs({ ...inputs, currentAssets: Number(e.target.value) })}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.retirementAge}</Label>
                  <Input
                    type="number"
                    value={inputs.retirementAge}
                    onChange={(e) => setInputs({ ...inputs, retirementAge: Number(e.target.value) })}
                    min={inputs.currentAge + 1}
                    max={75}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>{comparison.years} {t.years}</strong> {language === 'de' ? 'bis Rente' : 'until retirement'}</p>
                    <p><strong>{formatCurrency(comparison.totalContributions)}</strong> {t.totalContributions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-3 space-y-8">
            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ResultCard
                title={t.debeka}
                data={comparison.debeka}
                color="from-blue-500 to-blue-600"
                winner={winner === 'debeka'}
              />
              <ResultCard
                title={t.etf}
                data={comparison.etf}
                color="from-green-500 to-green-600"
                winner={winner === 'etf'}
              />
              <ResultCard
                title={t.klassisch}
                data={comparison.klassisch}
                color="from-orange-500 to-orange-600"
                winner={winner === 'klassisch'}
              />
            </div>

            {/* Tax Advantage Alert */}
            {comparison.taxAdvantage > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          {language === 'de' ? '🎯 Debeka spart Ihnen' : '🎯 Debeka saves you'} {formatCurrency(comparison.taxAdvantage)} {language === 'de' ? 'an Steuern!' : 'in taxes!'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {language === 'de'
                            ? `Durch die steuerfreie Ansparphase und die Ertragsanteil-Besteuerung (nur 17% der Rente steuerpflichtig) sparen Sie über Ihre Lebenszeit ${formatCurrency(comparison.taxAdvantage)} im Vergleich zum ETF-Sparplan mit jährlicher Abgeltungssteuer (26,375%).`
                            : `Through tax-free accumulation and Ertragsanteil taxation (only 17% of pension taxable), you save ${formatCurrency(comparison.taxAdvantage)} over your lifetime compared to an ETF savings plan with annual capital gains tax (26.375%).`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Lifetime Guarantee Section */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {language === 'de' ? 'Lebenslange Absicherung' : 'Lifetime Security'}
                </CardTitle>
                <CardDescription>
                  {language === 'de'
                    ? 'Was passiert, wenn Sie 95 Jahre alt werden? Debeka garantiert lebenslange Zahlungen.'
                    : 'What happens if you live to 95? Debeka guarantees lifetime payments.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200/50">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="font-semibold text-lg mb-2">{t.debeka}</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p className="flex items-center gap-2 justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Lebenslange Rente garantiert' : 'Lifetime pension guaranteed'}
                      </p>
                      <p className="flex items-center gap-2 justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Auch bei 95+ Jahren' : 'Even at 95+ years'}
                      </p>
                      <p className="flex items-center gap-2 justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Kein Kapitalverzehr' : 'No capital depletion'}
                      </p>
                    </div>
                  </div>
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-200/50">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                    <h3 className="font-semibold text-lg mb-2">{t.etf}</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p className="flex items-center gap-2 justify-center">
                        <X className="h-4 w-4 text-red-600" />
                        {language === 'de' ? 'Keine Garantie' : 'No guarantee'}
                      </p>
                      <p className="flex items-center gap-2 justify-center">
                        <X className="h-4 w-4 text-red-600" />
                        {language === 'de' ? 'Kapital kann ausgehen' : 'Capital can run out'}
                      </p>
                      <p className="flex items-center gap-2 justify-center">
                        <X className="h-4 w-4 text-red-600" />
                        {language === 'de' ? 'Langlebigkeitsrisiko' : 'Longevity risk'}
                      </p>
                    </div>
                  </div>
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-200/50">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                    <h3 className="font-semibold text-lg mb-2">{t.klassisch}</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p className="flex items-center gap-2 justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Lebenslange Rente' : 'Lifetime pension'}
                      </p>
                      <p className="flex items-center gap-2 justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Volle Garantie' : 'Full guarantee'}
                      </p>
                      <p className="flex items-center gap-2 justify-center">
                        <X className="h-4 w-4 text-orange-600" />
                        {language === 'de' ? 'Niedrige Rendite' : 'Low returns'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-center">
                    <strong className="text-primary">
                      {language === 'de'
                        ? '💡 Debeka-Vorteil: Sie erhalten lebenslang '
                        : '💡 Debeka advantage: You receive '}
                    </strong>
                    {formatCurrency(comparison.debeka.monthlyPension)}
                    {language === 'de'
                      ? '/Monat - selbst wenn Sie 100 Jahre alt werden und Ihr Kapital längst aufgebraucht wäre!'
                      : '/month - even if you live to 100 and your capital would have run out!'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Flexibility Comparison */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {language === 'de' ? 'Flexibilität & Optionen' : 'Flexibility & Options'}
                </CardTitle>
                <CardDescription>
                  {language === 'de'
                    ? 'Vergleich der Gestaltungsmöglichkeiten und Flexibilität'
                    : 'Comparison of design options and flexibility'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">
                          {language === 'de' ? 'Merkmal' : 'Feature'}
                        </th>
                        <th className="text-center p-3 font-semibold">{t.debeka}</th>
                        <th className="text-center p-3 font-semibold">{t.etf}</th>
                        <th className="text-center p-3 font-semibold">{t.klassisch}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-accent/5">
                        <td className="p-3">{language === 'de' ? 'Auszahlungsoptionen' : 'Payout options'}</td>
                        <td className="text-center p-3">
                          <div className="flex flex-col items-center gap-1">
                            <Check className="h-5 w-5 text-green-600" />
                            <span className="text-xs text-muted-foreground">
                              {language === 'de' ? '4 Optionen' : '4 options'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <div className="flex flex-col items-center gap-1">
                            <Check className="h-5 w-5 text-green-600" />
                            <span className="text-xs text-muted-foreground">
                              {language === 'de' ? 'Unbegrenzt' : 'Unlimited'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <div className="flex flex-col items-center gap-1">
                            <X className="h-5 w-5 text-red-600" />
                            <span className="text-xs text-muted-foreground">
                              {language === 'de' ? 'Nur Rente' : 'Pension only'}
                            </span>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-accent/5">
                        <td className="p-3">{language === 'de' ? 'Vorzeitige Kündigung' : 'Early termination'}</td>
                        <td className="text-center p-3">
                          <Check className="h-5 w-5 text-orange-600" />
                          <span className="text-xs text-muted-foreground block">
                            {language === 'de' ? 'Mit Verlusten' : 'With losses'}
                          </span>
                        </td>
                        <td className="text-center p-3">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="text-xs text-muted-foreground block">
                            {language === 'de' ? 'Jederzeit' : 'Anytime'}
                          </span>
                        </td>
                        <td className="text-center p-3">
                          <Check className="h-5 w-5 text-orange-600" />
                          <span className="text-xs text-muted-foreground block">
                            {language === 'de' ? 'Mit Verlusten' : 'With losses'}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-accent/5">
                        <td className="p-3">{language === 'de' ? 'Fondswechsel möglich' : 'Fund switching possible'}</td>
                        <td className="text-center p-3"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                        <td className="text-center p-3"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                        <td className="text-center p-3"><X className="h-5 w-5 text-red-600 mx-auto" /></td>
                      </tr>
                      <tr className="border-b hover:bg-accent/5">
                        <td className="p-3">{language === 'de' ? 'Beitragspausen' : 'Contribution breaks'}</td>
                        <td className="text-center p-3"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                        <td className="text-center p-3"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                        <td className="text-center p-3"><Check className="h-5 w-5 text-orange-600 mx-auto" /></td>
                      </tr>
                      <tr className="hover:bg-accent/5">
                        <td className="p-3">{language === 'de' ? 'Vererbbarkeit' : 'Inheritability'}</td>
                        <td className="text-center p-3"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                        <td className="text-center p-3"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                        <td className="text-center p-3"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="gradient-card text-center">
                <CardContent className="p-8 md:p-12">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <h2 className="text-3xl md:text-4xl font-bold">
                      {language === 'de'
                        ? 'Überzeugt? Fordern Sie jetzt Ihr persönliches Angebot an!'
                        : 'Convinced? Request your personal offer now!'}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {language === 'de'
                        ? `Mit dem Debeka-Modell sparen Sie ${formatCurrency(comparison.taxAdvantage)} an Steuern und erhalten eine garantierte lebenslange Rente.`
                        : `With the Debeka model, you save ${formatCurrency(comparison.taxAdvantage)} in taxes and receive a guaranteed lifetime pension.`}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                      <Button size="lg" className="btn-premium-primary group">
                        <DollarSign className="mr-2 h-5 w-5" />
                        {language === 'de' ? 'Jetzt Angebot anfordern' : 'Request offer now'}
                      </Button>
                      <Button size="lg" variant="outline" className="btn-premium-secondary">
                        <Calculator className="mr-2 h-5 w-5" />
                        {language === 'de' ? 'Beratungstermin vereinbaren' : 'Schedule consultation'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'de'
                        ? '✓ Unverbindlich ✓ Kostenlos ✓ Individuelle Beratung'
                        : '✓ Non-binding ✓ Free ✓ Individual consultation'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebekaComparison;
