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
  PieChart,
  Home,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  language?: 'de' | 'en';
  onLanguageChange?: (lang: 'de' | 'en') => void;
}

export const Header: React.FC<HeaderProps> = ({ language = 'de', onLanguageChange }) => {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      funds: 'Fonds',
      taxCalculator: 'Steuerrechner',
      menu: 'Menü',
      close: 'Schließen',
    },
    en: {
      home: 'Dashboard',
      calculator: 'Calculator',
      comparison: 'Comparison',
      funds: 'Funds',
      taxCalculator: 'Tax Calculator',
      menu: 'Menu',
      close: 'Close',
    },
  };

  const t = texts[language];

  const navigation = [
    {
      name: t.home,
      href: '/',
      icon: Home,
    },
    {
      name: t.calculator,
      href: '/calculator',
      icon: Calculator,
    },
    {
      name: t.comparison,
      href: '/vergleich',
      icon: BarChart3,
    },
    {
      name: t.funds,
      href: '/fonds',
      icon: TrendingUp,
    },
    {
      name: t.taxCalculator,
      href: '/tax-calculator',
      icon: DollarSign,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const NavLink = ({ item, onClick }: { item: typeof navigation[0]; onClick?: () => void }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link to={item.href} onClick={onClick}>
        <span
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{item.name}</span>
        </span>
      </Link>
    );
  };

  const LanguageSwitcher = () => (
    <div className="flex items-center bg-muted rounded-lg p-1">
      <button
        onClick={() => onLanguageChange?.('de')}
        className={cn(
          'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
          language === 'de'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Deutsch"
      >
        DE
      </button>
      <button
        onClick={() => onLanguageChange?.('en')}
        className={cn(
          'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
          language === 'en'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-shadow duration-200',
        isScrolled && 'shadow-md'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2">
            <Link to="/">
              <span className="flex items-center gap-2 text-lg font-bold text-primary hover:opacity-80 transition-opacity cursor-pointer">
                <PieChart className="h-6 w-6" />
                <span className="hidden sm:inline">
                  {language === 'de' ? 'Finanzrechner Pro' : 'Finance Calculator Pro'}
                </span>
                <span className="sm:hidden">Finanz</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          {/* Desktop Language Switcher */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label={t.menu}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    {language === 'de' ? 'Navigation' : 'Navigation'}
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    {language === 'de'
                      ? 'Navigieren Sie zu den verschiedenen Bereichen'
                      : 'Navigate to different sections'}
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {navigation.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
