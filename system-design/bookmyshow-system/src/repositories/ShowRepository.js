const prisma = require('../config/database');

/**
 * Show Repository
 * Handles all database operations for Show and ShowSeat entities
 * Pattern: Repository Pattern
 */
class ShowRepository {
  // ==================== SHOW OPERATIONS ====================

  /**
   * Create a new show
   * @param {Object} showData - Show data
   * @returns {Promise<Object>} Created show
   */
  async createShow(showData) {
    return prisma.show.create({
      data: {
        movieId: showData.movieId,
        screenId: showData.screenId,
        theaterId: showData.theaterId,
        startTime: showData.startTime,
        endTime: showData.endTime,
        basePrice: showData.basePrice,
        status: showData.status || 'SCHEDULED',
      },
    });
  }

  /**
   * Find show by ID
   * @param {string} id - Show ID
   * @returns {Promise<Object|null>} Show or null
   */
  async findShowById(id) {
    return prisma.show.findUnique({
      where: { id },
      include: {
        movie: true,
        screen: true,
        theater: true,
      },
    });
  }

  /**
   * Find shows by movie
   * @param {string} movieId - Movie ID
   * @param {Date} date - Optional date filter
   * @returns {Promise<Array>} List of shows
   */
  async findShowsByMovie(movieId, date = null) {
    const where = {
      movieId,
      status: { in: ['SCHEDULED', 'OPEN_FOR_BOOKING'] },
    };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.startTime = { gte: startOfDay, lte: endOfDay };
    }

