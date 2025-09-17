import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Default widgets that should be visible - defined outside to avoid dependency issues
const DEFAULT_WIDGETS = [
  'stats',
  'pickups', 
  'returns',
  'quickActions',
  'systemHealth'
];

export const useWidgetVisibility = () => {
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load widget preferences from API
  useEffect(() => {
    const loadWidgetPreferences = async () => {
      try {
        const response = await axios.get('/api/user-preferences/widgets');
        if (response.data.success) {
          setVisibleWidgets(response.data.widgetPreferences || DEFAULT_WIDGETS);
        } else {
          // Fall back to localStorage if API fails
          const savedWidgets = localStorage.getItem('visibleWidgets');
          if (savedWidgets) {
            try {
              const parsed = JSON.parse(savedWidgets);
              if (Array.isArray(parsed)) {
                setVisibleWidgets(parsed);
              } else {
                setVisibleWidgets(DEFAULT_WIDGETS);
              }
            } catch (error) {
              console.error('Error parsing saved widgets from localStorage:', error);
              setVisibleWidgets(DEFAULT_WIDGETS);
            }
          } else {
            setVisibleWidgets(DEFAULT_WIDGETS);
          }
        }
      } catch (error) {
        console.error('Error loading widget preferences:', error);
        // Fall back to localStorage
        const savedWidgets = localStorage.getItem('visibleWidgets');
        if (savedWidgets) {
          try {
            const parsed = JSON.parse(savedWidgets);
            if (Array.isArray(parsed)) {
              setVisibleWidgets(parsed);
            } else {
              setVisibleWidgets(DEFAULT_WIDGETS);
            }
          } catch (parseError) {
            console.error('Error parsing saved widgets from localStorage (fallback):', parseError);
            setVisibleWidgets(DEFAULT_WIDGETS);
          }
        } else {
          setVisibleWidgets(DEFAULT_WIDGETS);
        }
      } finally {
        setLoading(false);
      }
    };

    loadWidgetPreferences();
  }, []);

  const toggleWidget = useCallback(async (widgetId) => {
    const newVisibleWidgets = visibleWidgets.includes(widgetId)
      ? visibleWidgets.filter(id => id !== widgetId)
      : [...visibleWidgets, widgetId];
    
    // Update state immediately for better UX
    setVisibleWidgets(newVisibleWidgets);
    
    // Save to localStorage as backup
    localStorage.setItem('visibleWidgets', JSON.stringify(newVisibleWidgets));
    
    // Save to API
    try {
      setSaving(true);
      await axios.put('/api/user-preferences/widgets', {
        widgetVisibility: newVisibleWidgets
      });
    } catch (error) {
      console.error('Error saving widget preferences:', error);
      // Could show a toast notification here if needed
    } finally {
      setSaving(false);
    }
  }, [visibleWidgets]);

  return {
    visibleWidgets,
    toggleWidget,
    loading,
    saving
  };
}; 