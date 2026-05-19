const SeatLockService = require('../services/SeatLockService');
const BookingService = require('../services/BookingService');
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * Booking Controller
 * Handles booking-related endpoints
 */
const bookingController = {
  /**
   * Lock seats
   * POST /api/v1/seats/lock
   */
  lockSeats: asyncHandler(async (req, res) => {
    const { showId, seatIds } = req.body;
    const userId = req.user.id;

    if (!showId || !seatIds || !Array.isArray(seatIds)) {
      throw new ValidationError('Show ID and seat IDs array are required');
    }

    const result = await SeatLockService.lockSeats(showId, seatIds, userId);

    res.status(200).json({
      success: true,
      message: 'Seats locked successfully',
      data: result,
    });
  }),

  /**
   * Release seat lock
   * DELETE /api/v1/seats/lock/:lockId
   */
  releaseLock: asyncHandler(async (req, res) => {
    const { lockId } = req.params;
    const userId = req.user.id;

    const result = await SeatLockService.releaseLock(lockId, userId);

    res.status(200).json({
      success: true,
      message: 'Lock released successfully',
      data: { released: result },
    });
  }),

  /**
   * Get lock status
   * GET /api/v1/seats/lock/:lockId
   */
  getLockStatus: asyncHandler(async (req, res) => {
    const { lockId } = req.params;

    const status = await SeatLockService.getLockStatus(lockId);

    if (!status) {
      throw new NotFoundError('Lock');
    }

    res.status(200).json({
      success: true,
      data: status,
    });
  }),

  /**
   * Create booking
   * POST /api/v1/bookings
   */
  createBooking: asyncHandler(async (req, res) => {
    const { lockId } = req.body;
    const userId = req.user.id;

    if (!lockId) {
      throw new ValidationError('Lock ID is required');
    }

    const booking = await BookingService.createBooking(lockId, userId);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking,
    });
  }),

  /**
   * Get booking by ID
   * GET /api/v1/bookings/:id
   */
  getBooking: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await BookingService.getBooking(id, userId);

    res.status(200).json({
      success: true,
      data: booking,
    });
  }),

  /**
   * Get user bookings
   * GET /api/v1/bookings
   */
  getUserBookings: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page, limit } = req.query;

    const bookings = await BookingService.getUserBookings(userId, { page, limit });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  }),

  /**
   * Cancel booking
   * POST /api/v1/bookings/:id/cancel
   */
  cancelBooking: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const booking = await BookingService.cancelBooking(id, userId, reason);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    });
  }),

  /**
   * Get ticket by number
   * GET /api/v1/tickets/:ticketNumber
   */
  getTicket: asyncHandler(async (req, res) => {
    const { ticketNumber } = req.params;

    const ticket = await BookingService.getTicketByNumber(ticketNumber);

    // Validate ownership
    if (ticket.booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  }),

  /**
   * Validate ticket (for theater entry)
   * POST /api/v1/tickets/:ticketNumber/validate
   */
  validateTicket: asyncHandler(async (req, res) => {
    const { ticketNumber } = req.params;

    const result = await BookingService.validateTicket(ticketNumber);

    res.status(200).json({
      success: true,
      data: result,
    });
  }),
};

module.exports = bookingController;