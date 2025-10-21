import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Payment interfaces
export interface PaymentAttachment {
  name: string;
  size: number;
  url: string;
}

export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
}

export interface Reservation {
  _id: string;
  reservationNumber: string;
  eventDate: Date;
  eventTime?: string;
  eventLocation?: string;
  items?: Array<{
    _id: string;
    name: string;
    primaryPhoto?: string;
    rentalCost: number;
    size?: string;
  }>;
}

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface Payment {
  _id: string;
  client: Customer;
  reservation: Reservation;
  paymentDate?: Date;
  amount?: number;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Check';
  paymentType?: 'Advance' | 'Security' | 'Final' | 'Other';
  status?: 'Pending' | 'Completed' | 'Cancelled' | 'Refunded';
  reference?: string;
  note?: string;
  attachments: PaymentAttachment[];
  createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentFilters {
  customer?: string;
  paymentMethod?: string;
  paymentType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaymentState {
  payments: Payment[];
  currentPayment: Payment | null;
  loading: boolean;
  error: string | null;
  
  // Pagination
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  
  // Filters and search
  filters: PaymentFilters;
  searchTerm: string;
  
  // UI state
  showAddModal: boolean;
  showEditModal: boolean;
  showDeleteModal: boolean;
  selectedPaymentId: string | null;
  
  // Count tracking
  recentCount: number;
  todayCount: number;
  countLoading: boolean;
}

const initialState: PaymentState = {
  payments: [],
  currentPayment: null,
  loading: false,
  error: null,
  
  // Pagination
  totalCount: 0,
  currentPage: 1,
  pageSize: 50,
  totalPages: 0,
  
  // Filters and search
  filters: {},
  searchTerm: '',
  
  // UI state
  showAddModal: false,
  showEditModal: false,
  showDeleteModal: false,
  selectedPaymentId: null,
  
  // Count tracking
  recentCount: 0,
  todayCount: 0,
  countLoading: false,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    // Payment CRUD operations
    setPayments: (state, action: PayloadAction<{
      payments: Payment[];
      totalCount: number;
      currentPage: number;
      pageSize: number;
      totalPages: number;
    }>) => {
      state.payments = action.payload.payments;
      state.totalCount = action.payload.totalCount;
      state.currentPage = action.payload.currentPage;
      state.pageSize = action.payload.pageSize;
      state.totalPages = action.payload.totalPages;
      state.loading = false;
      state.error = null;
    },
    
    addPayment: (state, action: PayloadAction<Payment>) => {
      state.payments.unshift(action.payload);
      state.totalCount += 1;
      state.loading = false;
      state.error = null;
    },
    
    updatePayment: (state, action: PayloadAction<Payment>) => {
      const index = state.payments.findIndex(
        payment => payment._id === action.payload._id
      );
      if (index !== -1) {
        state.payments[index] = action.payload;
      }
      
      // Update current payment if it's the same
      if (state.currentPayment?._id === action.payload._id) {
        state.currentPayment = action.payload;
      }
      
      state.loading = false;
      state.error = null;
    },
    
    deletePayment: (state, action: PayloadAction<string>) => {
      state.payments = state.payments.filter(
        payment => payment._id !== action.payload
      );
      state.totalCount = Math.max(0, state.totalCount - 1);
      
      // Clear current payment if it was deleted
      if (state.currentPayment?._id === action.payload) {
        state.currentPayment = null;
      }
      
      state.loading = false;
      state.error = null;
    },
    
    // Current payment management
    setCurrentPayment: (state, action: PayloadAction<Payment | null>) => {
      state.currentPayment = action.payload;
      state.loading = false;
      state.error = null;
    },
    
    clearCurrentPayment: (state) => {
      state.currentPayment = null;
    },
    
    // Pagination
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.currentPage = 1; // Reset to first page when page size changes
    },
    
    // Filters and search
    setFilters: (state, action: PayloadAction<PaymentFilters>) => {
      state.filters = action.payload;
      state.currentPage = 1; // Reset to first page when filters change
    },
    
    updateFilter: (state, action: PayloadAction<{ key: keyof PaymentFilters; value: string }>) => {
      state.filters[action.payload.key] = action.payload.value;
      state.currentPage = 1; // Reset to first page when filter changes
    },
    
    clearFilters: (state) => {
      state.filters = {};
      state.searchTerm = '';
      state.currentPage = 1;
    },
    
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      state.currentPage = 1; // Reset to first page when search changes
    },
    
    // UI state management
    setShowAddModal: (state, action: PayloadAction<boolean>) => {
      state.showAddModal = action.payload;
    },
    
    setShowEditModal: (state, action: PayloadAction<boolean>) => {
      state.showEditModal = action.payload;
    },
    
    setShowDeleteModal: (state, action: PayloadAction<boolean>) => {
      state.showDeleteModal = action.payload;
    },
    
    setSelectedPaymentId: (state, action: PayloadAction<string | null>) => {
      state.selectedPaymentId = action.payload;
    },
    
    // Bulk operations
    clearAllPayments: (state) => {
      state.payments = [];
      state.currentPayment = null;
      state.totalCount = 0;
      state.currentPage = 1;
      state.totalPages = 0;
    },
    
    // Count management
    setRecentCount: (state, action: PayloadAction<number>) => {
      state.recentCount = action.payload;
    },
    
    setTodayCount: (state, action: PayloadAction<number>) => {
      state.todayCount = action.payload;
    },
    
    setCountLoading: (state, action: PayloadAction<boolean>) => {
      state.countLoading = action.payload;
    },
    
    incrementRecentCount: (state) => {
      state.recentCount += 1;
    },
    
    incrementTodayCount: (state) => {
      state.todayCount += 1;
    },
    
    // Reset state
    resetPaymentState: () => initialState,
  },
});

export const {
  // Loading states
  setLoading,
  setError,
  
  // Payment CRUD operations
  setPayments,
  addPayment,
  updatePayment,
  deletePayment,
  
  // Current payment management
  setCurrentPayment,
  clearCurrentPayment,
  
  // Pagination
  setCurrentPage,
  setPageSize,
  
  // Filters and search
  setFilters,
  updateFilter,
  clearFilters,
  setSearchTerm,
  
  // UI state management
  setShowAddModal,
  setShowEditModal,
  setShowDeleteModal,
  setSelectedPaymentId,
  
  // Count management
  setRecentCount,
  setTodayCount,
  setCountLoading,
  incrementRecentCount,
  incrementTodayCount,
  
  // Bulk operations
  clearAllPayments,
  
  // Reset state
  resetPaymentState,
} = paymentSlice.actions;

export default paymentSlice.reducer; 