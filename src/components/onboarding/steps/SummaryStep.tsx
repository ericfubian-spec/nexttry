import React from 'react';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { formatCurrency, formatPercentage } from '../../../utils/onboardingValidation';
import { CheckCircle, User, Euro, Shield, PiggyBank, Home, Download, RotateCcw } from 'lucide-react';

const SummaryStep: React.FC = () => {
  const { data, exportData, resetData } = useOnboardingStore();
  
  const isMarriedBoth = data.personal?.maritalStatus === 'verheiratet' && data.personal?.calcScope === 'beide_personen';

  const handleExport = () => {
    const exportedData = exportData();
    const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onboarding-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (window.confirm('Möchten Sie wirklich alle Daten zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      resetData();
    }
  };

  const renderPersonalSummary = (person?: 'A' | 'B') => {
    const suffix = person ? `_${person}` : '';
    const personLabel = person ? ` (Person ${person})` : '';
    
    const getValue = (section: string, field: string, defaultValue: any = 0) => {
      const sectionData = (data as any)[section];
      if (!sectionData) return defaultValue;
      return person ? (sectionData[`${field}${suffix}`] || defaultValue) : (sectionData[field] || defaultValue);
    };

    return (
      <div className="space-y-4">
        {/* Income */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">
            <Euro className="inline h-4 w-4 mr-1" />
            Einkommen{personLabel}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Netto/Monat:</span>
              <span className="font-medium ml-2">{formatCurrency(getValue('income', 'netMonthly'))}</span>
            </div>
            {getValue('income', 'grossAnnual') > 0 && (
              <div>
                <span className="text-gray-600">Brutto/Jahr:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('income', 'grossAnnual'))}</span>
              </div>
            )}
          </div>
          {getValue('otherIncome', 'has') === true && getValue('otherIncome', 'amountMonthly') > 0 && (
            <div className="mt-2 text-sm">
              <span className="text-gray-600">Weitere Einkünfte:</span>
              <span className="font-medium ml-2">
                {getValue('otherIncome', 'type')} - {formatCurrency(getValue('otherIncome', 'amountMonthly'))}/Monat
              </span>
            </div>
          )}
        </div>

        {/* Pensions */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">
            <Shield className="inline h-4 w-4 mr-1" />
            Renten & Vorsorge{personLabel}
          </h4>
          <div className="space-y-1 text-sm">
            {getValue('pensions', 'public67') > 0 && (
              <div>
                <span className="text-gray-600">Gesetzliche Rente:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('pensions', 'public67'))}/Monat</span>
              </div>
            )}
            {getValue('pensions', 'civil67') > 0 && (
              <div>
                <span className="text-gray-600">Beamtenpension:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('pensions', 'civil67'))}/Monat</span>
              </div>
            )}
            {getValue('pensions', 'profession67') > 0 && (
              <div>
                <span className="text-gray-600">Versorgungswerk:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('pensions', 'profession67'))}/Monat</span>
              </div>
            )}
            {getValue('pensions', 'zvkVbl67') > 0 && (
              <div>
                <span className="text-gray-600">ZVK/VBL:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('pensions', 'zvkVbl67'))}/Monat</span>
              </div>
            )}
            {getValue('privatePension', 'contribution') > 0 && (
              <div>
                <span className="text-gray-600">Private Rente:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('privatePension', 'contribution'))}/Monat</span>
              </div>
            )}
            {getValue('riester', 'amount') > 0 && (
              <div>
                <span className="text-gray-600">Riester:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('riester', 'amount'))}/Monat</span>
              </div>
            )}
            {getValue('ruerup', 'amount') > 0 && (
              <div>
                <span className="text-gray-600">Rürup:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('ruerup', 'amount'))}/Monat</span>
              </div>
            )}
            {getValue('occupationalPension', 'amount') > 0 && (
              <div>
                <span className="text-gray-600">Betriebsrente:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('occupationalPension', 'amount'))}/Monat</span>
              </div>
            )}
          </div>
        </div>

        {/* Assets */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">
            <PiggyBank className="inline h-4 w-4 mr-1" />
            Vermögenswerte{personLabel}
          </h4>
          <div className="space-y-1 text-sm">
            {getValue('lifeInsurance', 'sum') > 0 && (
              <div>
                <span className="text-gray-600">Lebensversicherung:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('lifeInsurance', 'sum'))}</span>
              </div>
            )}
            {getValue('funds', 'balance') > 0 && (
              <div>
                <span className="text-gray-600">Investmentfonds:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('funds', 'balance'))}</span>
              </div>
            )}
            {getValue('savings', 'balance') > 0 && (
              <div>
                <span className="text-gray-600">Sparguthaben:</span>
                <span className="font-medium ml-2">{formatCurrency(getValue('savings', 'balance'))}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Onboarding abgeschlossen!
        </h2>
        <p className="text-gray-600">
          Hier ist eine Zusammenfassung Ihrer Angaben. Sie können diese jederzeit ändern.
        </p>
      </div>

      {/* Personal Data Summary */}
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <User className="inline h-5 w-5 mr-2" />
          Persönliche Daten
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Geburtsjahr:</span>
            <span className="font-medium ml-2">{data.personal?.birthYear}</span>
          </div>
          <div>
            <span className="text-gray-600">Alter:</span>
            <span className="font-medium ml-2">{data.personal?.age} Jahre</span>
          </div>
          <div>
            <span className="text-gray-600">Familienstand:</span>
            <span className="font-medium ml-2">
              {data.personal?.maritalStatus === 'ledig' && 'Ledig'}
              {data.personal?.maritalStatus === 'verheiratet' && 'Verheiratet'}
              {data.personal?.maritalStatus === 'geschieden' && 'Geschieden'}
              {data.personal?.maritalStatus === 'dauernd_getrennt' && 'Dauernd getrennt'}
              {data.personal?.maritalStatus === 'verwitwet' && 'Verwitwet'}
            </span>
          </div>
          {data.personal?.children?.has && (
            <div>
              <span className="text-gray-600">Kinder:</span>
              <span className="font-medium ml-2">{data.personal.children.count}</span>
            </div>
          )}
          {data.personal?.maritalStatus === 'verheiratet' && (
            <div>
              <span className="text-gray-600">Berechnung:</span>
              <span className="font-medium ml-2">
                {data.personal?.calcScope === 'eine_person' ? 'Eine Person' : 'Beide Personen'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Financial Data Summary */}
      {isMarriedBoth ? (
        <div className="space-y-6">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Person A - Finanzdaten
            </h3>
            {renderPersonalSummary('A')}
          </div>
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Person B - Finanzdaten
            </h3>
            {renderPersonalSummary('B')}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Finanzdaten
          </h3>
          {renderPersonalSummary()}
        </div>
      )}

      {/* Mortgage Summary */}
      {data.mortgage?.has && (
        <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <Home className="inline h-5 w-5 mr-2" />
            Immobilienkredit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Aktuelle Restschuld:</span>
              <span className="font-medium ml-2">{formatCurrency(data.mortgage.remainingDebtNow || 0)}</span>
            </div>
            <div>
              <span className="text-gray-600">Ende Zinsbindung:</span>
              <span className="font-medium ml-2">{data.mortgage.fixationEndYear}</span>
            </div>
            <div>
              <span className="text-gray-600">Restschuld dann:</span>
              <span className="font-medium ml-2">{formatCurrency(data.mortgage.remainingDebtAtFixationEnd || 0)}</span>
            </div>
            <div>
              <span className="text-gray-600">Zinssatz:</span>
              <span className="font-medium ml-2">{formatPercentage(data.mortgage.interestRate || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button
          onClick={handleExport}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Daten exportieren
        </button>
        
        <button
          onClick={handleReset}
          className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Alle Daten zurücksetzen
        </button>
      </div>

      {/* Next Steps */}
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          🎉 Herzlichen Glückwunsch!
        </h3>
        <p className="text-gray-700 mb-4">
          Sie haben das Onboarding erfolgreich abgeschlossen. Ihre Daten wurden automatisch gespeichert und Sie können nun alle Funktionen der Anwendung nutzen.
        </p>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Berechnen Sie Ihre Versorgungslücke</p>
          <p>• Vergleichen Sie verschiedene Anlagestrategien</p>
          <p>• Optimieren Sie Ihre Altersvorsorge</p>
          <p>• Exportieren Sie Ihre Daten jederzeit</p>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;