'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setCurrentUser } from '@/store/reducers/authSlice';
import axios from 'axios';
import Navbar from '@/components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, currentUser } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedAuth = localStorage.getItem('isAuthenticated');
        if (!storedAuth || storedAuth !== 'true') {
          router.push('/login');
          return;
        }

        // Verify with server if currentUser is not set
        if (!currentUser) {
          const response = await axios.get('/api/auth/me', { withCredentials: true });
          if (response.data.success) {
            dispatch(setCurrentUser(response.data.user));
          } else {
            localStorage.removeItem('isAuthenticated');
            router.push('/login');
            return;
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('isAuthenticated');
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, dispatch, currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Navbar />
      <main className="ml-56">
        <div className="py-4 px-4 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
} 