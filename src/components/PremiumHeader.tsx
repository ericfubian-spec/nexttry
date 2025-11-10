import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Menu,
  X,
  Calculator,
  BarChart3,
  TrendingUp,
  Home,
  DollarSign,
  ChevronRight,
  Sparkles,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumHeaderProps {
  language?: 'de' | 'en';
  onLanguageChange?: (lang: 'de' | 'en') => void;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export const PremiumHeader: React.FC<PremiumHeaderProps> = ({
  language = 'de',
  onLanguageChange,
  theme = 'light',
  onThemeChange,
}) => {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const texts = {
    de: {
      home: 'Dashboard',
      calculator: 'Rechner',
      comparison: 'Vergleich',
      debekaComparison: 'Debeka Vergleich',
      funds: 'Fonds',
      taxCalculator: 'Steuerrechner',
      menu: 'Menü',
      close: 'Schließen',
      brandName: 'AltersvorsorgePlus',
      brandTagline: 'Ihre Zukunft, optimal geplant',
      navigation: 'Navigation',
      navDescription: 'Navigieren Sie zu den verschiedenen Bereichen',
    },
    en: {
      home: 'Dashboard',
      calculator: 'Calculator',
      comparison: 'Comparison',
      debekaComparison: 'Debeka Comparison',
      funds: 'Funds',
      taxCalculator: 'Tax Calculator',
      menu: 'Menu',
      close: 'Close',
      brandName: 'RetirementPlus',
      brandTagline: 'Your future, optimally planned',
      navigation: 'Navigation',
      navDescription: 'Navigate to different sections',
    },
  };

  const t = texts[language];

  const navigation = [
    {
      name: t.home,
      href: '/',
      icon: Home,
      description: language === 'de' ? 'Übersicht & Schnellzugriff' : 'Overview & Quick Access',
    },
    {
      name: t.calculator,
      href: '/calculator',
      icon: Calculator,
      description: language === 'de' ? 'Rente berechnen' : 'Calculate pension',
    },
    {
      name: t.debekaComparison,
      href: '/debeka-vergleich',
      icon: Sparkles,
      description: language === 'de' ? 'Debeka vs ETF - Steuervorteil berechnen' : 'Debeka vs ETF - Calculate tax advantage',
      badge: language === 'de' ? 'Neu' : 'New',
    },
    {
      name: t.comparison,
      href: '/vergleich',
      icon: BarChart3,
      description: language === 'de' ? 'Produkte vergleichen' : 'Compare products',
    },
    {
      name: t.funds,
      href: '/fonds',
      icon: TrendingUp,
      description: language === 'de' ? 'Fondsanalyse' : 'Fund analysis',
    },
    {
      name: t.taxCalculator,
      href: '/tax-calculator',
      icon: DollarSign,
      description: language === 'de' ? 'Steuern berechnen' : 'Calculate taxes',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const getBreadcrumbs = () => {
    const segments = location.split('/').filter(Boolean);
    const breadcrumbs = [{ name: t.home, href: '/' }];

    let currentPath = '';
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      const navItem = navigation.find((item) => item.href === currentPath);
      if (navItem) {
        breadcrumbs.push({ name: navItem.name, href: currentPath });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const NavLink = ({ item, onClick, isMobile = false }: { item: typeof navigation[0]; onClick?: () => void; isMobile?: boolean }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const isHovered = hoveredItem === item.href;

    return (
      <Link to={item.href} onClick={onClick}>
        <motion.div
          className="relative"
          onHoverStart={() => setHoveredItem(item.href)}
          onHoverEnd={() => setHoveredItem(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {item.badge && (
            <div className="absolute -top-1 -right-1 z-10">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
                {item.badge}
              </span>
            </div>
          )}
          <span
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
              isMobile ? 'w-full' : '',
              active
                ? 'bg-gradient-to-r from-primary to-primary-600 text-white shadow-soft-lg shadow-primary/20'
                : 'text-foreground/70 hover:text-foreground hover:bg-accent/50'
            )}
          >
            <Icon className={cn("h-4 w-4 transition-transform duration-300", isHovered && !active && "rotate-12")} />
            <span className="flex-1">{item.name}</span>
            {active && (
              <motion.div
                layoutId="activeIndicator"
                className="w-1.5 h-1.5 rounded-full bg-white"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </span>

          {/* Tooltip */}
          <AnimatePresence>
            {isHovered && !isMobile && !active && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-foreground/90 text-background text-xs font-medium rounded-lg shadow-soft-xl backdrop-blur-sm whitespace-nowrap z-50"
              >
                {item.description}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground/90 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    );
  };

  const LanguageSwitcher = () => (
    <motion.div
      className="flex items-center bg-secondary/50 rounded-xl p-1 border border-border/30 shadow-soft"
      whileHover={{ scale: 1.02 }}
    >
      <button
        onClick={() => onLanguageChange?.('de')}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300',
          language === 'de'
            ? 'bg-background text-foreground shadow-soft'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
        )}
        aria-label="Deutsch"
      >
        <span className="flex items-center gap-1.5">
          <Globe className="h-3 w-3" />
          DE
        </span>
      </button>
      <button
        onClick={() => onLanguageChange?.('en')}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300',
          language === 'en'
            ? 'bg-background text-foreground shadow-soft'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
        )}
        aria-label="English"
      >
        <span className="flex items-center gap-1.5">
          <Globe className="h-3 w-3" />
          EN
        </span>
      </button>
    </motion.div>
  );

  const ThemeSwitcher = () => (
    <motion.button
      onClick={() => onThemeChange?.(theme === 'light' ? 'dark' : 'light')}
      className="p-2.5 rounded-xl bg-secondary/50 border border-border/30 hover:bg-accent/50 transition-all duration-300 shadow-soft"
      whileHover={{ scale: 1.05, rotate: 180 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait">
        {theme === 'light' ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-4 w-4 text-foreground" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-4 w-4 text-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );

  return (
    <>
      {/* Main Header */}
      <motion.header
        className={cn(
          'sticky top-0 z-50 w-full border-b transition-all duration-500',
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl shadow-soft-lg border-border/60'
            : 'bg-background/60 backdrop-blur-md border-border/30'
        )}
        initial={false}
        animate={{
          y: isScrolled ? 0 : 0,
          backgroundColor: isScrolled ? 'rgba(var(--background), 0.8)' : 'rgba(var(--background), 0.6)',
        }}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo / Brand */}
            <Link to="/">
              <motion.div
                className="flex items-center gap-3 cursor-pointer group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                  <div className="relative bg-gradient-to-r from-primary to-primary-600 p-2.5 rounded-xl shadow-soft-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {t.brandName}
                  </h1>
                  <p className="text-xs text-muted-foreground font-medium">{t.brandTagline}</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {language === 'de' ? 'AVP' : 'RP'}
                  </h1>
                </div>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {navigation.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>

            {/* Mobile Actions */}
            <div className="lg:hidden flex items-center gap-2">
              <LanguageSwitcher />
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden rounded-xl"
                      aria-label={t.menu}
                    >
                      <AnimatePresence mode="wait">
                        {isMobileMenuOpen ? (
                          <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <X className="h-5 w-5" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="menu"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Menu className="h-5 w-5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] sm:w-[400px] premium-card border-0">
                  <SheetHeader className="text-left space-y-2">
                    <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {t.navigation}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                      {t.navDescription}
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-8">
                    {navigation.map((item, index) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <NavLink
                          item={item}
                          onClick={() => setIsMobileMenuOpen(false)}
                          isMobile
                        />
                      </motion.div>
                    ))}
                  </nav>
                  <div className="absolute bottom-8 left-6 right-6">
                    <div className="flex items-center justify-between pt-6 border-t border-border/50">
                      <span className="text-sm text-muted-foreground font-medium">Theme</span>
                      <ThemeSwitcher />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Breadcrumb Navigation */}
      <AnimatePresence>
        {breadcrumbs.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="border-b border-border/30 bg-background/40 backdrop-blur-sm"
          >
            <div className="container mx-auto px-4 lg:px-8">
              <div className="flex items-center gap-2 h-12 text-sm overflow-x-auto">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Link to={crumb.href}>
                      <motion.span
                        className={cn(
                          'whitespace-nowrap font-medium transition-colors duration-200 hover:text-primary',
                          index === breadcrumbs.length - 1
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {crumb.name}
                      </motion.span>
                    </Link>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PremiumHeader;
