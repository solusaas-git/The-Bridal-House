'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setCurrentUser } from '@/store/reducers/authSlice';
import axios from 'axios';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TopBar from '@/components/TopBar';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, currentUser } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);
  const { t: tCommon } = useTranslation('common');
  const { t: tImpersonation } = useTranslation('impersonation');

  // Check if user is currently impersonating (has originalAdmin in session)
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminInfo, setOriginalAdminInfo] = useState<any>(null);

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

  useEffect(() => {
    // Check session for impersonation info
    const checkImpersonation = async () => {
      try {
        const response = await axios.get('/api/auth/me', { withCredentials: true });
        if (response.data.success && response.data.originalAdmin) {
          setIsImpersonating(true);
          setOriginalAdminInfo(response.data.originalAdmin);
        }
      } catch (error) {
        // Not impersonating or error checking
        setIsImpersonating(false);
        setOriginalAdminInfo(null);
      }
    };

    if (currentUser) {
      checkImpersonation();
    }
  }, [currentUser]);

  const handleStopImpersonation = async () => {
    setStoppingImpersonation(true);
    try {
      const response = await axios.post('/api/auth/stop-impersonation');
      dispatch(setCurrentUser(response.data.user));
      setIsImpersonating(false);
      setOriginalAdminInfo(null);
      toast.success(tImpersonation('stop'));
      // Redirect to settings/users or reload
      router.push('/settings');
    } catch (error: any) {
      console.error('Error stopping impersonation:', error);
      toast.error(error.response?.data?.message || 'Failed to stop impersonation');
    } finally {
      setStoppingImpersonation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 min-h-[100dvh]">
      {/* Floating Impersonation Banner */}
      {isImpersonating && originalAdminInfo && (
        <div className="fixed top-4 right-4 bg-yellow-600 text-black px-4 py-2 text-sm font-medium rounded-lg shadow-lg z-[60] max-w-sm animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex items-center gap-1">
                <span className="animate-pulse">⚠️</span>
                <span className="hidden sm:inline text-xs">{tImpersonation('warning')}</span>
                <span className="font-semibold truncate">{currentUser?.name}</span>
              </span>
            </div>
            <button
              onClick={handleStopImpersonation}
              disabled={stoppingImpersonation}
              className="flex items-center gap-1 px-2 py-1 bg-black/20 hover:bg-black/30 rounded text-xs transition-colors disabled:opacity-50 flex-shrink-0"
              title={`Stop impersonating ${currentUser?.name} (Originally: ${originalAdminInfo.name})`}
            >
              <X className="h-3 w-3" />
              <span className="hidden lg:inline">{stoppingImpersonation ? tImpersonation('stopping') : tImpersonation('stop')}</span>
            </button>
          </div>
        </div>
      )}
      <TopBar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <main className="pt-16 lg:pt-24 lg:ml-56 transition-all duration-300 pb-4 sm:pb-8">
        <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
} 