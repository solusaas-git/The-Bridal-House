import { useState, useEffect, useCallback } from 'react';

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

  useEffect(() => {
    // Try to load from localStorage first
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
        console.error('Error parsing saved widgets:', error);
        setVisibleWidgets(DEFAULT_WIDGETS);
      }
    } else {
      setVisibleWidgets(DEFAULT_WIDGETS);
    }
    setLoading(false);
  }, []);

  const toggleWidget = useCallback((widgetId) => {
    setVisibleWidgets((prev) => {
      const newVisibleWidgets = prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId];
      
      localStorage.setItem('visibleWidgets', JSON.stringify(newVisibleWidgets));
      return newVisibleWidgets;
    });
  }, []);

  return {
    visibleWidgets,
    toggleWidget,
    loading
  };
}; 