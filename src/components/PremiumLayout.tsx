import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'wouter';
import PremiumHeader from './PremiumHeader';
import PremiumOnboardingWizard from './onboarding/PremiumOnboardingWizard';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { ArrowUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface PremiumLayoutProps {
  children: React.ReactNode;
  language?: 'de' | 'en';
  onLanguageChange?: (lang: 'de' | 'en') => void;
}

export const PremiumLayout: React.FC<PremiumLayoutProps> = ({
  children,
  language = 'de',
  onLanguageChange,
}) => {
  const [location] = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { isCompleted, loadFromStorage } = useOnboardingStore();

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;

    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  // Load onboarding data and show wizard if not completed
  useEffect(() => {
    const initializeOnboarding = async () => {
      await loadFromStorage();
      if (!isCompleted) {
        setShowOnboarding(true);
      }
    };
    initializeOnboarding();
  }, [loadFromStorage, isCompleted]);

  // Handle theme changes
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Premium Header */}
      <PremiumHeader
        language={language}
        onLanguageChange={onLanguageChange}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* Main Content */}
      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Premium Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 border-t border-border/30 bg-gradient-to-b from-background to-accent/20"
      >
        <div className="container mx-auto px-4 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand Column */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {language === 'de' ? 'AltersvorsorgePlus' : 'RetirementPlus'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {language === 'de'
                  ? 'Ihre professionelle Plattform für Altersvorsorge und Finanzplanung.'
                  : 'Your professional platform for retirement planning and financial management.'}
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">
                {language === 'de' ? 'Schnellzugriff' : 'Quick Links'}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-primary transition-colors duration-200">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/calculator" className="hover:text-primary transition-colors duration-200">
                    {language === 'de' ? 'Rechner' : 'Calculator'}
                  </Link>
                </li>
                <li>
                  <Link to="/vergleich" className="hover:text-primary transition-colors duration-200">
                    {language === 'de' ? 'Vergleich' : 'Comparison'}
                  </Link>
                </li>
                <li>
                  <Link to="/fonds" className="hover:text-primary transition-colors duration-200">
                    {language === 'de' ? 'Fonds' : 'Funds'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">
                {language === 'de' ? 'Rechtliches' : 'Legal'}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/impressum" className="hover:text-primary transition-colors duration-200">
                    Impressum
                  </Link>
                </li>
                <li>
                  <Link to="/datenschutz" className="hover:text-primary transition-colors duration-200">
                    {language === 'de' ? 'Datenschutz' : 'Privacy Policy'}
                  </Link>
                </li>
                <li>
                  <Link to="/agb" className="hover:text-primary transition-colors duration-200">
                    AGB
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">
                {language === 'de' ? 'Kontakt' : 'Contact'}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {language === 'de'
                  ? 'Haben Sie Fragen? Wir helfen Ihnen gerne weiter.'
                  : 'Have questions? We\'re happy to help.'}
              </p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {language === 'de' ? 'AltersvorsorgePlus' : 'RetirementPlus'}.{' '}
              {language === 'de' ? 'Alle Rechte vorbehalten.' : 'All rights reserved.'}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {language === 'de' ? 'Erstellt mit' : 'Built with'}{' '}
                <span className="text-red-500">❤</span> {language === 'de' ? 'in Deutschland' : 'in Germany'}
              </span>
            </div>
          </div>
        </div>
      </motion.footer>

      {/* Onboarding Wizard */}
      <AnimatePresence>
        {showOnboarding && (
          <PremiumOnboardingWizard
            onClose={() => setShowOnboarding(false)}
            language={language}
          />
        )}
      </AnimatePresence>

      {/* Settings Button (Reopen Onboarding) */}
      {isCompleted && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowOnboarding(true)}
          className={cn(
            'fixed bottom-8 left-8 z-40',
            'p-4 rounded-2xl',
            'bg-secondary border border-border',
            'text-foreground',
            'shadow-soft-lg',
            'hover:shadow-soft-xl hover:scale-110',
            'transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
          whileHover={{ y: -4, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Update settings"
          title={language === 'de' ? 'Daten aktualisieren' : 'Update data'}
        >
          <Settings className="h-5 w-5" />
        </motion.button>
      )}

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className={cn(
              'fixed bottom-8 right-8 z-40',
              'p-4 rounded-2xl',
              'bg-primary text-primary-foreground',
              'shadow-soft-2xl shadow-primary/20',
              'hover:shadow-glow hover:scale-110',
              'transition-all duration-300',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Background Decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-success/5 to-transparent rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default PremiumLayout;
