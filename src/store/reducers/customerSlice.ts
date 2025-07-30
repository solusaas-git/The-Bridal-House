import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  zipCode?: string;
  notes?: string;
  type?: 'Individual' | 'Business';
  status?: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

const initialState: CustomerState = {
  customers: [],
  currentCustomer: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
};

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    setCustomers: (state, action: PayloadAction<Customer[]>) => {
      state.customers = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.currentCustomer = action.payload;
    },
    addCustomer: (state, action: PayloadAction<Customer>) => {
      state.customers.unshift(action.payload);
    },
    updateCustomer: (state, action: PayloadAction<Customer>) => {
      const index = state.customers.findIndex(c => c._id === action.payload._id);
      if (index !== -1) {
        state.customers[index] = action.payload;
      }
    },
    removeCustomer: (state, action: PayloadAction<string>) => {
      state.customers = state.customers.filter(c => c._id !== action.payload);
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
    setPagination: (state, action: PayloadAction<{ totalCount: number; currentPage: number; pageSize: number }>) => {
      state.totalCount = action.payload.totalCount;
      state.currentPage = action.payload.currentPage;
      state.pageSize = action.payload.pageSize;
    },
  },
});

export const {
  setCustomers,
  setCurrentCustomer,
  addCustomer,
  updateCustomer,
  removeCustomer,
  setLoading,
  setError,
  clearError,
  setPagination,
} = customerSlice.actions;

export default customerSlice.reducer; 