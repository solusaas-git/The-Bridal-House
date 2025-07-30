import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Item {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  status: 'Draft' | 'Published';
  price?: number;
  size?: string;
  color?: string;
  material?: string;
  designer?: string;
  primaryPhoto?: string;
  secondaryImages?: string[];
  videos?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface ItemState {
  items: Item[];
  currentItem: Item | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: {
    search: string;
    category: string;
    status: string;
  };
}

const initialState: ItemState = {
  items: [],
  currentItem: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    search: '',
    category: '',
    status: '',
  },
};

const itemSlice = createSlice({
  name: 'item',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<Item[]>) => {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentItem: (state, action: PayloadAction<Item | null>) => {
      state.currentItem = action.payload;
    },
    addItem: (state, action: PayloadAction<Item>) => {
      state.items.unshift(action.payload);
    },
    updateItem: (state, action: PayloadAction<Item>) => {
      const index = state.items.findIndex(i => i._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i._id !== action.payload);
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
  setItems,
  setCurrentItem,
  addItem,
  updateItem,
  removeItem,
  setLoading,
  setError,
  clearError,
  setPagination,
  setFilters,
} = itemSlice.actions;

export default itemSlice.reducer; 