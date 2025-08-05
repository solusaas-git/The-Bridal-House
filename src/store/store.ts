import { configureStore } from '@reduxjs/toolkit';
import authReducer from './reducers/authSlice';
import categoryReducer from './reducers/categorySlice';
import settingsReducer from './reducers/settingsSlice';
import userReducer from './reducers/userSlice';
import approvalReducer from './reducers/approvalSlice';
import costReducer from './reducers/costSlice';
import customerReducer from './reducers/customerSlice';
import itemReducer from './reducers/itemSlice';
import reservationReducer from './reducers/reservationSlice';
import paymentReducer from './reducers/paymentSlice';
import languageReducer from './reducers/languageSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    category: categoryReducer,
    settings: settingsReducer,
    user: userReducer,
    approval: approvalReducer,
    cost: costReducer,
    customer: customerReducer,
    item: itemReducer,
    reservation: reservationReducer,
    payment: paymentReducer,
    language: languageReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 