    return prisma.show.findMany({
      where,
      include: {
        theater: true,
        screen: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Find shows by theater
   * @param {string} theaterId - Theater ID
   * @param {Date} date - Optional date filter
   * @returns {Promise<Array>} List of shows
   */
  async findShowsByTheater(theaterId, date = null) {
    const where = {
      theaterId,
      status: { in: ['SCHEDULED', 'OPEN_FOR_BOOKING'] },
    };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.startTime = { gte: startOfDay, lte: endOfDay };
    }

    return prisma.show.findMany({
      where,
      include: {
        movie: true,
        screen: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Find shows by movie and city
   * @param {string} movieId - Movie ID
   * @param {string} city - City name
   * @param {Date} date - Date filter
   * @returns {Promise<Array>} List of shows
   */
  async findShowsByMovieAndCity(movieId, city, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.show.findMany({
      where: {
        movieId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['SCHEDULED', 'OPEN_FOR_BOOKING'] },
        theater: { city },
      },
      include: {
        theater: true,
        screen: true,
        movie: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Check screen availability
   * @param {string} screenId - Screen ID
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {string} excludeShowId - Show ID to exclude (for updates)
   * @returns {Promise<boolean>} True if available
   */
  async checkScreenAvailability(screenId, startTime, endTime, excludeShowId = null) {
    const where = {
      screenId,
      status: { not: 'CANCELLED' },
      OR: [
        {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      ],
    };

    if (excludeShowId) {
      where.id = { not: excludeShowId };
    }

    const conflictingShows = await prisma.show.count({ where });
    return conflictingShows === 0;
  }

  /**
   * Update show
   * @param {string} id - Show ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated show
   */
  async updateShow(id, updateData) {
    return prisma.show.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Update show status
   * @param {string} id - Show ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated show
   */
  async updateShowStatus(id, status) {
    return prisma.show.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Delete show (cancel)
   * @param {string} id - Show ID
   * @returns {Promise<Object>} Cancelled show
   */
  async cancelShow(id) {
    return prisma.show.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ==================== SHOW SEAT OPERATIONS ====================

  /**
   * Create show seats for a show
   * @param {string} showId - Show ID
   * @param {Array} seatData - Array of seat data with price
   * @returns {Promise<number>} Count of created seats
   */
  async createShowSeats(showId, seatData) {
    const data = seatData.map(seat => ({
      showId,
      seatId: seat.seatId,
      price: seat.price,
      status: 'AVAILABLE',
    }));

    const result = await prisma.showSeat.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Find show seats by show
   * @param {string} showId - Show ID
   * @returns {Promise<Array>} List of show seats
   */
  async findShowSeatsByShow(showId) {
    return prisma.showSeat.findMany({
      where: { showId },
      include: {
        seat: true,
      },
      orderBy: [{ seat: { rowNumber: 'asc' } }, { seat: { seatNumber: 'asc' } }],
    });
  }

  /**
   * Find available show seats
   * @param {string} showId - Show ID
   * @returns {Promise<Array>} List of available seats
   */
  async findAvailableShowSeats(showId) {
    return prisma.showSeat.findMany({
      where: {
        showId,
        status: 'AVAILABLE',
      },
      include: {
        seat: true,
      },
      orderBy: [{ seat: { rowNumber: 'asc' } }, { seat: { seatNumber: 'asc' } }],
    });
  }

  /**
   * Count available seats
   * @param {string} showId - Show ID
   * @returns {Promise<number>} Count of available seats
   */
  async countAvailableSeats(showId) {
    return prisma.showSeat.count({
      where: {
        showId,
        status: 'AVAILABLE',
      },
    });
  }

  /**
   * Find show seats by IDs
   * @param {Array} seatIds - Array of show seat IDs
   * @returns {Promise<Array>} List of show seats
   */
  async findShowSeatsByIds(seatIds) {
    return prisma.showSeat.findMany({
      where: {
        id: { in: seatIds },
      },
      include: {
        seat: true,
      },
    });
  }

  /**
   * Lock show seats
   * @param {Array} seatIds - Array of show seat IDs
   * @param {string} userId - User ID
   * @param {Date} lockExpiry - Lock expiry time
   * @returns {Promise<number>} Count of updated seats
   */
  async lockShowSeats(seatIds, userId, lockExpiry) {
    const result = await prisma.showSeat.updateMany({
      where: {
        id: { in: seatIds },
        status: 'AVAILABLE',
      },
      data: {
        status: 'LOCKED',
        lockedBy: userId,
        lockedAt: new Date(),
        lockExpiry,
      },
    });

    return result.count;
  }

  /**
   * Release locked seats
   * @param {Array} seatIds - Array of show seat IDs
   * @returns {Promise<number>} Count of updated seats
   */
  async releaseShowSeats(seatIds) {
    const result = await prisma.showSeat.updateMany({
      where: {
        id: { in: seatIds },
        status: 'LOCKED',
      },
      data: {
        status: 'AVAILABLE',
        lockedBy: null,
        lockedAt: null,
        lockExpiry: null,
      },
    });

    return result.count;
  }

  /**
   * Book show seats
   * @param {Array} seatIds - Array of show seat IDs
   * @param {string} bookingId - Booking ID
   * @returns {Promise<number>} Count of updated seats
   */
  async bookShowSeats(seatIds, bookingId) {
    const result = await prisma.showSeat.updateMany({
      where: {
        id: { in: seatIds },
        status: { in: ['LOCKED', 'AVAILABLE'] },
      },
      data: {
        status: 'BOOKED',
        bookingId,
        lockedBy: null,
        lockedAt: null,
        lockExpiry: null,
      },
    });

    return result.count;
  }

  /**
   * Release expired locks
   * @returns {Promise<number>} Count of released seats
   */
  async releaseExpiredLocks() {
    const result = await prisma.showSeat.updateMany({
      where: {
        status: 'LOCKED',
        lockExpiry: { lt: new Date() },
      },
      data: {
        status: 'AVAILABLE',
        lockedBy: null,
        lockedAt: null,
        lockExpiry: null,
      },
    });

    return result.count;
  }

  /**
   * Get show with seat map
   * @param {string} showId - Show ID
   * @returns {Promise<Object|null>} Show with seat map
   */
  async getShowWithSeatMap(showId) {
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        movie: true,
        screen: {
          include: {
            seats: {
              where: { isActive: true },
              orderBy: [{ rowNumber: 'asc' }, { seatNumber: 'asc' }],
            },
          },
        },
        theater: true,
      },
    });

    if (!show) return null;

    // Get show seats with status
    const showSeats = await prisma.showSeat.findMany({
      where: { showId },
      include: { seat: true },
    });

    // Create seat map
    const seatMap = show.screen.seats.map(seat => {
      const showSeat = showSeats.find(ss => ss.seatId === seat.id);
      return {
        seatId: seat.id,
        showSeatId: showSeat?.id,
        rowNumber: seat.rowNumber,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        status: showSeat?.status || 'AVAILABLE',
        price: showSeat?.price || show.basePrice,
      };
    });

    return {
      ...show,
      seatMap,
    };
  }
}

module.exports = new ShowRepository();