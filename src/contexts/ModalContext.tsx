'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  modalContent: ReactNode | null;
  setModalContent: (content: ReactNode) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    setModalContent(null);
  };

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        openModal,
        closeModal,
        modalContent,
        setModalContent,
      }}
    >
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={closeModal}
          />
          <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {modalContent}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}; 