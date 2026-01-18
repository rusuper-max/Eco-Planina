import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle } from 'lucide-react';
import { useHelpMode } from '../../context';

/**
 * Definicije pomoći za različite elemente
 * Ključ je data-help atribut, vrednost je title i description
 */
const HELP_DEFINITIONS = {
    // Sidebar groups
    'sidebar-group-requests': {
        title: 'Zahtevi',
        description: 'Sekcija za upravljanje zahtevima za odvoz. Uključuje aktivne zahteve koji čekaju obradu, istoriju završenih odvoza i evidenciju svih aktivnosti.'
    },
    'sidebar-group-analytics': {
        title: 'Analitika',
        description: 'Sekcija za praćenje statistike i izveštaja. Ovde možete videti grafikone, uporedne analize učinka zaposlenih i generisati izveštaje za štampu ili Excel.'
    },
    'sidebar-group-admin': {
        title: 'Administracija',
        description: 'Sekcija za upravljanje firmom. Ovde dodajete osoblje (menadžere, vozače), kreirate filijale i vizuelno pregledavate organizacionu strukturu.'
    },
    'sidebar-group-people': {
        title: 'Ljudstvo',
        description: 'Sekcija za upravljanje ljudima. Ovde pristupate listi klijenata vaše filijale i upravljate vozačima koji izvršavaju odvoz.'
    },
    'sidebar-group-settings': {
        title: 'Podešavanja',
        description: 'Sekcija za konfiguraciju sistema. Ovde definišete tipove opreme (kontejneri) i vrste sekundarnih sirovina koje firma sakuplja.'
    },
    // Sidebar items - Manager
    'sidebar-dashboard': {
        title: 'Kontrolna tabla',
        description: 'Početna stranica sa pregledom: koliko zahteva čeka, koliko je danas obrađeno, brzi pristup najvažnijim funkcijama. Idealno za jutarnji pregled stanja.'
    },
    'sidebar-requests': {
        title: 'Zahtevi za odvoz',
        description: 'Ovde vidite sve zahteve koje su klijenti poslali. Možete ih sortirati po hitnosti, dodeliti vozaču, ili direktno obraditi unosom težine. Crveni badge pokazuje koliko zahteva čeka.'
    },
    'sidebar-history': {
        title: 'Istorija odvoza',
        description: 'Arhiva svih završenih odvoza sa datumima, težinama i fotografijama. Koristite za proveru prethodnih odvoza, reklamacije ili izveštavanje klijentima.'
    },
    'sidebar-clients': {
        title: 'Klijenti',
        description: 'Lista svih klijenata vaše filijale. Ovde možete videti njihove adrese, kontakte, koja oprema im je dodeljena i koje vrste robe mogu da predaju.'
    },
    'sidebar-drivers': {
        title: 'Vozači',
        description: 'Pregled vozača i njihovih trenutnih zadataka. Vidite ko je dostupan, ko je na terenu, i možete im dodeliti nove rute za odvoz.'
    },
    'sidebar-equipment': {
        title: 'Oprema i vrste robe',
        description: 'Definišite tipove kontejnera (npr. 1100L, 240L) i vrste robe koje firma sakuplja (plastika, karton, staklo...). Ovo se kasnije dodeljuje klijentima.'
    },
    'sidebar-analytics': {
        title: 'Analitika i izveštaji',
        description: 'Grafikoni i statistike: koliko kg po vrsti robe, koji klijenti najviše predaju, mesečni/godišnji pregledi. Korisno za planiranje i fakturisanje.'
    },
    'sidebar-print': {
        title: 'Štampanje i export',
        description: 'Generišite izveštaje za štampu ili Excel export. Možete filtrirati po klijentu, vrsti robe i periodu. Idealno za mesečne izveštaje i fakture.'
    },
    'sidebar-messages': {
        title: 'Poruke',
        description: 'Chat sa klijentima i kolegama. Ovde stižu i sistemska obaveštenja. Crveni badge pokazuje nepročitane poruke.'
    },
    'sidebar-map': {
        title: 'Mapa klijenata',
        description: 'Vizuelni prikaz svih klijenata na mapi. Korisno za planiranje ruta, proveru lokacija i pregled geografske pokrivenosti.'
    },
    // Sidebar items - Company Admin
    'sidebar-staff': {
        title: 'Upravljanje osobljem',
        description: 'Dodajte nove menadžere i vozače, dodelite ih filijalama, resetujte lozinke. Ovde upravljate svim zaposlenima u firmi.'
    },
    'sidebar-settings': {
        title: 'Podešavanja firme',
        description: 'Osnovni podaci o firmi: naziv, logo, radno vreme, kontakt informacije. Ove informacije vide i vaši klijenti.'
    },
    'sidebar-regions': {
        title: 'Filijale (regioni)',
        description: 'Kreirajte i upravljajte filijalama vaše firme. Svaka filijala ima svoje menadžere, vozače i klijente koji su međusobno izolovani.'
    },
    'sidebar-activity-log': {
        title: 'Evidencija aktivnosti',
        description: 'Audit trail - pregled svih akcija u sistemu: ko je kreirao zahtev, ko je obradio, ko je dodelio vozaču. Koristi za praćenje rada i rešavanje sporova.'
    },
    'sidebar-visual-editor': {
        title: 'Vizuelni editor',
        description: 'Grafički prikaz strukture firme - filijale, menadžeri i vozači u obliku dijagrama. Korisno za brzi pregled organizacione hijerarhije.'
    },
    'sidebar-manager-analytics': {
        title: 'Učinak menadžera',
        description: 'Statistike po menadžerima: koliko zahteva je svaki obradio, prosečno vreme obrade, uporedna analiza produktivnosti.'
    },
    'sidebar-driver-analytics': {
        title: 'Učinak vozača',
        description: 'Statistike po vozačima: koliko dostava je završio, ukupna težina, prosečno vreme. Korisno za evaluaciju i planiranje resursa.'
    },
    'sidebar-wastetypes': {
        title: 'Vrste robe',
        description: 'Definišite koje vrste sekundarnih sirovina firma sakuplja (plastika, karton, staklo, metal...). Možete dodati nove i prilagoditi cene.'
    },
    // Header elements
    'header-notifications': {
        title: 'Obaveštenja',
        description: 'Zvonce prikazuje nove zahteve, poruke od klijenata i sistemska upozorenja. Crveni broj pokazuje koliko nepročitanih obaveštenja imate.'
    },
    'header-profile': {
        title: 'Vaš profil',
        description: 'Pristup vašim podešavanjima, promena lozinke i odjava iz sistema. Ovde vidite i u koju filijalu ste trenutno prijavljeni.'
    },
    // Dashboard elements
    'stat-active-requests': {
        title: 'Zahtevi na čekanju',
        description: 'Ukupan broj zahteva koji još nisu obrađeni. Kliknite da odmah pređete na listu zahteva i počnete sa obradom.'
    },
    'stat-today-weight': {
        title: 'Danas sakupljeno',
        description: 'Zbirna težina sve robe koju ste danas obradili. Resetuje se svaki dan u ponoć. Korisno za praćenje dnevnog učinka.'
    },
    'stat-total-clients': {
        title: 'Broj klijenata',
        description: 'Ukupan broj aktivnih klijenata u vašoj filijali. Neaktivni i obrisani klijenti se ne računaju.'
    },
    // Request elements
    'request-urgency': {
        title: 'Indikator hitnosti',
        description: 'Zeleno = standardan zahtev, ima vremena. Žuto = ističe uskoro, požurite. Crveno = HITNO, kontejner je pun ili je prošao rok!'
    },
    'request-process-btn': {
        title: 'Obrada zahteva',
        description: 'Kliknite kada vozač završi odvoz. Unesite izmerenu težinu, opciono dodajte fotografiju kao dokaz, i zahtev prelazi u istoriju.'
    },
    // Client elements
    'client-equipment': {
        title: 'Dodela opreme',
        description: 'Ovde birate koje kontejnere klijent ima (npr. 1100L za plastiku) i koje vrste robe može da predaje. Klijent vidi samo ono što mu je ovde dodeljeno.'
    },
    'client-location': {
        title: 'Lokacija na mapi',
        description: 'GPS koordinate klijenta za navigaciju vozača. Možete ručno pomeriti marker ako automatska lokacija nije tačna.'
    },
    // Action buttons
    'btn-create-request': {
        title: 'Novi zahtev (telefonski)',
        description: 'Kada vas klijent pozove telefonom, ovde možete kreirati zahtev u njegovo ime. Izaberite klijenta, vrstu robe i nivo popunjenosti.'
    },
    'btn-add-client': {
        title: 'Dodavanje klijenta',
        description: 'Registrujte novog klijenta: unesite naziv, adresu, kontakt i dodelite mu filijalu. Nakon toga možete dodeliti opremu i vrste robe.'
    },
    'btn-add-staff': {
        title: 'Dodavanje zaposlenog',
        description: 'Kreirajte nalog za novog menadžera ili vozača. Oni će dobiti email sa linkom za postavljanje lozinke.'
    },
};

