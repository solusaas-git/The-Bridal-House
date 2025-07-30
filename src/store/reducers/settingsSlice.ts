import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  isSystem?: boolean;
}

interface Settings {
  currency: string;
  currencyCode: string;
  currencyPosition: 'before' | 'after';
  roles: Role[];
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
}

interface SettingsState {
  settings: Settings;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: {
    currency: 'DH',
    currencyCode: 'MAD',
    currencyPosition: 'after',
    roles: [
      { 
        id: 'admin', 
        name: 'Administrator', 
        permissions: ['*'], 
        description: 'Full system access with all permissions',
        isSystem: true 
      },
      { 
        id: 'manager', 
        name: 'Manager', 
        permissions: ['customers', 'products', 'reservations', 'payments', 'approvals'], 
        description: 'Manager level access to core business functions',
        isSystem: true 
      },
      { 
        id: 'employee', 
        name: 'Employee', 
        permissions: ['customers', 'reservations', 'payments'], 
        description: 'Basic access to daily operations',
        isSystem: true 
      },
    ],
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    business: {
      name: 'The Bridal House',
      address: '',
      phone: '',
      email: '',
    },
  },
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Partial<Settings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      state.loading = false;
      state.error = null;
    },
    updateCurrencySettings: (state, action: PayloadAction<{ currency: string; currencyCode: string; currencyPosition: 'before' | 'after' }>) => {
      state.settings.currency = action.payload.currency;
      state.settings.currencyCode = action.payload.currencyCode;
      state.settings.currencyPosition = action.payload.currencyPosition;
    },
    updateBusinessSettings: (state, action: PayloadAction<Partial<Settings['business']>>) => {
      state.settings.business = { ...state.settings.business, ...action.payload };
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<Settings['notifications']>>) => {
      state.settings.notifications = { ...state.settings.notifications, ...action.payload };
    },
    setRoles: (state, action: PayloadAction<Role[]>) => {
      state.settings.roles = action.payload;
    },
    addRole: (state, action: PayloadAction<Role>) => {
      state.settings.roles.push(action.payload);
    },
    updateRole: (state, action: PayloadAction<Role>) => {
      const index = state.settings.roles.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.settings.roles[index] = action.payload;
      }
    },
    removeRole: (state, action: PayloadAction<string>) => {
      state.settings.roles = state.settings.roles.filter(r => r.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setSettings,
  updateCurrencySettings,
  updateBusinessSettings,
  updateNotificationSettings,
  setRoles,
  addRole,
  updateRole,
  removeRole,
  setLoading,
  setError,
  clearError,
} = settingsSlice.actions;

export default settingsSlice.reducer; 