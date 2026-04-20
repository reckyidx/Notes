const prisma = require('../config/database');

/**
 * Theater Repository
 * Handles all database operations for Theater, Screen, and Seat entities
 * Pattern: Repository Pattern
 */
class TheaterRepository {
  // ==================== THEATER OPERATIONS ====================

  /**
   * Create a new theater
   * @param {Object} theaterData - Theater data
   * @returns {Promise<Object>} Created theater
   */
  async createTheater(theaterData) {
    return prisma.theater.create({
      data: {
        name: theaterData.name,
        city: theaterData.city,
        address: theaterData.address,
        latitude: theaterData.latitude,
        longitude: theaterData.longitude,
        phone: theaterData.phone,
        ownerId: theaterData.ownerId,
      },
    });
  }

  /**
   * Find theater by ID
   * @param {string} id - Theater ID
   * @returns {Promise<Object|null>} Theater or null
   */
  async findTheaterById(id) {
    return prisma.theater.findFirst({
      where: { id, isActive: true },
    });
  }

  /**
   * Find theaters by city
   * @param {string} city - City name
   * @returns {Promise<Array>} List of theaters
   */
  async findTheatersByCity(city) {
    return prisma.theater.findMany({
      where: { city, isActive: true },
    });
  }

  /**
   * Find theaters near a location
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<Array>} List of theaters
   */
  async findTheatersNearby(latitude, longitude, radiusKm = 10) {
    // Using raw query for PostGIS distance calculation
    const theaters = await prisma.$queryRaw`
      SELECT *, 
        ST_Distance(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography
        ) / 1000 as distance_km
      FROM theaters
      WHERE is_active = true
      AND ST_DWithin(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint(${longitude}, ${latitude})::geography,
        ${radiusKm * 1000}
      )
      ORDER BY distance_km
    `;
    return theaters;
  }

  /**
   * Find theaters by owner
   * @param {string} ownerId - Owner ID
   * @returns {Promise<Array>} List of theaters
   */
  async findTheatersByOwner(ownerId) {
    return prisma.theater.findMany({
      where: { ownerId, isActive: true },
      include: { screens: true },
    });
  }

  /**
   * Update theater
   * @param {string} id - Theater ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated theater
   */
  async updateTheater(id, updateData) {
    return prisma.theater.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete theater (soft delete)
   * @param {string} id - Theater ID
   * @returns {Promise<Object>} Deleted theater
   */
  async deleteTheater(id) {
    return prisma.theater.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== SCREEN OPERATIONS ====================

  /**
   * Create a new screen
   * @param {Object} screenData - Screen data
   * @returns {Promise<Object>} Created screen
   */
  async createScreen(screenData) {
    return prisma.screen.create({
      data: {
        theaterId: screenData.theaterId,
        name: screenData.name,
        totalSeats: screenData.totalSeats,
        screenType: screenData.screenType,
        seatLayout: screenData.seatLayout,
      },
    });
  }

  /**
   * Find screen by ID
   * @param {string} id - Screen ID
   * @returns {Promise<Object|null>} Screen or null
   */
  async findScreenById(id) {
    return prisma.screen.findFirst({
      where: { id, isActive: true },
      include: { theater: true },
    });
  }

  /**
   * Find screens by theater
   * @param {string} theaterId - Theater ID
   * @returns {Promise<Array>} List of screens
   */
  async findScreensByTheater(theaterId) {
    return prisma.screen.findMany({
      where: { theaterId, isActive: true },
    });
  }

  /**
   * Update screen
   * @param {string} id - Screen ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated screen
   */
  async updateScreen(id, updateData) {
    return prisma.screen.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete screen (soft delete)
   * @param {string} id - Screen ID
   * @returns {Promise<Object>} Deleted screen
   */
  async deleteScreen(id) {
    return prisma.screen.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== SEAT OPERATIONS ====================

  /**
   * Create multiple seats for a screen
   * @param {string} screenId - Screen ID
   * @param {Array} seats - Array of seat data
   * @returns {Promise<number>} Count of created seats
   */
  async createSeats(screenId, seats) {
    const seatData = seats.map(seat => ({
      screenId,
      rowNumber: seat.rowNumber,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType || 'NORMAL',
    }));

    const result = await prisma.seat.createMany({
      data: seatData,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Find seats by screen
   * @param {string} screenId - Screen ID
   * @returns {Promise<Array>} List of seats
   */
  async findSeatsByScreen(screenId) {
    return prisma.seat.findMany({
      where: { screenId, isActive: true },
      orderBy: [{ rowNumber: 'asc' }, { seatNumber: 'asc' }],
    });
  }

  /**
   * Find seat by ID
   * @param {string} id - Seat ID
   * @returns {Promise<Object|null>} Seat or null
   */
  async findSeatById(id) {
    return prisma.seat.findUnique({
      where: { id },
    });
  }

  /**
   * Get screen with seats
   * @param {string} screenId - Screen ID
   * @returns {Promise<Object|null>} Screen with seats
   */
  async getScreenWithSeats(screenId) {
    return prisma.screen.findFirst({
      where: { id: screenId, isActive: true },
      include: {
        seats: {
          where: { isActive: true },
          orderBy: [{ rowNumber: 'asc' }, { seatNumber: 'asc' }],
        },
        theater: true,
      },
    });
  }

  /**
   * Get theater with screens and seats
   * @param {string} theaterId - Theater ID
   * @returns {Promise<Object|null>} Theater with full details
   */
  async getTheaterWithDetails(theaterId) {
    return prisma.theater.findFirst({
      where: { id: theaterId, isActive: true },
      include: {
        screens: {
          where: { isActive: true },
          include: {
            seats: {
              where: { isActive: true },
            },
          },
        },
      },
    });
  }
}

module.exports = new TheaterRepository();