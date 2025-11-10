import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieBanner } from "@/components/CookieBanner";
import PremiumLayout from "@/components/PremiumLayout";
import { Suspense, lazy, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import OnboardingContainer from "@/components/onboarding/OnboardingContainer";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { motion } from "framer-motion";

// Get base path from environment (matches vite.config.ts)
// For GitHub Pages, this will be "/german-pension-calculator/" in production, "/" in development
// At runtime we prefer a <base> tag if present (proxied pages inject one). This makes
// routing resilient when the app is served from a subdirectory or via the capture proxy.
const base = import.meta.env.BASE_URL;

// Compute the effective base at runtime. If a <base href="..."> tag exists in the
// document (injected by the proxy or set by the hosting), prefer that. Otherwise fall
// back to the build-time `base` value.
const getRuntimeBase = (): string => {
  try {
    const baseEl = typeof document !== 'undefined' ? document.querySelector('base') : null;
    if (baseEl) {
      const href = baseEl.getAttribute('href') || '';
      if (href) {
        // Resolve against current location to get a normalized pathname
        const resolved = new URL(href, window.location.href);
        const path = resolved.pathname;
        return path.endsWith('/') ? path : path + '/';
      }
    }
  } catch (e) {
    // ignore and fall back
  }

  return base || '/';
};

/**
 * Custom location hook for GitHub Pages subdirectory deployment.
 *
 * This hook enables clean URLs (without hash routing) for subdirectory deployments
 * by normalizing paths between the browser and Wouter router:
 * - Strips the base path (/app/) from browser URLs for route matching
 * - Adds the base path back when navigating to maintain correct URLs
 *
 * Example: Browser sees "/app/calculator" → Router matches "/calculator"
 */
const useGitHubPagesLocation = (): [string, (to: string, options?: any) => void] => {
  const runtimeBase = getRuntimeBase();

  const [loc, setLoc] = useState(() => {
    // GitHub Pages SPA redirect encodes the actual route in the query string as '?/actual/path'
    // e.g. https://user.github.io/repo/?/calculator -> location.search starts with '?/calculator'
    const search = window.location.search || "";
    const searchRouteMatch = search.match(/^\/?(\/.*)/);
    const path = searchRouteMatch ? searchRouteMatch[1] : window.location.pathname;
    // Remove base path from pathname for route matching
    // Handle edge cases: "/app/" -> "/", "/app/calculator" -> "/calculator", "/app" -> "/"
    if (runtimeBase === "/" || runtimeBase === "") return path;
    const normalizedBase = runtimeBase.replace(/\/$/, ""); // "/app"
    if (path === normalizedBase || path === normalizedBase + "/") return "/";
    if (path.startsWith(normalizedBase + "/")) return path.slice(normalizedBase.length);
    return path;
  });

  useEffect(() => {
    const handler = () => {
      const search = window.location.search || "";
      const searchRouteMatch = search.match(/^\/?(\/.*)/);
      const path = searchRouteMatch ? searchRouteMatch[1] : window.location.pathname;
      // Apply same normalization logic using the runtime base
      if (runtimeBase === "/" || runtimeBase === "") {
        setLoc(path);
        return;
      }
      const normalizedBase = runtimeBase.replace(/\/$/, "");
      if (path === normalizedBase || path === normalizedBase + "/") {
        setLoc("/");
      } else if (path.startsWith(normalizedBase + "/")) {
        setLoc(path.slice(normalizedBase.length));
      } else {
        setLoc(path);
      }
    };

    // Listen to popstate events (browser back/forward)
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

    const navigate = (to: string, options?: any) => {
      // Add base path back when navigating (use runtime base)
      const prefix = runtimeBase !== "/" && runtimeBase !== "" ? runtimeBase.replace(/\/$/, "") : "";
      const fullPath = `${prefix}${to}` || to;

      if (options?.replace) {
        window.history.replaceState(null, "", fullPath);
      } else {
        window.history.pushState(null, "", fullPath);
      }

      setLoc(to);
    };

  return [loc, navigate];
};

// Lazy load ALL pages for optimal performance and code splitting
const PremiumDashboard = lazy(() => import("@/pages/PremiumDashboard"));
const PremiumCalculator = lazy(() => import("@/pages/PremiumCalculator"));
const PremiumFunds = lazy(() => import("@/pages/PremiumFunds"));
const PremiumComparison = lazy(() => import("@/pages/PremiumComparison"));
const DebekaComparison = lazy(() => import("@/pages/DebekaComparison"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Home = lazy(() => import("@/pages/home"));
const Questions = lazy(() => import("@/pages/questions"));
const TaxCalculatorPage = lazy(() => import("@/pages/TaxCalculatorPage"));
const Impressum = lazy(() => import("@/pages/impressum"));
const Datenschutz = lazy(() => import("@/pages/datenschutz"));
const AGB = lazy(() => import("@/pages/agb"));

// Premium loading component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="inline-block mb-4"
      >
        <Loader2 className="h-12 w-12 text-primary" />
      </motion.div>
      <p className="text-muted-foreground font-medium">Lädt...</p>
    </motion.div>
  </div>
);

function Router({ language }: { language: 'de' | 'en' }) {
  return (
    <WouterRouter hook={useGitHubPagesLocation}>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/">
            <ErrorBoundary>
              <PremiumDashboard language={language} />
            </ErrorBoundary>
          </Route>
          <Route path="/calculator">
            <ErrorBoundary>
              <PremiumCalculator language={language} />
            </ErrorBoundary>
          </Route>
          <Route path="/fonds">
            <ErrorBoundary>
              <PremiumFunds language={language} />
            </ErrorBoundary>
          </Route>
          <Route path="/fund-performance">
            <ErrorBoundary>
              <PremiumFunds language={language} />
            </ErrorBoundary>
          </Route>
          <Route path="/vergleich">
            <ErrorBoundary>
              <PremiumComparison language={language} />
            </ErrorBoundary>
          </Route>
          <Route path="/debeka-vergleich">
            <ErrorBoundary>
              <DebekaComparison language={language} />
            </ErrorBoundary>
          </Route>
          <Route path="/steuervergleich">
            <ErrorBoundary>
              <DebekaComparison language={language} />
            </ErrorBoundary>
          </Route>
          <Route path="/custom-comparison">
            <ErrorBoundary>
              <PremiumComparison language={language} />
            </ErrorBoundary>
          </Route>
          <Route path="/questions" component={Questions} />
          <Route path="/tax-calculator" component={TaxCalculatorPage} />
          <Route path="/steuerrechner" component={TaxCalculatorPage} />
          <Route path="/impressum" component={Impressum} />
          <Route path="/datenschutz" component={Datenschutz} />
          <Route path="/agb" component={AGB} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </WouterRouter>
  );
}

function App() {
  const [language, setLanguage] = useState<'de' | 'en'>('de');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <OnboardingContainer>
            <PremiumLayout language={language} onLanguageChange={setLanguage}>
              <Toaster />
              <Router language={language} />
              <CookieBanner />
            </PremiumLayout>
          </OnboardingContainer>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App;
