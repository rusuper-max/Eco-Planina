import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, COUNTRY_CODES } from '../i18n/translations';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('sr'); // Default to Serbian
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('app_language');
        if (savedLang && (savedLang === 'sr' || savedLang === 'en')) {
          setLanguage(savedLang);
        }
      } catch (e) {
        console.error('Failed to load language:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLanguage();
  }, []);

  // Change language and persist
  const changeLanguage = async (lang) => {
    if (lang !== 'sr' && lang !== 'en') return;
    try {
      await AsyncStorage.setItem('app_language', lang);
      setLanguage(lang);
    } catch (e) {
      console.error('Failed to save language:', e);
    }
  };

  // Translation function
  const t = (key) => {
    return translations[language]?.[key] || translations['sr'][key] || key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    isLoading,
    countryCodes: COUNTRY_CODES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
