import React, { createContext, useState, useContext, useEffect } from 'react';
import { en } from '../locales/en';
import { es } from '../locales/es';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Check the browser's language or default to English
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('portfolio_lang');
    if (saved) return saved;
    return 'es';
  });

  const translations = { en, es };

  useEffect(() => {
    localStorage.setItem('portfolio_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'es' : 'en'));
  };

  // Translation function pointing to dictionary map resolving flat notation (e.g. 'hero.title')
  const t = (key) => {
    const keys = key.split('.');
    let result = translations[language];
    for (let k of keys) {
      if (result[k] === undefined) {
        console.warn(`[i18n] Translation key missing: ${key}`);
        return key;
      }
      result = result[k];
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
