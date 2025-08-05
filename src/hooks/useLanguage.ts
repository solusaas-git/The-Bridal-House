import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '@/store/store';
import { setLanguage, setLanguageLoading } from '@/store/reducers/languageSlice';
import { changeLanguage, loadTranslations } from '@/lib/i18n';
import axios from 'axios';
import { toast } from 'react-toastify';

export const useLanguage = () => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation(); // Remove default namespace, let components specify
  const { currentLanguage, isLoading } = useSelector((state: RootState) => state.language);

  // Load user's language preference on mount
  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        dispatch(setLanguageLoading(true));
        
        // Check priority order: localStorage -> API -> browser detection -> default
        let targetLanguage = 'fr'; // Default fallback
        
        // 1. First check localStorage (user's explicit choice)
        const storedLanguage = localStorage.getItem('i18nextLng');
        if (storedLanguage && ['fr', 'en'].includes(storedLanguage)) {
          targetLanguage = storedLanguage;
        } else {
          // 2. If no localStorage, try API (user's saved preference)
          try {
            const response = await axios.get('/api/user-preferences/language');
            if (response.data.success) {
              targetLanguage = response.data.language;
              // Store in localStorage for future visits
              localStorage.setItem('i18nextLng', targetLanguage);
            } else {
              // 3. Fall back to browser language detection
              targetLanguage = typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'fr';
              // Store browser-detected language in localStorage
              localStorage.setItem('i18nextLng', targetLanguage);
            }
          } catch (apiError) {
            // 4. API failed, use browser detection
            targetLanguage = typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'fr';
            // Store browser-detected language in localStorage
            localStorage.setItem('i18nextLng', targetLanguage);
          }
        }
        
        // Update Redux state
        dispatch(setLanguage(targetLanguage));
        
        // Change i18n language (this will also update localStorage)
        await changeLanguage(targetLanguage);
        
      } catch (error) {
        console.error('Error loading user language:', error);
        // Fallback to French
        const fallbackLang = 'fr';
        dispatch(setLanguage(fallbackLang));
        localStorage.setItem('i18nextLng', fallbackLang);
        await changeLanguage(fallbackLang);
      } finally {
        dispatch(setLanguageLoading(false));
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      loadUserLanguage();
    }
  }, [dispatch]);

  // Function to switch language
  const switchLanguage = async (newLanguage: string) => {
    if (newLanguage === currentLanguage) return;

    try {
      dispatch(setLanguageLoading(true));
      
      // Change language in i18n (this will automatically update localStorage)
      const success = await changeLanguage(newLanguage);
      
      if (success) {
        // Update Redux state
        dispatch(setLanguage(newLanguage));
        
        // Ensure localStorage is updated (redundant but safe)
        localStorage.setItem('i18nextLng', newLanguage);
        
        // Save to server (async, don't block UI)
        try {
          await axios.put('/api/user-preferences/language', {
            language: newLanguage
          });
        } catch (apiError) {
          console.error('Failed to save language preference to server:', apiError);
          // Don't show error to user since localStorage works
        }
        
        toast.success(t('language.switch') + ': ' + t(`language.${newLanguage === 'en' ? 'english' : 'french'}`));
      }
    } catch (error) {
      console.error('Error switching language:', error);
      toast.error('Failed to switch language');
    } finally {
      dispatch(setLanguageLoading(false));
    }
  };

  return {
    currentLanguage,
    isLoading,
    switchLanguage,
    t,
    i18n,
  };
};