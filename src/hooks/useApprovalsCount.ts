import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setPendingCount, setCountLoading } from '@/store/reducers/approvalSlice';
import axios from 'axios';

export const useApprovalsCount = () => {
  const dispatch = useDispatch();
  const { pendingCount, countLoading } = useSelector((state: RootState) => state.approval);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);

  const fetchPendingCount = useCallback(async () => {
    if (!currentUser) return;

    try {
      dispatch(setCountLoading(true));
      const response = await axios.get('/api/approvals/count', { 
        validateStatus: () => true,
        timeout: 5000 // 5 second timeout
      });
      
      if (response.status === 401) {
        // Unauthorized: clear count silently (don't log as error)
        dispatch(setPendingCount(0));
        return;
      }
      
      if (response.status !== 200) {
        throw new Error(response.data?.error || `HTTP ${response.status}`);
      }
      
      dispatch(setPendingCount(response.data.count));
    } catch (error) {
      // Only log non-401 errors to reduce noise
      if (error instanceof Error && 'response' in error && (error as any).response?.status !== 401) {
        console.error('Error fetching pending approvals count:', error);
      } else if (!(error instanceof Error) || !('response' in error)) {
        console.error('Error fetching pending approvals count:', error);
      }
      dispatch(setPendingCount(0));
    } finally {
      dispatch(setCountLoading(false));
    }
  }, [dispatch, currentUser]);

  // Fetch count on mount and when user changes
  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  // Set up polling for real-time updates (every 60 seconds to reduce server load)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      fetchPendingCount();
    }, 60000); // 60 seconds (reduced from 30 to minimize 401s)

    return () => clearInterval(interval);
  }, [fetchPendingCount, currentUser]);

  return {
    pendingCount,
    countLoading,
    refetch: fetchPendingCount,
  };
}; 