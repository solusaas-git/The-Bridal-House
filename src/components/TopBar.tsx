'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { clearAuth } from '@/store/reducers/authSlice';
import { toast } from 'react-toastify';
import axios from 'axios';
import { LogOut, Menu, X } from 'lucide-react';

interface TopBarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const TopBar = ({ isMobileMenuOpen, setIsMobileMenuOpen }: TopBarProps) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('isAuthenticated');
      dispatch(clearAuth());
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('isAuthenticated');
      dispatch(clearAuth());
      router.push('/login');
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left - Mobile Menu Toggle (mobile only) */}
        <div className="flex items-center lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Center - Logo */}
        <div className="flex items-center lg:justify-start justify-center flex-1 lg:flex-none">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <img
              src="/TBH white.png"
              alt="TBH Logo"
              className="h-8 w-auto"
            />
          </button>
        </div>

        {/* Right - Logout Button */}
        <div className="flex items-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar; 