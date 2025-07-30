import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Approval {
  _id: string;
  requestedBy: {
    _id: string;
    name: string;
    email: string;
  };
  actionType: 'edit' | 'delete';
  resourceType: 'customer' | 'item' | 'payment' | 'reservation';
  resourceId: string;
  originalData: any;
  newData?: any;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalState {
  approvals: any[];
  loading: boolean;
  error: string | null;
  pendingCount: number;
  countLoading: boolean;
}

const initialState: ApprovalState = {
  approvals: [],
  loading: false,
  error: null,
  pendingCount: 0,
  countLoading: false,
};

const approvalSlice = createSlice({
  name: 'approval',
  initialState,
  reducers: {
    setApprovals: (state, action: PayloadAction<any[]>) => {
      state.approvals = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPendingCount: (state, action: PayloadAction<number>) => {
      state.pendingCount = action.payload;
    },
    setCountLoading: (state, action: PayloadAction<boolean>) => {
      state.countLoading = action.payload;
    },
    incrementPendingCount: (state) => {
      state.pendingCount += 1;
    },
    decrementPendingCount: (state) => {
      state.pendingCount = Math.max(0, state.pendingCount - 1);
    },
    // Add approval to the list and increment count
    addApproval: (state, action: PayloadAction<any>) => {
      state.approvals.unshift(action.payload);
      if (action.payload.status === 'pending') {
        state.pendingCount += 1;
      }
    },
    // Update approval status and adjust count
    updateApprovalStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const approval = state.approvals.find(a => a._id === action.payload.id);
      if (approval) {
        const wasPending = approval.status === 'pending';
        const isNowPending = action.payload.status === 'pending';
        
        approval.status = action.payload.status;
        
        // Adjust count based on status change
        if (wasPending && !isNowPending) {
          state.pendingCount = Math.max(0, state.pendingCount - 1);
        } else if (!wasPending && isNowPending) {
          state.pendingCount += 1;
        }
      }
    },
  },
});

export const {
  setApprovals,
  setLoading,
  setError,
  setPendingCount,
  setCountLoading,
  incrementPendingCount,
  decrementPendingCount,
  addApproval,
  updateApprovalStatus,
} = approvalSlice.actions;

export default approvalSlice.reducer; 