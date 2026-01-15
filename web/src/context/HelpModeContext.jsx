import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const HelpModeContext = createContext(null);

const STORAGE_KEY = 'ecologistics_help_intro_seen';

/**
 * HelpModeProvider - Upravlja Help režimom za Manager i Company Admin
 *
 * Funkcionalnosti:
 * - Toggle Help Mode koji prikazuje tooltip-e na elementima sa data-help atributom
 * - Pamti da li je korisnik već video intro
 * - Prikazuje pulsiranje na Help dugmetu dok korisnik ne klikne prvi put
 */
export const HelpModeProvider = ({ children }) => {
    const [isHelpMode, setIsHelpMode] = useState(false);
    const [hasSeenIntro, setHasSeenIntro] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    // Toggle help mode
    const toggleHelpMode = useCallback(() => {
        setIsHelpMode(prev => !prev);
    }, []);

    // Uključi help mode
    const enableHelpMode = useCallback(() => {
        setIsHelpMode(true);
    }, []);

    // Isključi help mode
    const disableHelpMode = useCallback(() => {
        setIsHelpMode(false);
    }, []);

    // Označi da je korisnik video intro (pritisnuo Help dugme prvi put)
    const markIntroAsSeen = useCallback(() => {
        setHasSeenIntro(true);
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
            // localStorage nije dostupan
        }
    }, []);

    // Reset intro (za testiranje ili ako korisnik želi ponovo da vidi)
    const resetIntro = useCallback(() => {
        setHasSeenIntro(false);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // localStorage nije dostupan
        }
    }, []);

    // Escape key zatvara help mode
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isHelpMode) {
                disableHelpMode();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHelpMode, disableHelpMode]);

    const value = {
        isHelpMode,
        hasSeenIntro,
        toggleHelpMode,
        enableHelpMode,
        disableHelpMode,
        markIntroAsSeen,
        resetIntro,
    };

    return (
        <HelpModeContext.Provider value={value}>
            {children}
        </HelpModeContext.Provider>
    );
};

export const useHelpMode = () => {
    const context = useContext(HelpModeContext);
    if (!context) {
        throw new Error('useHelpMode must be used within a HelpModeProvider');
    }
    return context;
};

export default HelpModeContext;
