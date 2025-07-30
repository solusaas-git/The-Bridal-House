import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.error = null;
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

export const { setCurrentUser, clearAuth, setLoading, setError, clearError } = authSlice.actions;
export default authSlice.reducer; 