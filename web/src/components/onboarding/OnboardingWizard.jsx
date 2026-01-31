import { useState } from 'react';
import { Check, ChevronRight, ChevronLeft, MapPin, Package, Users, Sparkles, X } from 'lucide-react';

/**
 * Onboarding Wizard for new Company Admins
 * Guides them through initial setup: regions, waste types, first manager
 */
export const OnboardingWizard = ({
  open,
  onClose,
  onComplete,
  companyName = 'Vaša firma',
  existingRegions = [],
  existingWasteTypes = [],
  existingStaff = [],
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [skipped, setSkipped] = useState(false);

  // Determine which steps are already complete
  const hasRegions = existingRegions.length > 0;
  const hasWasteTypes = existingWasteTypes.length > 0;
  const hasStaff = existingStaff.filter(s => s.role === 'manager' || s.role === 'driver').length > 0;

  const steps = [
    {
      id: 'welcome',
      title: 'Dobrodošli',
      icon: Sparkles,
      description: 'Upoznajte se sa sistemom',
      complete: true, // Always accessible
    },
    {
      id: 'regions',
      title: 'Regioni',
      icon: MapPin,
      description: 'Kreirajte filijale/regione',
      complete: hasRegions,
      action: 'Idite na Podešavanja → Regioni',
    },
    {
      id: 'waste-types',
      title: 'Vrste robe',
      icon: Package,
      description: 'Definišite vrste otpada',
      complete: hasWasteTypes,
      action: 'Idite na Podešavanja → Vrste robe',
    },
    {
      id: 'staff',
      title: 'Osoblje',
      icon: Users,
      description: 'Dodajte menadžere i vozače',
      complete: hasStaff,
      action: 'Idite na Osoblje → Dodaj korisnika',
    },
  ];

  const allComplete = hasRegions && hasWasteTypes && hasStaff;
  const progress = [hasRegions, hasWasteTypes, hasStaff].filter(Boolean).length;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    onComplete?.({ skipped: true });
    onClose();
  };

  const handleFinish = () => {
    onComplete?.({ skipped: false, allComplete });
    onClose();
  };

  if (!open) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Podešavanje firme</h2>
              <p className="text-emerald-100 text-sm mt-1">{companyName}</p>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Preskoči"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-emerald-100 mb-2">
              <span>Napredak</span>
              <span>{progress}/3 koraka</span>
            </div>
            <div className="h-2 bg-emerald-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${(progress / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex border-b">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isPast = index < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex-1 py-3 px-2 flex flex-col items-center gap-1 transition-colors ${
                  isActive
                    ? 'bg-emerald-50 border-b-2 border-emerald-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.complete
                      ? 'bg-emerald-100 text-emerald-600'
                      : isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step.complete ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 0 && (
            <WelcomeStep companyName={companyName} allComplete={allComplete} />
          )}
          {currentStep === 1 && (
            <RegionsStep complete={hasRegions} count={existingRegions.length} />
          )}
          {currentStep === 2 && (
            <WasteTypesStep complete={hasWasteTypes} count={existingWasteTypes.length} />
          )}
          {currentStep === 3 && (
            <StaffStep complete={hasStaff} staff={existingStaff} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between bg-slate-50">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ChevronLeft size={18} />
            Nazad
          </button>

          <div className="flex gap-2">
            {!allComplete && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                Preskoči za sada
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Dalje
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                {allComplete ? 'Završi' : 'Zatvori'}
                <Check size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Step Components
// =============================================================================

const WelcomeStep = ({ companyName, allComplete }) => (
  <div className="text-center py-4">
    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Sparkles className="w-10 h-10 text-emerald-600" />
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">
      Dobrodošli u EcoMountain!
    </h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">
      {allComplete ? (
        <>Vaša firma <strong>{companyName}</strong> je potpuno podešena i spremna za rad.</>
      ) : (
        <>
          Ovaj vodič će vam pomoći da podesite <strong>{companyName}</strong> u nekoliko jednostavnih koraka.
        </>
      )}
    </p>

    {!allComplete && (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left max-w-md mx-auto">
        <h4 className="font-medium text-amber-800 mb-2">Pre nego što počnete:</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Definišite regione/filijale vaše firme</li>
          <li>• Dodajte vrste robe koje prikupljate</li>
          <li>• Pozovite menadžere i vozače</li>
        </ul>
      </div>
    )}

    {allComplete && (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left max-w-md mx-auto">
        <h4 className="font-medium text-emerald-800 mb-2">Sve je spremno!</h4>
        <p className="text-sm text-emerald-700">
          Možete početi da primate zahteve od klijenata i upravljate prikupljanjem.
        </p>
      </div>
    )}
  </div>
);

const RegionsStep = ({ complete, count }) => (
  <div className="py-4">
    <div className="flex items-start gap-4 mb-6">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          complete ? 'bg-emerald-100' : 'bg-slate-100'
        }`}
      >
        {complete ? (
          <Check className="w-6 h-6 text-emerald-600" />
        ) : (
          <MapPin className="w-6 h-6 text-slate-400" />
        )}
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">Regioni i filijale</h3>
        <p className="text-slate-600 mt-1">
          Regioni predstavljaju geografska područja ili filijale vaše firme. Svaki region može imati svoje menadžere, vozače i klijente.
        </p>
      </div>
    </div>

    {complete ? (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <Check size={18} />
          <span className="font-medium">Imate {count} region{count !== 1 ? 'a' : ''}</span>
        </div>
      </div>
    ) : (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="font-medium text-slate-800 mb-2">Kako dodati region:</h4>
        <ol className="text-sm text-slate-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <span>Idite na <strong>Podešavanja</strong> u navigaciji</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <span>Kliknite na tab <strong>Regioni</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <span>Kliknite <strong>+ Dodaj region</strong> i unesite naziv</span>
          </li>
        </ol>
      </div>
    )}
  </div>
);

const WasteTypesStep = ({ complete, count }) => (
  <div className="py-4">
    <div className="flex items-start gap-4 mb-6">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          complete ? 'bg-emerald-100' : 'bg-slate-100'
        }`}
      >
        {complete ? (
          <Check className="w-6 h-6 text-emerald-600" />
        ) : (
          <Package className="w-6 h-6 text-slate-400" />
        )}
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">Vrste robe</h3>
        <p className="text-slate-600 mt-1">
          Definišite vrste otpada ili robe koje vaša firma prikuplja. Klijenti će birati iz ove liste kada kreiraju zahtev.
        </p>
      </div>
    </div>

    {complete ? (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <Check size={18} />
          <span className="font-medium">Imate {count} vrst{count !== 1 ? 'e' : 'u'} robe</span>
        </div>
      </div>
    ) : (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="font-medium text-slate-800 mb-2">Kako dodati vrstu robe:</h4>
        <ol className="text-sm text-slate-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <span>Idite na <strong>Podešavanja</strong> u navigaciji</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <span>Kliknite na tab <strong>Vrste robe</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <span>Kliknite <strong>+ Dodaj</strong>, unesite naziv, emoji ikonu i boju</span>
          </li>
        </ol>
      </div>
    )}
  </div>
);

const StaffStep = ({ complete, staff }) => {
  const managers = staff.filter(s => s.role === 'manager').length;
  const drivers = staff.filter(s => s.role === 'driver').length;

  return (
    <div className="py-4">
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            complete ? 'bg-emerald-100' : 'bg-slate-100'
          }`}
        >
          {complete ? (
            <Check className="w-6 h-6 text-emerald-600" />
          ) : (
            <Users className="w-6 h-6 text-slate-400" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Osoblje</h3>
          <p className="text-slate-600 mt-1">
            Dodajte menadžere koji će obrađivati zahteve i vozače koji će vršiti preuzimanja.
          </p>
        </div>
      </div>

      {complete ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <Check size={18} />
            <span className="font-medium">Osoblje je dodato</span>
          </div>
          <div className="flex gap-4 text-sm text-emerald-600">
            <span>{managers} menadžer{managers !== 1 ? 'a' : ''}</span>
            <span>{drivers} vozač{drivers !== 1 ? 'a' : ''}</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h4 className="font-medium text-slate-800 mb-2">Kako dodati osoblje:</h4>
          <ol className="text-sm text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Idite na <strong>Osoblje</strong> u navigaciji</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Kliknite <strong>+ Dodaj korisnika</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Unesite podatke i izaberite ulogu (Menadžer ili Vozač)</span>
            </li>
          </ol>
          <p className="text-xs text-slate-500 mt-3">
            Tip: Korisnici će dobiti SMS sa pristupnim podacima.
          </p>
        </div>
      )}
    </div>
  );
};

export default OnboardingWizard;
