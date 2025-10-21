import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setRecentCount, setTodayCount, setCountLoading } from '@/store/reducers/paymentSlice';
import axios from 'axios';

export const usePaymentsCount = () => {
  const dispatch = useDispatch();
  const { recentCount, todayCount, countLoading } = useSelector((state: RootState) => state.payment);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);

  const fetchPaymentsCount = useCallback(async (type: 'recent' | 'today' | 'total' = 'recent') => {
    if (!currentUser) return;

    try {
      dispatch(setCountLoading(true));
      const response = await axios.get(`/api/payments/count?type=${type}`, { 
        validateStatus: () => true,
        timeout: 5000 // 5 second timeout
      });
      
      if (response.status === 401) {
        // Unauthorized: clear count silently (don't log as error)
        if (type === 'recent') {
          dispatch(setRecentCount(0));
        } else if (type === 'today') {
          dispatch(setTodayCount(0));
        }
        return;
      }
      
      if (response.status !== 200) {
        throw new Error(response.data?.error || `HTTP ${response.status}`);
      }
      
      if (type === 'recent') {
        dispatch(setRecentCount(response.data.count));
      } else if (type === 'today') {
        dispatch(setTodayCount(response.data.count));
      }
    } catch (error) {
      // Only log non-401 errors to reduce noise
      if (error instanceof Error && 'response' in error && (error as any).response?.status !== 401) {
        console.error(`Error fetching ${type} payments count:`, error);
      } else if (!(error instanceof Error) || !('response' in error)) {
        console.error(`Error fetching ${type} payments count:`, error);
      }
      
      if (type === 'recent') {
        dispatch(setRecentCount(0));
      } else if (type === 'today') {
        dispatch(setTodayCount(0));
      }
    } finally {
      dispatch(setCountLoading(false));
    }
  }, [dispatch, currentUser]);

  const fetchAllCounts = useCallback(async () => {
    if (!currentUser) return;
    
    // Fetch both recent and today counts in parallel
    await Promise.all([
      fetchPaymentsCount('recent'),
      fetchPaymentsCount('today')
    ]);
  }, [fetchPaymentsCount, currentUser]);

  // Fetch counts on mount and when user changes
  useEffect(() => {
    fetchAllCounts();
  }, [fetchAllCounts]);

  // Set up polling for real-time updates (every 60 seconds to reduce server load)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      fetchAllCounts();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchAllCounts, currentUser]);

  return {
    recentCount,
    todayCount,
    countLoading,
    refetch: fetchAllCounts,
    refetchRecent: () => fetchPaymentsCount('recent'),
    refetchToday: () => fetchPaymentsCount('today'),
  };
};
