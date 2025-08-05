import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

interface Country {
  code: string;
  name: string;
  prefix: string;
  flag: string;
  mask: string;
  placeholder: string;
}

const COUNTRIES: Country[] = [
  {
    code: 'MA',
    name: 'Morocco',
    prefix: '+212',
    flag: '🇲🇦',
    mask: '000 00 00 00',
    placeholder: '612 34 56 78'
  },
  {
    code: 'FR',
    name: 'France',
    prefix: '+33',
    flag: '🇫🇷',
    mask: '0 00 00 00 00',
    placeholder: '1 23 45 67 89'
  },
  {
    code: 'NL',
    name: 'Netherlands',
    prefix: '+31',
    flag: '🇳🇱',
    mask: '0 0000 0000',
    placeholder: '6 1234 5678'
  },
  {
    code: 'BE',
    name: 'Belgium',
    prefix: '+32',
    flag: '🇧🇪',
    mask: '000 00 00 00',
    placeholder: '123 45 67 89'
  },
  {
    code: 'ES',
    name: 'Spain',
    prefix: '+34',
    flag: '🇪🇸',
    mask: '000 000 000',
    placeholder: '123 456 789'
  },
  {
    code: 'IT',
    name: 'Italy',
    prefix: '+39',
    flag: '🇮🇹',
    mask: '000 000 0000',
    placeholder: '123 456 7890'
  }
];

interface PhoneInputProps {
  value?: string;
  onChange?: (event: { target: { name: string; value: string } }) => void;
  name?: string;
  required?: boolean;
  className?: string;
  [key: string]: unknown; // For additional props
}

const PhoneInput: React.FC<PhoneInputProps> = ({ 
  value = '', 
  onChange, 
  name = 'phone',
  required = false,
  className = '',
  ...props 
}) => {
  const { t } = useTranslation('shared');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Morocco as default
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualPrefix, setManualPrefix] = useState('');

  // Parse existing value on component mount or when value changes
  useEffect(() => {
    if (value) {
      // Clean the value by removing any invisible characters and trimming
      const cleanValue = value.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
      
      // Try to parse existing phone number - check predefined countries first
      const country = COUNTRIES.find(c => cleanValue.startsWith(c.prefix));
      if (country) {
        setSelectedCountry(country);
        setIsManualMode(false);
        // Extract the number part after the prefix (no space required)
        const numberPart = cleanValue.slice(country.prefix.length);
        setPhoneNumber(formatPhoneNumber(numberPart, country.mask));
      } else {
        // Check if it's a manual prefix (starts with + but not in predefined countries)
        const prefixMatch = cleanValue.match(/^(\+\d{1,4})(.*)$/);
        if (prefixMatch) {
          setIsManualMode(true);
          setManualPrefix(prefixMatch[1]);
          setPhoneNumber(prefixMatch[2]);
        } else {
          // If no country prefix found, assume it's a local number for Morocco
          setIsManualMode(false);
          setPhoneNumber(formatPhoneNumber(cleanValue, selectedCountry.mask));
        }
      }
    } else {
      // Reset to default state when value is empty
      setSelectedCountry(COUNTRIES[0]);
      setIsManualMode(false);
      setPhoneNumber('');
      setManualPrefix('');
    }
  }, [value, selectedCountry.mask]);

  const formatPhoneNumber = (input: string, mask: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    let formatted = '';
    let digitIndex = 0;
    
    for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
      if (mask[i] === '0') {
        formatted += digits[digitIndex];
        digitIndex++;
      } else {
        formatted += mask[i];
      }
    }
    
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    if (isManualMode) {
      // In manual mode, just store the raw input
      setPhoneNumber(input);
      const fullNumber = input ? `${manualPrefix} ${input}` : '';
      
      if (onChange) {
        onChange({
          target: {
            name,
            value: fullNumber
          }
        });
      }
    } else {
      // Use country-specific formatting
      const formatted = formatPhoneNumber(input, selectedCountry.mask);
      setPhoneNumber(formatted);
      
      // Create the full phone number with country prefix
      const digits = formatted.replace(/\D/g, '');
      const fullNumber = digits ? `${selectedCountry.prefix} ${formatted}` : '';
      
      // Call the parent onChange with the full number
      if (onChange) {
        onChange({
          target: {
            name,
            value: fullNumber
          }
        });
      }
    }
  };

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setIsManualMode(false);
    
    // Reformat the current number with the new country's mask
    const digits = phoneNumber.replace(/\D/g, '');
    const formatted = formatPhoneNumber(digits, country.mask);
    setPhoneNumber(formatted);
    
    // Update the full number with new country prefix
    const fullNumber = digits ? `${country.prefix} ${formatted}` : '';
    if (onChange) {
      onChange({
        target: {
          name,
          value: fullNumber
        }
      });
    }
  };

  const handleManualMode = () => {
    setIsManualMode(true);
    setIsDropdownOpen(false);
    setManualPrefix('+');
    setPhoneNumber('');
    
    if (onChange) {
      onChange({
        target: {
          name,
          value: ''
        }
      });
    }
  };

  const handleManualPrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    
    // Ensure it starts with + and only contains digits after +
    if (!input.startsWith('+')) {
      input = '+' + input.replace(/\D/g, '');
    } else {
      input = '+' + input.slice(1).replace(/\D/g, '');
    }
    
    // Limit to reasonable length (+ followed by 1-4 digits)
    if (input.length > 5) {
      input = input.slice(0, 5);
    }
    
    setManualPrefix(input);
    
    // Update the full number
    const fullNumber = phoneNumber ? `${input} ${phoneNumber}` : '';
    if (onChange) {
      onChange({
        target: {
          name,
          value: fullNumber
        }
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex">
        {/* Country/Prefix Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center h-10 sm:h-11 px-2 sm:px-3 rounded-l-md border border-r-0 border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 text-xs sm:text-sm"
          >
            {isManualMode ? (
              <input
                type="text"
                value={manualPrefix}
                onChange={handleManualPrefixChange}
                className="w-10 sm:w-12 bg-transparent text-xs sm:text-sm text-white border-none outline-none"
                placeholder="+"
              />
            ) : (
              <>
                <span className="mr-1 sm:mr-2 text-sm sm:text-base">{selectedCountry.flag}</span>
                <span className="text-xs sm:text-sm">{selectedCountry.prefix}</span>
              </>
            )}
            {!isManualMode && <ChevronDownIcon className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />}
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 sm:w-64 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountryChange(country)}
                  className="w-full flex items-center px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-white/10 transition-colors text-white"
                >
                  <span className="mr-2 sm:mr-3 text-sm sm:text-base">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium text-xs sm:text-sm">{country.name}</div>
                    <div className="text-xs sm:text-sm text-gray-400">{country.prefix}</div>
                  </div>
                </button>
              ))}
              
              {/* Manual Mode Option */}
              <div className="border-t border-white/10">
                <button
                  type="button"
                  onClick={handleManualMode}
                  className="w-full flex items-center px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-white/10 transition-colors text-white"
                >
                  <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3" />
                  <div className="flex-1">
                    <div className="font-medium text-xs sm:text-sm">{t('phoneInput.otherCountry')}</div>
                    <div className="text-xs sm:text-sm text-gray-400">{t('phoneInput.enterCustomPrefix')}</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={isManualMode ? t('phoneInput.enterPhoneNumber') : selectedCountry.placeholder}
          required={required}
          className="flex-1 h-10 sm:h-11 rounded-r-md border border-white/20 bg-white/10 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...props}
        />
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default PhoneInput; 