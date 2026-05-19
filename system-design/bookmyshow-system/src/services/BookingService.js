const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const BookingRepository = require('../repositories/BookingRepository');
const ShowRepository = require('../repositories/ShowRepository');
const SeatLockService = require('./SeatLockService');
const NotificationService = require('./NotificationService');
const config = require('../config');
const { cache } = require('../config/redis');
const { logger } = require('../utils/logger');

/**
 * Booking Service
 * Handles the complete booking lifecycle
 * Pattern: Saga Pattern for distributed transactions
 */
class BookingService {
  /**
   * Create a booking from locked seats
   * @param {string} lockId - Seat lock ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Booking details
   */
  async createBooking(lockId, userId) {
    // Get lock status
    const lockStatus = await SeatLockService.getLockStatus(lockId);
    
    if (!lockStatus) {
      throw new Error('Lock not found or expired');
    }

    if (lockStatus.isExpired) {
      throw new Error('Lock has expired. Please select seats again.');
    }

    if (lockStatus.userId !== userId) {
      throw new Error('Unauthorized to create booking for this lock');
    }

    // Check if booking already exists for this lock
    const existingBooking = await cache.get(`booking_lock:${lockId}`);
    if (existingBooking) {
      return BookingRepository.findBookingById(existingBooking);
    }

    // Create booking
    const bookingExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes for payment
    const booking = await BookingRepository.createBooking({
      userId,
      showId: lockStatus.showId,
      totalAmount: lockStatus.amount,
      expiresAt: bookingExpiry,
    });

    // Book seats
    await SeatLockService.confirmLock(lockId, booking.id);

    // Cache booking-lock mapping
    await cache.set(`booking_lock:${lockId}`, booking.id, 600);

    logger.info('Booking created', { bookingId: booking.id, lockId, userId });

    return BookingRepository.findBookingById(booking.id);
  }

  /**
   * Confirm booking after successful payment
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Confirmed booking with tickets
   */
  async confirmBooking(bookingId) {
    const booking = await BookingRepository.findBookingById(bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new Error('Booking is not in pending state');
    }

    // Update booking status
    await BookingRepository.updateBooking(bookingId, {
      status: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
    });

    // Generate tickets
    const tickets = await this.generateTickets(booking);

    // Send confirmation notification
    await NotificationService.sendBookingConfirmation(booking);

    logger.info('Booking confirmed', { bookingId, ticketCount: tickets.length });

    return BookingRepository.findBookingById(bookingId);
  }

