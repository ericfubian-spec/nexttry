import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { X, Settings, Shield, BarChart3, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cookieManager, type CookieConsent } from '@/lib/cookie-manager';

interface CookieBannerProps {
  onClose?: () => void;
}

export function CookieBanner({ onClose }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: Date.now()
  });
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const existingConsent = cookieManager.getConsent();
    const bannerShown = cookieManager.isBannerShown();
    
    if (!existingConsent && !bannerShown) {
      setIsVisible(true);
    }
    
    if (existingConsent) {
      setConsent(existingConsent);
    }
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current = [];
    };
  }, []);

  const handleAcceptAll = () => {
    cookieManager.acceptAll();
    setIsVisible(false);
    onClose?.();
  };

  const handleAcceptNecessary = () => {
    cookieManager.acceptNecessaryOnly();
    setIsVisible(false);
    onClose?.();
  };

  const handleSaveSettings = () => {
    cookieManager.setConsent(consent);
    setIsVisible(false);
    setShowSettings(false);
    onClose?.();
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const updateConsent = (category: keyof Omit<CookieConsent, 'timestamp'>, value: boolean) => {
    setConsent(prev => ({
      ...prev,
      [category]: value
    }));
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
    >
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm pointer-events-auto animate-in slide-in-from-bottom-2 duration-500">
        <Card className="shadow-lg border border-gray-200/80 backdrop-blur-md bg-white/95">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <CardTitle id="cookie-banner-title" className="text-lg">Cookie-Einstellungen</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription id="cookie-banner-description" className="text-xs text-gray-600">
              Wir nutzen Cookies für eine optimale Nutzererfahrung.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!showSettings ? (
              <>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Wir verwenden Cookies zur Funktionalität und Analyse. 
                  Mit der Nutzung stimmen Sie der Verwendung zu.
                </p>
                
                <div className="flex gap-2" role="group" aria-label="Cookie-Einstellungen">
                  <Button 
                    onClick={handleAcceptAll} 
                    size="sm" 
                    className="flex-1 h-8 text-xs focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-describedby="cookie-banner-description"
                  >
                    Alle akzeptieren
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleAcceptNecessary} 
                    size="sm" 
                    className="flex-1 h-8 text-xs focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    aria-describedby="cookie-banner-description"
                  >
                    Nur notwendige
                  </Button>
                </div>
                
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    aria-label="Erweiterte Cookie-Einstellungen öffnen"
                  >
                    <Settings className="h-3 w-3 mr-1" aria-hidden="true" />
                    Anpassen
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3" role="group" aria-labelledby="cookie-categories-title">
                  <h4 id="cookie-categories-title" className="sr-only">Cookie-Kategorien</h4>
                  
                  {/* Notwendige Cookies */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-3 px-2 rounded-lg bg-gray-50 border">
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-600" aria-hidden="true" />
                          Notwendige Cookies
                        </h5>
                        <p className="text-xs text-gray-600 mt-1">
                          Erforderlich für die Grundfunktionen der Website
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        <span className="text-xs text-green-600 font-medium" aria-label="Status: Immer aktiv">Immer aktiv</span>
                        <Switch
                          checked={true}
                          disabled={true}
                          className="scale-90 opacity-75"
                          aria-label="Notwendige Cookies - immer aktiviert"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Analytics Cookies */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-3 px-2 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                          Analytics Cookies
                        </h5>
                        <p className="text-xs text-gray-600 mt-1">
                          Helfen uns die Website zu verbessern
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        <span 
                          className={`text-xs font-medium transition-colors ${
                            consent.analytics ? 'text-blue-600' : 'text-gray-400'
                          }`}
                          aria-label={`Analytics Cookies Status: ${consent.analytics ? 'Aktiv' : 'Inaktiv'}`}
                        >
                          {consent.analytics ? 'Aktiv' : 'Inaktiv'}
                        </span>
                        <Switch
                          checked={consent.analytics}
                          onCheckedChange={(checked) => {
                            updateConsent('analytics', checked);
                            // Sofortige Speicherung mit visuellem Feedback
                            const timeoutId = setTimeout(() => {
                              cookieManager.setConsent({ analytics: checked });
                            }, 100);
                            timeoutRefs.current.push(timeoutId);
                          }}
                          className="scale-90 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          aria-label="Analytics Cookies aktivieren oder deaktivieren"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Marketing Cookies */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-3 px-2 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-600" aria-hidden="true" />
                          Marketing Cookies
                        </h5>
                        <p className="text-xs text-gray-600 mt-1">
                          Für personalisierte Werbung
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        <span 
                          className={`text-xs font-medium transition-colors ${
                            consent.marketing ? 'text-purple-600' : 'text-gray-400'
                          }`}
                          aria-label={`Marketing Cookies Status: ${consent.marketing ? 'Aktiv' : 'Inaktiv'}`}
                        >
                          {consent.marketing ? 'Aktiv' : 'Inaktiv'}
                        </span>
                        <Switch
                          checked={consent.marketing}
                          onCheckedChange={(checked) => {
                            updateConsent('marketing', checked);
                            // Sofortige Speicherung mit visuellem Feedback
                            const timeoutId = setTimeout(() => {
                              cookieManager.setConsent({ marketing: checked });
                            }, 100);
                            timeoutRefs.current.push(timeoutId);
                          }}
                          className="scale-90 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                          aria-label="Marketing Cookies aktivieren oder deaktivieren"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2" role="group" aria-label="Cookie-Einstellungen Aktionen">
                  <Button 
                    onClick={handleSaveSettings} 
                    size="sm" 
                    className="flex-1 h-8 text-xs focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Speichern
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(false)}
                    size="sm"
                    className="flex-1 h-8 text-xs focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Zurück
                  </Button>
                </div>
              </>
            )}
            
            <div className="text-center border-t pt-3 mt-3">
              <p className="text-xs text-gray-500">
                <Link to="/datenschutz" className="text-blue-600 hover:text-blue-700 transition-colors">
                  Datenschutz
                </Link>
                {' • '}
                <Link to="/cookie-richtlinie" className="text-blue-600 hover:text-blue-700 transition-colors">
                  Cookie-Richtlinien
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Hook für Cookie-Consent-Status
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const currentConsent = cookieManager.getConsent();
    setConsent(currentConsent);

    const handleConsentChange = (newConsent: CookieConsent) => {
      setConsent(newConsent);
    };

    cookieManager.addConsentListener(handleConsentChange);

    return () => {
      cookieManager.removeConsentListener(handleConsentChange);
    };
  }, []);

  return {
    consent,
    isAllowed: (category: 'necessary' | 'analytics' | 'marketing') => 
      cookieManager.isAllowed(category),
    hasConsent: consent !== null
  };
}