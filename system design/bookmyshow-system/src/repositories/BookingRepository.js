const prisma = require('../config/database');

/**
 * Booking Repository
 * Handles all database operations for Booking, Payment, and Ticket entities
 * Pattern: Repository Pattern
 */
class BookingRepository {
  // ==================== BOOKING OPERATIONS ====================

  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Created booking
   */
  async createBooking(bookingData) {
    return prisma.booking.create({
      data: {
        userId: bookingData.userId,
        showId: bookingData.showId,
        totalAmount: bookingData.totalAmount,
        status: bookingData.status || 'PENDING',
        paymentStatus: 'PENDING',
        expiresAt: bookingData.expiresAt,
      },
    });
  }

  /**
   * Find booking by ID
   * @param {string} id - Booking ID
   * @returns {Promise<Object|null>} Booking or null
   */
  async findBookingById(id) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        show: {
          include: {
            movie: true,
            theater: true,
            screen: true,
          },
        },
        seats: {
          include: {
            seat: true,
          },
        },
        payment: true,
        tickets: true,
      },
    });
  }

  /**
   * Find bookings by user
   * @param {string} userId - User ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} List of bookings
   */
  async findBookingsByUser(userId, options = {}) {
    return prisma.booking.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            movie: true,
            theater: true,
          },
        },
        tickets: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: options.skip || 0,
      take: options.take || 20,
    });
  }

  /**
   * Find bookings by show
   * @param {string} showId - Show ID
   * @returns {Promise<Array>} List of bookings
   */
  async findBookingsByShow(showId) {
    return prisma.booking.findMany({
      where: { showId, status: { not: 'CANCELLED' } },
      include: {
        user: true,
        seats: true,
      },
    });
  }

  /**
   * Update booking
   * @param {string} id - Booking ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated booking
   */
  async updateBooking(id, updateData) {
    return prisma.booking.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Update booking status
   * @param {string} id - Booking ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated booking
   */
  async updateBookingStatus(id, status) {
    return prisma.booking.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Update payment status
   * @param {string} id - Booking ID
   * @param {string} paymentStatus - Payment status
   * @returns {Promise<Object>} Updated booking
   */
  async updatePaymentStatus(id, paymentStatus) {
    return prisma.booking.update({
      where: { id },
      data: { paymentStatus },
    });
  }

  /**
   * Cancel booking
   * @param {string} id - Booking ID
   * @returns {Promise<Object>} Cancelled booking
   */
  async cancelBooking(id) {
    return prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Find pending bookings near expiry
   * @param {Date} expiryTime - Expiry time threshold
   * @returns {Promise<Array>} List of bookings
   */
  async findExpiringBookings(expiryTime) {
    return prisma.booking.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: expiryTime },
      },
    });
  }

  /**
   * Count user bookings for a show
   * @param {string} userId - User ID
   * @param {string} showId - Show ID
   * @returns {Promise<number>} Count of active bookings
   */
  async countUserBookingsForShow(userId, showId) {
    return prisma.booking.count({
      where: {
        userId,
        showId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
  }

  // ==================== PAYMENT OPERATIONS ====================

  /**
   * Create a payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment
   */
  async createPayment(paymentData) {
    return prisma.payment.create({
      data: {
        bookingId: paymentData.bookingId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        status: 'PENDING',
        paymentGateway: paymentData.paymentGateway,
      },
    });
  }

  /**
   * Find payment by ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object|null>} Payment or null
   */
  async findPaymentById(id) {
    return prisma.payment.findUnique({
      where: { id },
      include: { booking: true },
    });
  }

  /**
   * Find payment by booking ID
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object|null>} Payment or null
   */
  async findPaymentByBooking(bookingId) {
    return prisma.payment.findUnique({
      where: { bookingId },
    });
  }

  /**
   * Update payment
   * @param {string} id - Payment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated payment
   */
  async updatePayment(id, updateData) {
    return prisma.payment.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Update payment status
   * @param {string} id - Payment ID
   * @param {string} status - New status
   * @param {Object} gatewayData - Gateway response data
   * @returns {Promise<Object>} Updated payment
   */
  async updatePaymentStatus(id, status, gatewayData = null) {
    const updateData = { status };
    if (gatewayData) {
      updateData.gatewayTransactionId = gatewayData.transactionId;
      updateData.gatewayResponse = gatewayData.response;
    }
    return prisma.payment.update({
      where: { id },
      data: updateData,
    });
  }

  // ==================== TICKET OPERATIONS ====================

  /**
   * Create tickets for a booking
   * @param {string} bookingId - Booking ID
   * @param {Array} ticketData - Array of ticket data
   * @returns {Promise<number>} Count of created tickets
   */
  async createTickets(bookingId, ticketData) {
    const data = ticketData.map(ticket => ({
      bookingId,
      showSeatId: ticket.showSeatId,
      qrCode: ticket.qrCode,
      ticketNumber: ticket.ticketNumber,
      status: 'ACTIVE',
    }));

    const result = await prisma.ticket.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Find ticket by ID
   * @param {string} id - Ticket ID
   * @returns {Promise<Object|null>} Ticket or null
   */
  async findTicketById(id) {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: true,
            show: {
              include: {
                movie: true,
                theater: true,
                screen: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find ticket by ticket number
   * @param {string} ticketNumber - Ticket number
   * @returns {Promise<Object|null>} Ticket or null
   */
  async findTicketByNumber(ticketNumber) {
    return prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        booking: {
          include: {
            user: true,
            show: {
              include: {
                movie: true,
                theater: true,
                screen: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find tickets by booking
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Array>} List of tickets
   */
  async findTicketsByBooking(bookingId) {
    return prisma.ticket.findMany({
      where: { bookingId },
    });
  }

  /**
   * Update ticket status
   * @param {string} id - Ticket ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated ticket
   */
  async updateTicketStatus(id, status) {
    const updateData = { status };
    if (status === 'USED') {
      updateData.usedAt = new Date();
    }
    return prisma.ticket.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Cancel tickets for a booking
   * @param {string} bookingId - Booking ID
   * @returns {Promise<number>} Count of cancelled tickets
   */
  async cancelTicketsByBooking(bookingId) {
    const result = await prisma.ticket.updateMany({
      where: { bookingId },
      data: { status: 'CANCELLED' },
    });

    return result.count;
  }

  // ==================== TRANSACTION OPERATIONS ====================

  /**
   * Create booking with seats in a transaction
   * @param {Object} bookingData - Booking data
   * @param {Array} seatIds - Seat IDs to book
   * @returns {Promise<Object>} Created booking with seats
   */
  async createBookingWithSeats(bookingData, seatIds) {
    return prisma.$transaction(async (tx) => {
      // Create booking
      const booking = await tx.booking.create({
        data: {
          userId: bookingData.userId,
          showId: bookingData.showId,
          totalAmount: bookingData.totalAmount,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          expiresAt: bookingData.expiresAt,
        },
      });

      // Update show seats with booking ID
      await tx.showSeat.updateMany({
        where: { id: { in: seatIds } },
        data: {
          bookingId: booking.id,
          status: 'BOOKED',
          lockedBy: null,
          lockedAt: null,
          lockExpiry: null,
        },
      });

      return booking;
    });
  }

  /**
   * Cancel booking and release seats in a transaction
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Cancelled booking
   */
  async cancelBookingWithSeats(bookingId) {
    return prisma.$transaction(async (tx) => {
      // Get booking with seats
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { seats: true },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Cancel booking
      const cancelledBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Release seats
      const seatIds = booking.seats.map(s => s.id);
      await tx.showSeat.updateMany({
        where: { id: { in: seatIds } },
        data: {
          status: 'AVAILABLE',
          bookingId: null,
        },
      });

      // Cancel tickets
      await tx.ticket.updateMany({
        where: { bookingId },
        data: { status: 'CANCELLED' },
      });

      return cancelledBooking;
    });
  }
}

module.exports = new BookingRepository();