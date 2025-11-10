import React from 'react';
import { Link } from 'wouter';
import { Separator } from '@/components/ui/separator';
import { Shield, FileText, Scale, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="bg-gray-900 text-white mt-auto"
      role="contentinfo"
      aria-label="Website-Footer"
    >
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Unternehmen */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Finanzrechner Pro</h3>
            <p className="text-gray-300 text-sm">
              Ihr vertrauensvoller Partner für präzise Finanzberechnungen und 
              Steueroptimierung in Deutschland.
            </p>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Berlin, Deutschland</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+49 (0) 30 12345678</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>info@finanzrechner-pro.de</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link to="/calculator" className="hover:text-white transition-colors">
                  Rentenrechner
                </Link>
              </li>
              <li>
                <Link to="/tax-calculator" className="hover:text-white transition-colors">
                  Steuerrechner
                </Link>
              </li>
              <li>
                <Link to="/vergleich" className="hover:text-white transition-colors">
                  Vergleichsrechner
                </Link>
              </li>
              <li>
                <Link to="/fonds" className="hover:text-white transition-colors">
                  Fondsparplan
                </Link>
              </li>
            </ul>
          </div>

          {/* Rechtliches */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-100">
              <Scale className="h-4 w-4 text-blue-400" aria-hidden="true" />
              Rechtliches
            </h3>
            <nav aria-label="Rechtliche Links">
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/impressum"
                    className="text-gray-300 hover:text-blue-400 transition-all duration-200 flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded p-1"
                    aria-label="Impressum - Rechtliche Informationen über den Anbieter"
                  >
                    <FileText className="h-3 w-3 text-gray-400 group-hover:text-blue-400 transition-colors" aria-hidden="true" />
                    <span className="font-medium">Impressum</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/datenschutz"
                    className="text-gray-300 hover:text-blue-400 transition-all duration-200 flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded p-1"
                    aria-label="Datenschutzerklärung - Informationen zum Umgang mit persönlichen Daten"
                  >
                    <Shield className="h-3 w-3 text-gray-400 group-hover:text-blue-400 transition-colors" aria-hidden="true" />
                    <span className="font-medium">Datenschutz</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/agb"
                    className="text-gray-300 hover:text-blue-400 transition-all duration-200 flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded p-1"
                    aria-label="Allgemeine Geschäftsbedingungen - Nutzungsbedingungen der Website"
                  >
                    <FileText className="h-3 w-3 text-gray-400 group-hover:text-blue-400 transition-colors" aria-hidden="true" />
                    <span className="font-medium">AGB</span>
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a 
                  href="mailto:support@finanzrechner-pro.de" 
                  className="hover:text-white transition-colors"
                >
                  E-Mail Support
                </a>
              </li>
              <li>
                <a 
                  href="tel:+4930123456789" 
                  className="hover:text-white transition-colors"
                >
                  Telefon Support
                </a>
              </li>
              <li>
                <span className="text-gray-400">
                  Mo-Fr: 9:00 - 18:00 Uhr
                </span>
              </li>
              <li>
                <span className="text-gray-400">
                  Sa: 10:00 - 14:00 Uhr
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-700" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-400 font-medium">
            © {currentYear} Finanzrechner Pro GmbH. Alle Rechte vorbehalten.
          </div>
          
          <nav aria-label="Footer-Navigation" className="flex flex-wrap gap-1 text-sm">
            <Link
              to="/impressum"
              className="text-gray-400 hover:text-blue-400 transition-colors duration-200 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Impressum"
            >
              Impressum
            </Link>
            <span className="text-gray-600 px-1" aria-hidden="true">•</span>
            <Link
              to="/datenschutz"
              className="text-gray-400 hover:text-blue-400 transition-colors duration-200 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Datenschutzerklärung"
            >
              Datenschutz
            </Link>
            <span className="text-gray-600 px-1" aria-hidden="true">•</span>
            <Link
              to="/agb"
              className="text-gray-400 hover:text-blue-400 transition-colors duration-200 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Allgemeine Geschäftsbedingungen"
            >
              AGB
            </Link>
          </nav>
        </div>

        {/* DSGVO Hinweis */}
        <div 
          className="mt-6 p-4 bg-gradient-to-r from-gray-800 to-gray-750 rounded-lg border border-gray-700"
          role="region"
          aria-labelledby="dsgvo-title"
        >
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p id="dsgvo-title" className="font-semibold text-gray-100 mb-1">DSGVO-konform & SSL-verschlüsselt</p>
              <p className="text-gray-300 leading-relaxed">
                Ihre Daten werden gemäß EU-DSGVO verarbeitet.
                Alle Berechnungen erfolgen lokal in Ihrem Browser.
                <Link
                  to="/datenschutz"
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium ml-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
                  aria-label="Zur Datenschutzerklärung - Mehr über Datenschutz erfahren"
                >
                  Mehr erfahren →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}