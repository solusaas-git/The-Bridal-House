import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Cost {
  _id: string;
  date: string;
  category: {
    _id: string;
    name: string;
    color: string;
  };
  amount: number;
  relatedReservation?: {
    _id: string;
    pickupDate: string;
    returnDate: string;
  };
  relatedProduct?: {
    _id: string;
    name: string;
    primaryPhoto?: string;
  };
  notes?: string;
  attachments: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CostCategory {
  _id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface CostState {
  costs: Cost[];
  costCategories: CostCategory[];
  loading: boolean;
  categoriesLoading: boolean;
  error: string | null;
  pagination: Pagination;
  filters: {
    search: string;
    category: string;
    startDate: string;
    endDate: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

const initialState: CostState = {
  costs: [],
  costCategories: [],
  loading: false,
  categoriesLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  filters: {
    search: '',
    category: '',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    sortOrder: 'desc'
  }
};

const costSlice = createSlice({
  name: 'cost',
  initialState,
  reducers: {
    setCosts: (state, action: PayloadAction<Cost[]>) => {
      state.costs = action.payload;
    },
    setCostCategories: (state, action: PayloadAction<CostCategory[]>) => {
      state.costCategories = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setCategoriesLoading: (state, action: PayloadAction<boolean>) => {
      state.categoriesLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPagination: (state, action: PayloadAction<Pagination>) => {
      state.pagination = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<CostState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    addCost: (state, action: PayloadAction<Cost>) => {
      state.costs.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateCost: (state, action: PayloadAction<Cost>) => {
      const index = state.costs.findIndex(cost => cost._id === action.payload._id);
      if (index !== -1) {
        state.costs[index] = action.payload;
      }
    },
    removeCost: (state, action: PayloadAction<string>) => {
      state.costs = state.costs.filter(cost => cost._id !== action.payload);
      state.pagination.total = Math.max(0, state.pagination.total - 1);
    },
    addCostCategory: (state, action: PayloadAction<CostCategory>) => {
      state.costCategories.push(action.payload);
    },
    updateCostCategory: (state, action: PayloadAction<CostCategory>) => {
      const index = state.costCategories.findIndex(cat => cat._id === action.payload._id);
      if (index !== -1) {
        state.costCategories[index] = action.payload;
      }
    },
    removeCostCategory: (state, action: PayloadAction<string>) => {
      state.costCategories = state.costCategories.filter(cat => cat._id !== action.payload);
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        category: '',
        startDate: '',
        endDate: '',
        sortBy: 'date',
        sortOrder: 'desc'
      };
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const {
  setCosts,
  setCostCategories,
  setLoading,
  setCategoriesLoading,
  setError,
  setPagination,
  setFilters,
  addCost,
  updateCost,
  removeCost,
  addCostCategory,
  updateCostCategory,
  removeCostCategory,
  clearFilters,
  clearError
} = costSlice.actions;

export default costSlice.reducer; 