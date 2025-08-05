'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Check } from 'lucide-react';
import { RootState } from '@/store/store';
import { updateCurrencySettings } from '@/store/reducers/settingsSlice';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const CurrencySettings = () => {
  const dispatch = useDispatch();
  const currentSettings = useSelector((state: RootState) => state.settings);
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  
  const [formData, setFormData] = useState({
    symbol: currentSettings.settings.currency,
    code: currentSettings.settings.currencyCode,
    position: currentSettings.settings.currencyPosition,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      symbol: currentSettings.settings.currency,
      code: currentSettings.settings.currencyCode,
      position: currentSettings.settings.currencyPosition,
    });
  }, [currentSettings]);

  // Predefined currency options
  const currencyOptions = [
    { symbol: '$', code: 'USD', name: 'US Dollar' },
    { symbol: '€', code: 'EUR', name: 'Euro' },
    { symbol: '£', code: 'GBP', name: 'British Pound' },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
    { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
    { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
    { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
    { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc' },
    { symbol: '¥', code: 'CNY', name: 'Chinese Yuan' },
    { symbol: 'R$', code: 'BRL', name: 'Brazilian Real' },
    { symbol: 'DH', code: 'MAD', name: 'Moroccan Dirham' },
  ];

  const handleCurrencySelect = (currency: any) => {
    setFormData({
      ...formData,
      symbol: currency.symbol,
      code: currency.code,
    });
  };

  const handleCustomChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      // Save to database via API
      const response = await axios.put('/api/settings', {
        currency: formData.symbol,
        currencyCode: formData.code,
        currencyPosition: formData.position,
      });

      // Update Redux store with the response from database
      dispatch(updateCurrencySettings({
        currency: response.data.settings.currency,
        currencyCode: response.data.settings.currencyCode,
        currencyPosition: response.data.settings.currencyPosition,
      }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      toast.success('Currency settings saved successfully');
      
    } catch (error: any) {
      console.error('Error saving currency settings:', error);
      setError(error.response?.data?.message || 'Failed to save currency settings. Please try again.');
      toast.error('Failed to save currency settings');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPreview = (amount: string) => {
    if (formData.position === 'before') {
      return `${formData.symbol}${amount}`;
    } else {
      return `${amount} ${formData.symbol}`;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Currency Settings</h2>
        <p className="text-gray-400 text-sm">
          Configure the currency symbol and formatting for your application.
        </p>
        <div className="mt-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm">
            💡 Currency settings are applied globally to all users in the system.
          </p>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-6 space-y-6">
        {/* Predefined Currencies */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-4">
            Select Currency
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {currencyOptions.map((currency) => (
              <button
                key={currency.code}
                onClick={() => handleCurrencySelect(currency)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  formData.symbol === currency.symbol && formData.code === currency.code
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 hover:border-white/20 text-white hover:bg-white/5'
                }`}
              >
                <div className="font-medium text-lg">{currency.symbol}</div>
                <div className="text-xs text-gray-400">{currency.code}</div>
                <div className="text-xs text-gray-400">{currency.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Custom Symbol
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => handleCustomChange('symbol', e.target.value)}
              placeholder="e.g., $, €, £"
              className="w-full px-4 py-2 rounded-md border border-white/20 bg-white/10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              {t('sections.currency.currencyCode')}
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleCustomChange('code', e.target.value.toUpperCase())}
              placeholder="e.g., USD, EUR, GBP"
              maxLength={3}
              className="w-full px-4 py-2 rounded-md border border-white/20 bg-white/10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-4">
            Symbol Position
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleCustomChange('position', 'before')}
              className={`p-4 rounded-lg border transition-all text-center ${
                formData.position === 'before'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-white/10 hover:border-white/20 text-white hover:bg-white/5'
              }`}
            >
              <div className="font-medium">Before Amount</div>
              <div className="text-sm text-gray-400 mt-1">
                {formatPreview('100.00')}
              </div>
            </button>
            <button
              onClick={() => handleCustomChange('position', 'after')}
              className={`p-4 rounded-lg border transition-all text-center ${
                formData.position === 'after'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-white/10 hover:border-white/20 text-white hover:bg-white/5'
              }`}
            >
              <div className="font-medium">After Amount</div>
              <div className="text-sm text-gray-400 mt-1">
                {formatPreview('100.00')}
              </div>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-200 mb-3">Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Item Price:</div>
              <div className="text-white font-medium">{formatPreview('249.99')}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Total Amount:</div>
              <div className="text-white font-medium">{formatPreview('1,299.50')}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Payment:</div>
              <div className="text-white font-medium">{formatPreview('500.00')}</div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          {error && (
            <div className="mr-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
              saveSuccess
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurrencySettings; 