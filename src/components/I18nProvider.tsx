'use client';

import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize i18n and preload all translations on client side only
    const initI18n = async () => {
      try {
        if (!i18n.isInitialized) {
          await i18n.init();
        }
        
        // Preload all translations for both languages
        const { preloadAllTranslations } = await import('@/lib/i18n');
        await preloadAllTranslations();
        
        // Now reinitialize with the preloaded resources
        await i18n.reloadResources();
        
        // Set the current language - check localStorage first, then i18n default
        let currentLang = 'fr'; // Default fallback
        
        // Check localStorage for user's explicit choice
        const storedLanguage = localStorage.getItem('i18nextLng');
        if (storedLanguage && ['fr', 'en'].includes(storedLanguage)) {
          currentLang = storedLanguage;
        } else {
          // Fall back to i18n detected language
          currentLang = i18n.language || 'fr';
        }
        
        await i18n.changeLanguage(currentLang);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setIsInitialized(true); // Still set to true to render children
      }
    };

    initI18n();
  }, []);

  // Don't render children until i18n is initialized and all translations are preloaded
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading translations...</p>
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}