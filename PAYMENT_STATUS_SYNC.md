# Payment Status Sync for Reservations

## Overview

This document describes the new payment tracking system that automatically updates reservation payment statuses and remaining balances when payments are registered.

## Features Implemented

### 1. Automatic Payment Status Updates
- **Payment Status**: Automatically calculated based on payments made
  - `Not Paid`: No payments registered
  - `Partially Paid`: Some payments made, but balance remaining
  - `Paid`: Full amount paid
  - `Pending`: Default status (fallback)

- **Remaining Balance**: Automatically calculated as `reservation.total - total_payments_made`

### 2. Real-time Updates
- Status and balance update automatically when:
  - New payment is created
  - Payment is updated (amount changed)
  - Payment is deleted
  - Reservation total is modified

### 3. Database Migration (Completed)
- One-time migration has been executed to update all existing reservations
- All reservations now have correct payment status and remaining balance

### 4. UI Enhancements
- New "Remaining Balance" column in reservations list
- Color-coded display:
  - **Yellow**: Outstanding balance (> 0)
  - **Green**: Fully paid (= 0)

## Migration Completed

The database migration has been successfully executed:
- **27 reservations** processed
- **0 errors** encountered
- All payment statuses and remaining balances are now accurate

## Database Schema Changes

### Reservation Model
Added new field:
```typescript
remainingBalance: {
  type: Number,
  default: 0,
}
```

## Implementation Details

### Utility Functions (`/src/utils/reservation.ts`)

1. **`calculateReservationPaymentStatus(reservationId, reservationTotal)`**
   - Calculates total payments made for a reservation
   - Determines payment status based on amounts
   - Returns: `{ totalPaid, remainingBalance, paymentStatus }`

2. **`updateReservationPaymentStatus(reservationId)`**
   - Updates a single reservation's payment status and remaining balance
   - Called automatically after payment operations

3. **Database Migration (Completed)**
   - One-time migration script was executed to sync all existing reservations
   - Migration functionality has been removed as it's no longer needed

### Automatic Triggers

The system automatically updates reservation status when:

1. **Payment Created** (`POST /api/payments`)
2. **Payment Updated** (`PUT /api/payments/[id]`)
3. **Payment Deleted** (`DELETE /api/payments/[id]`)
4. **Reservation Created** (`POST /api/reservations`)
5. **Reservation Updated** (`PUT /api/reservations/[id]`)

## How to Use

### For New Installations
No action required - the system will work automatically for new reservations and payments.

### For Existing Installations
✅ **Migration Completed** - Database has been updated with accurate payment statuses and remaining balances for all 27 existing reservations.

All future payment operations will automatically maintain accurate status.

### Viewing Remaining Balances
1. Go to the Reservations list page
2. Use the column toggle (gear icon) to show/hide the "Remaining Balance" column
3. Balance is color-coded:
   - **Yellow text**: Outstanding balance
   - **Green text**: Fully paid

## Error Handling

- Payment status updates are non-blocking (won't fail payment operations if status update fails)
- Sync operation continues processing even if individual reservations fail
- Detailed error reporting in sync API response
- All errors are logged to console for debugging

## Performance Considerations

- Status calculations are optimized with minimal database queries
- Sync operation processes reservations sequentially to avoid overwhelming the database
- Payment status updates happen asynchronously and don't block main operations 