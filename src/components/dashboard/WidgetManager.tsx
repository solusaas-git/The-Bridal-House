'use client';

import React, { useState } from 'react';
import { Settings, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Widget {
  id: string;
  label: string;
  width: string;
}

interface WidgetManagerProps {
  availableWidgets: Widget[];
  visibleWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
}

const WidgetManager: React.FC<WidgetManagerProps> = ({
  availableWidgets,
  visibleWidgets,
  onToggleWidget,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation('dashboard');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 h-8 px-3 py-1 text-xs font-medium text-white bg-white/10 border border-white/20 rounded-md hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-lg w-full"
      >
        <Settings className="h-4 w-4" />
        {t('widgets.widgetManager.customize')}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-20">
            <div className="p-4">
              <h3 className="text-sm font-medium text-white mb-3">
                Dashboard Widgets
              </h3>
              
              <div className="space-y-2">
                {availableWidgets.map((widget) => {
                  const isVisible = visibleWidgets.includes(widget.id);
                  
                  return (
                    <label
                      key={widget.id}
                      className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-md cursor-pointer"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => onToggleWidget(widget.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 border-2 rounded ${
                          isVisible 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-500'
                        } flex items-center justify-center`}>
                          {isVisible && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      
                      <span className="text-sm text-gray-300">
                        {widget.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-3 border-t border-white/20">
                <p className="text-xs text-gray-400">
                  Toggle widgets to customize your dashboard view
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WidgetManager; 