  /**
   * Cancel booking
   * @param {string} bookingId - Booking ID
   * @param {string} userId - User ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled booking
   */
  async cancelBooking(bookingId, userId, reason = null) {
    const booking = await BookingRepository.findBookingById(bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Validate user
    if (booking.userId !== userId) {
      throw new Error('Unauthorized to cancel this booking');
    }

    // Check if booking can be cancelled
    if (booking.status === 'CANCELLED') {
      throw new Error('Booking is already cancelled');
    }

    if (booking.status === 'EXPIRED') {
      throw new Error('Booking has expired');
    }

    // Check cancellation window
    const showTime = new Date(booking.show.startTime);
    const hoursBeforeShow = (showTime - new Date()) / (1000 * 60 * 60);
    
    if (hoursBeforeShow < config.booking.cancellationWindowHours) {
      throw new Error(`Cannot cancel booking within ${config.booking.cancellationWindowHours} hours of show time`);
    }

    // Cancel booking and release seats
    await BookingRepository.cancelBookingWithSeats(bookingId);

    // If payment was done, initiate refund
    if (booking.paymentStatus === 'SUCCESS') {
      await this.initiateRefund(booking);
    }

    // Send cancellation notification
    await NotificationService.sendCancellationNotification(booking, reason);

    logger.info('Booking cancelled', { bookingId, userId, reason });

    return BookingRepository.findBookingById(bookingId);
  }

  /**
   * Generate tickets for a booking
   * @param {Object} booking - Booking object
   * @returns {Promise<Array>} Generated tickets
   */
  async generateTickets(booking) {
    const tickets = [];

    for (const seat of booking.seats) {
      const ticketNumber = this.generateTicketNumber();
      const qrData = JSON.stringify({
        ticketNumber,
        bookingId: booking.id,
        showId: booking.showId,
        seatId: seat.seatId,
      });

      const qrCode = await QRCode.toDataURL(qrData);

      tickets.push({
        showSeatId: seat.id,
        qrCode,
        ticketNumber,
      });
    }

    await BookingRepository.createTickets(booking.id, tickets);

    return tickets;
  }

  /**
   * Generate unique ticket number
   * @returns {string} Ticket number
   */
  generateTicketNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BMS${timestamp}${random}`;
  }

  /**
   * Get booking by ID
   * @param {string} bookingId - Booking ID
   * @param {string} userId - User ID (for validation)
   * @returns {Promise<Object>} Booking details
   */
  async getBooking(bookingId, userId) {
    const booking = await BookingRepository.findBookingById(bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new Error('Unauthorized to view this booking');
    }

    return booking;
  }

  /**
   * Get user bookings
   * @param {string} userId - User ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} List of bookings
   */
  async getUserBookings(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return BookingRepository.findBookingsByUser(userId, { skip, take: limit });
  }

  /**
   * Get ticket by ticket number
   * @param {string} ticketNumber - Ticket number
   * @returns {Promise<Object>} Ticket details
   */
  async getTicketByNumber(ticketNumber) {
    const ticket = await BookingRepository.findTicketByNumber(ticketNumber);
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  /**
   * Validate ticket for entry
   * @param {string} ticketNumber - Ticket number
   * @returns {Promise<Object>} Validation result
   */
  async validateTicket(ticketNumber) {
    const ticket = await BookingRepository.findTicketByNumber(ticketNumber);
    
    if (!ticket) {
      return { valid: false, message: 'Invalid ticket' };
    }

    if (ticket.status === 'CANCELLED') {
      return { valid: false, message: 'Ticket has been cancelled' };
    }

    if (ticket.status === 'USED') {
      return { valid: false, message: 'Ticket has already been used' };
    }

    const showTime = new Date(ticket.booking.show.startTime);
    const now = new Date();

    if (now > showTime) {
      return { valid: false, message: 'Show has already started or ended' };
    }

    // Mark ticket as used
    await BookingRepository.updateTicketStatus(ticket.id, 'USED');

    return {
      valid: true,
      message: 'Ticket validated successfully',
      ticket,
    };
  }

  /**
   * Initiate refund for a booking
   * @param {Object} booking - Booking object
   * @returns {Promise<Object>} Refund details
   */
  async initiateRefund(booking) {
    // This would integrate with payment gateway for actual refund
    // For now, we'll just update the payment status
    const payment = await BookingRepository.findPaymentByBooking(booking.id);
    
    if (payment) {
      await BookingRepository.updatePaymentStatus(payment.id, 'REFUNDED');
      await BookingRepository.updatePaymentStatus(booking.id, 'REFUNDED');
    }

    logger.info('Refund initiated', { bookingId: booking.id, paymentId: payment?.id });

    return { refundInitiated: true, bookingId: booking.id };
  }

  /**
   * Mark expired bookings
   * @returns {Promise<number>} Count of expired bookings
   */
  async markExpiredBookings() {
    const expiredBookings = await BookingRepository.findExpiringBookings(new Date());
    
    for (const booking of expiredBookings) {
      await BookingRepository.updateBookingStatus(booking.id, 'EXPIRED');
      await BookingRepository.releaseShowSeats(
        (await BookingRepository.findBookingById(booking.id)).seats.map(s => s.id)
      );
    }

    logger.info('Marked expired bookings', { count: expiredBookings.length });

    return expiredBookings.length;
  }
}

module.exports = new BookingService();