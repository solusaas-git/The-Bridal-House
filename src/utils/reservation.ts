import mongoose from 'mongoose';
import Payment from '@/models/payment';
import Reservation, { IReservation } from '@/models/reservation';

export interface PaymentStatusCalculation {
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: 'Pending' | 'Paid' | 'Partially Paid' | 'Not Paid';
}

/**
 * Calculate payment status and remaining balance for a reservation
 */
export async function calculateReservationPaymentStatus(
  reservationId: string | mongoose.Types.ObjectId,
  reservationTotal: number
): Promise<PaymentStatusCalculation> {
  try {
    // Get all payments for this reservation
    const payments = await Payment.find({ 
      reservation: reservationId 
    }).select('amount');

    // Calculate total paid amount
    const totalPaid = payments.reduce((sum, payment) => {
      return sum + (Number(payment.amount) || 0);
    }, 0);

    // Calculate remaining balance
    const remainingBalance = Math.max(0, reservationTotal - totalPaid);

    // Determine payment status
    let paymentStatus: 'Pending' | 'Paid' | 'Partially Paid' | 'Not Paid';
    
    if (totalPaid === 0) {
      paymentStatus = 'Not Paid';
    } else if (remainingBalance === 0) {
      paymentStatus = 'Paid';
    } else if (totalPaid > 0 && remainingBalance > 0) {
      paymentStatus = 'Partially Paid';
    } else {
      paymentStatus = 'Pending';
    }

    return {
      totalPaid,
      remainingBalance,
      paymentStatus
    };
  } catch (error) {
    console.error('Error calculating reservation payment status:', error);
    throw error;
  }
}

/**
 * Update reservation payment status and remaining balance
 */
export async function updateReservationPaymentStatus(
  reservationId: string | mongoose.Types.ObjectId
): Promise<void> {
  try {
    // Get the reservation to access its total
    const reservation = await Reservation.findById(reservationId).select('total');
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Calculate new payment status
    const calculation = await calculateReservationPaymentStatus(
      reservationId,
      reservation.total
    );

    // Update the reservation
    await Reservation.findByIdAndUpdate(
      reservationId,
      {
        paymentStatus: calculation.paymentStatus,
        remainingBalance: calculation.remainingBalance
      },
      { new: true }
    );
  } catch (error) {
    console.error('Error updating reservation payment status:', error);
    throw error;
  }
}

 