'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setLanguage, setLanguageLoading } from '@/store/reducers/languageSlice';
import { changeLanguage } from '@/lib/i18n';
import { toast } from 'react-toastify';
import axios from 'axios';
import { US, FR } from 'country-flag-icons/react/3x2';

const LanguageSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const { t } = useTranslation('language');
  const { currentLanguage, isLoading } = useSelector((state: RootState) => state.language);

  const languages = [
    { code: 'en', name: 'English', FlagComponent: US },
    { code: 'fr', name: 'Français', FlagComponent: FR },
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    try {
      dispatch(setLanguageLoading(true));
      
      // Change language in i18n (this will automatically update localStorage)
      const success = await changeLanguage(languageCode);
      
      if (success) {
        // Update Redux state
        dispatch(setLanguage(languageCode));
        
        // Ensure localStorage is updated (redundant but safe)
        localStorage.setItem('i18nextLng', languageCode);
        
        // Save to server (async, don't block UI)
        try {
          await axios.put('/api/user-preferences/language', {
            language: languageCode
          });
        } catch (error) {
          console.error('Error saving language preference to server:', error);
          // Don't show error to user since localStorage works
        }
        
        toast.success(t('switch') + ': ' + t(languageCode === 'en' ? 'english' : 'french'));
      }
    } catch (error) {
      console.error('Error switching language:', error);
      toast.error('Failed to switch language');
    } finally {
      dispatch(setLanguageLoading(false));
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="group flex w-full items-center rounded-lg px-3 py-3 lg:py-2 text-sm font-medium transition-colors text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('switch')}
      >
        <currentLang.FlagComponent className="mr-3 h-4 w-4 flex-shrink-0 rounded-sm" />
        <span className="flex-1 text-left">{currentLang.name}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 bottom-full mb-1 z-20 bg-gray-800 border border-white/10 rounded-lg shadow-lg w-full overflow-hidden">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  currentLanguage === language.code
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <language.FlagComponent className="h-5 w-5 rounded-sm" />
                <span>{language.name}</span>
                {currentLanguage === language.code && (
                  <span className="ml-auto text-blue-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;