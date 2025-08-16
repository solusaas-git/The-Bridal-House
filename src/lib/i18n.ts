import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Define all namespaces
const namespaces = [
  'common',
  'navigation', 
  'auth',
  'dashboard',
  'customers',
  'reservations',
  'payments',
  'products',
  'approvals',
  'language',
  'impersonation',
  'costs',
  'settings',
  'fittings',
  'shared'
];

// Translation resources with proper typing
const resources: {
  en: Record<string, any>;
  fr: Record<string, any>;
} = {
  en: {},
  fr: {}
};

// Preload all translations function
export const preloadAllTranslations = async () => {
  const languages = ['en', 'fr'];
  
  try {
    console.log('Preloading all translations...');
    
    for (const language of languages) {
      const promises = namespaces.map(async (namespace) => {
        try {
          const response = await fetch(`/locales/${language}/${namespace}.json`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          resources[language as keyof typeof resources][namespace] = data;
          // Also add to i18n instance immediately
          i18n.addResourceBundle(language, namespace, data, true, true);
          return { namespace, language, success: true };
        } catch (error) {
          console.error(`Error preloading ${namespace} translations for ${language}:`, error);
          return { namespace, language, success: false, error };
        }
      });
      
      await Promise.all(promises);
    }
    
    console.log('All translations preloaded successfully');
    return true;
  } catch (error) {
    console.error('Error preloading translations:', error);
    return false;
  }
};

// Initialize i18n only if not already initialized
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'fr',
      debug: false,
      
      // Language detection options
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
      },
      
      interpolation: {
        escapeValue: false, // React already does escaping
      },
      
      // Namespace configuration
      defaultNS: 'common',
      ns: namespaces,
      
      // Disable resource loading from backend initially
      // We'll load manually
      load: 'languageOnly',
    });
}

// Function to load translation resources for all namespaces
export const loadTranslations = async (language: string) => {
  try {
    // Load all namespaces
    const promises = namespaces.map(async (namespace) => {
      try {
        const response = await fetch(`/locales/${language}/${namespace}.json`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        i18n.addResourceBundle(language, namespace, data, true, true);
        return { namespace, data, success: true };
      } catch (error) {
        console.error(`Error loading ${namespace} translations for ${language}:`, error);
        return { namespace, data: null, success: false, error };
      }
    });

    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error(`Error loading translations for ${language}:`, error);
    return null;
  }
};

// Function to change language
export const changeLanguage = async (language: string) => {
  try {
    // Normalize to base language (e.g., en-US -> en)
    const normalized = (language || '').split('-')[0] || 'fr';
    // Check if any namespace is missing and load translations if needed
    const missingNamespaces = namespaces.filter(ns => !i18n.hasResourceBundle(normalized, ns));
    
    if (missingNamespaces.length > 0) {
      await loadTranslations(normalized);
    }
    
    // Change language
    await i18n.changeLanguage(normalized);
    
    // Store in localStorage (only on client side)
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', normalized);
    }
    
    return true;
  } catch (error) {
    console.error('Error changing language:', error);
    return false;
  }
};

export default i18n;