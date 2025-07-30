'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { ModalProvider } from '@/contexts/ModalContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ModalProvider>
        {children}
      </ModalProvider>
    </Provider>
  );
} 