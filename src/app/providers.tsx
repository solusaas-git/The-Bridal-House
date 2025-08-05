'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { ModalProvider } from '@/contexts/ModalContext';
import { I18nProvider } from '@/components/I18nProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <I18nProvider>
        <ModalProvider>
          {children}
        </ModalProvider>
      </I18nProvider>
    </Provider>
  );
} 