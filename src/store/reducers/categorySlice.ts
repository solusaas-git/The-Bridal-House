import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Category {
  _id: string;
  name: string;
  description?: string;
  parentCategory?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CategoryState {
  categories: Category[];
  currentCategory: Category | null;
  loading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  currentCategory: null,
  loading: false,
  error: null,
};

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentCategory: (state, action: PayloadAction<Category | null>) => {
      state.currentCategory = action.payload;
    },
    addCategory: (state, action: PayloadAction<Category>) => {
      state.categories.unshift(action.payload);
    },
    updateCategory: (state, action: PayloadAction<Category>) => {
      const index = state.categories.findIndex(c => c._id === action.payload._id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(c => c._id !== action.payload);
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
  setCategories,
  setCurrentCategory,
  addCategory,
  updateCategory,
  removeCategory,
  setLoading,
  setError,
  clearError,
} = categorySlice.actions;

export default categorySlice.reducer; 