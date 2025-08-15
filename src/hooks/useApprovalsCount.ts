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
      const response = await axios.get('/api/approvals/count', { validateStatus: () => true });
      if (response.status === 401) {
        // Unauthorized: clear count silently
        dispatch(setPendingCount(0));
        return;
      }
      if (response.status !== 200) {
        throw new Error(response.data?.error || `HTTP ${response.status}`);
      }
      dispatch(setPendingCount(response.data.count));
    } catch (error) {
      console.error('Error fetching pending approvals count:', error);
      dispatch(setPendingCount(0));
    } finally {
      dispatch(setCountLoading(false));
    }
  }, [dispatch, currentUser]);

  // Fetch count on mount and when user changes
  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  // Set up polling for real-time updates (every 30 seconds)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      fetchPendingCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchPendingCount, currentUser]);

  return {
    pendingCount,
    countLoading,
    refetch: fetchPendingCount,
  };
}; 