/**
 * HelpOverlay - Prikazuje sve tooltip-e kada je Help Mode aktivan
 * Skenira DOM za elemente sa data-help atributom
 */
export const HelpOverlay = () => {
    const { isHelpMode, disableHelpMode } = useHelpMode();
    const [tooltips, setTooltips] = useState([]);

    // Skeniraj DOM i pronađi sve data-help elemente
    const scanForHelpElements = useCallback(() => {
        if (!isHelpMode) {
            setTooltips([]);
            return;
        }

        const elements = document.querySelectorAll('[data-help]');
        const newTooltips = [];

        elements.forEach((el) => {
            const helpKey = el.getAttribute('data-help');
            const definition = HELP_DEFINITIONS[helpKey];

            if (definition) {
                const rect = el.getBoundingClientRect();
                // Proveri da li je element vidljiv
                if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
                    newTooltips.push({
                        key: helpKey,
                        ...definition,
                        rect,
                        element: el
                    });
                }
            }
        });

        setTooltips(newTooltips);
    }, [isHelpMode]);

    // Skeniraj prilikom uključivanja help mode-a i na scroll/resize
    useEffect(() => {
        if (!isHelpMode) {
            setTooltips([]);
            return;
        }

        // Malo kašnjenje da se DOM stabilizuje
        const timer = setTimeout(scanForHelpElements, 100);

        window.addEventListener('scroll', scanForHelpElements, true);
        window.addEventListener('resize', scanForHelpElements);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', scanForHelpElements, true);
            window.removeEventListener('resize', scanForHelpElements);
        };
    }, [isHelpMode, scanForHelpElements]);

    if (!isHelpMode) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9998]">
            {/* Semi-transparent overlay */}
            <div
                className="absolute inset-0 bg-black/30"
                onClick={disableHelpMode}
            />

            {/* Help Mode indicator */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-[9999] animate-fadeIn">
                <HelpCircle size={20} />
                <span className="font-medium">Help Mode</span>
                <span className="text-blue-200 text-sm hidden sm:inline">• Kliknite bilo gde za zatvaranje</span>
                <button
                    onClick={disableHelpMode}
                    className="ml-2 p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Highlight elements */}
            {tooltips.map((tooltip, index) => (
                <HelpHighlight key={tooltip.key} tooltip={tooltip} index={index} />
            ))}

            {/* Help panel - scrollable list of all tooltips */}
            <div className="fixed right-4 top-20 bottom-4 w-80 bg-slate-800 rounded-2xl shadow-2xl z-[9999] flex flex-col animate-fadeIn overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                    <h3 className="font-bold text-white text-lg">Vodič kroz interfejs</h3>
                    <p className="text-slate-400 text-sm mt-1">Pronađite brojeve na ekranu</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {tooltips.map((tooltip, index) => (
                        <div
                            key={tooltip.key}
                            className="bg-slate-700/50 rounded-xl p-3 hover:bg-slate-700 transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                    {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-blue-300 text-sm">{tooltip.title}</h4>
                                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                                        {tooltip.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-700 text-center">
                    <span className="text-slate-500 text-xs">Pritisnite ESC ili kliknite van za zatvaranje</span>
                </div>
            </div>
        </div>,
        document.body
    );
};

/**
 * HelpHighlight - Prikazuje highlight oko elementa i broj
 */
const HelpHighlight = ({ tooltip, index }) => {
    const { rect } = tooltip;
    const padding = 4;

    return (
        <>
            {/* Highlight box */}
            <div
                className="absolute bg-blue-500/20 border-2 border-blue-500 rounded-lg pointer-events-none z-[9999]"
                style={{
                    left: rect.left - padding,
                    top: rect.top - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                }}
            />

            {/* Number badge */}
            <div
                className="absolute w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold z-[9999] pointer-events-none"
                style={{
                    left: rect.left - 8,
                    top: rect.top - 8,
                }}
            >
                {index + 1}
            </div>
        </>
    );
};

/**
 * HelpTooltip - Wrapper komponenta za dodavanje help atributa
 * Koristi se za inline wrapping elemenata
 */
export const HelpTooltip = ({ children, helpKey }) => {
    return (
        <div data-help={helpKey} className="contents">
            {children}
        </div>
    );
};

/**
 * HelpButton - Dugme za toggle Help Mode-a
 * Prikazuje pulsiranje ako korisnik nije još kliknuo
 */
export const HelpButton = ({ className = '' }) => {
    const { isHelpMode, hasSeenIntro, toggleHelpMode, markIntroAsSeen } = useHelpMode();

    const handleClick = () => {
        if (!hasSeenIntro) {
            markIntroAsSeen();
        }
        toggleHelpMode();
    };

    return (
        <button
            onClick={handleClick}
            className={`relative p-2.5 rounded-xl transition-all ${
                isHelpMode
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            } ${className}`}
            title={isHelpMode ? 'Isključi pomoć (Esc)' : 'Uključi pomoć'}
        >
            {/* Pulsiranje ako nije video intro */}
            {!hasSeenIntro && !isHelpMode && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
            )}
            <HelpCircle size={20} />
        </button>
    );
};

export default HelpTooltip;
