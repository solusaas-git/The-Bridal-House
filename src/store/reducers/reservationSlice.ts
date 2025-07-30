import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ReservationItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Reservation {
  _id: string;
  customerId: string;
  type: 'Rental' | 'Purchase';
  status: 'Draft' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  items: ReservationItem[];
  pickupDate: string;
  returnDate: string;
  availabilityDate?: string;
  totalAmount: number;
  deposit?: number;
  notes?: string;
  client?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ReservationState {
  reservations: Reservation[];
  currentReservation: Reservation | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: {
    search: string;
    status: string;
    type: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

const initialState: ReservationState = {
  reservations: [],
  currentReservation: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    search: '',
    status: '',
    type: '',
    dateRange: {
      start: '',
      end: '',
    },
  },
};

const reservationSlice = createSlice({
  name: 'reservation',
  initialState,
  reducers: {
    setReservations: (state, action: PayloadAction<Reservation[]>) => {
      state.reservations = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentReservation: (state, action: PayloadAction<Reservation | null>) => {
      state.currentReservation = action.payload;
    },
    addReservation: (state, action: PayloadAction<Reservation>) => {
      state.reservations.unshift(action.payload);
    },
    updateReservation: (state, action: PayloadAction<Reservation>) => {
      const index = state.reservations.findIndex(r => r._id === action.payload._id);
      if (index !== -1) {
        state.reservations[index] = action.payload;
      }
    },
    removeReservation: (state, action: PayloadAction<string>) => {
      state.reservations = state.reservations.filter(r => r._id !== action.payload);
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
    setFilters: (state, action: PayloadAction<Partial<typeof initialState.filters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
});

export const {
  setReservations,
  setCurrentReservation,
  addReservation,
  updateReservation,
  removeReservation,
  setLoading,
  setError,
  clearError,
  setPagination,
  setFilters,
} = reservationSlice.actions;

export default reservationSlice.reducer; 