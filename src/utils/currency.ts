interface CurrencySettings {
  settings?: {
    currency?: string;
    currencyCode?: string;
    currencyPosition?: 'before' | 'after';
  };
}

export const formatCurrency = (
  amount: number, 
  currencySettings?: CurrencySettings
): string => {
  const settings = currencySettings?.settings;
  const currency = settings?.currency || 'DH';
  const position = settings?.currencyPosition || 'after';
  
  // Format the number with proper decimal places
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  // Apply currency position
  if (position === 'after') {
    return `${formattedAmount} ${currency}`;
  }
  
  return `${currency}${formattedAmount}`;
};

export const parseCurrency = (
  value: string, 
  currencySettings?: CurrencySettings
): number => {
  const settings = currencySettings?.settings;
  const currency = settings?.currency || 'DH';
  
  // Remove currency symbol and any spaces
  const cleanValue = value.replace(new RegExp(`[${currency}\\s,]`, 'g'), '');
  
  // Parse as float
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? 0 : parsed;
};

export const getCurrencySymbol = (currencySettings?: CurrencySettings): string => {
  return currencySettings?.settings?.currency || 'DH';
};

export const getCurrencyCode = (currencySettings?: CurrencySettings): string => {
  return currencySettings?.settings?.currencyCode || 'MAD';
}; 