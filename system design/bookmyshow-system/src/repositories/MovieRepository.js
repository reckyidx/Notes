const prisma = require('../config/database');

/**
 * Movie Repository
 * Handles all database operations for Movie entity
 * Pattern: Repository Pattern
 */
class MovieRepository {
  /**
   * Create a new movie
   * @param {Object} movieData - Movie data
   * @returns {Promise<Object>} Created movie
   */
  async create(movieData) {
    return prisma.movie.create({
      data: {
        title: movieData.title,
        description: movieData.description,
        durationMinutes: movieData.durationMinutes,
        genre: movieData.genre,
        language: movieData.language,
        releaseDate: movieData.releaseDate,
        posterUrl: movieData.posterUrl,
        rating: movieData.rating || 0,
      },
    });
  }

  /**
   * Find movie by ID
   * @param {string} id - Movie ID
   * @returns {Promise<Object|null>} Movie or null
   */
  async findById(id) {
    return prisma.movie.findFirst({
      where: { id, isActive: true },
    });
  }

  /**
   * Find all movies with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of movies
   */
  async findAll(filters = {}) {
    const where = { isActive: true };

    if (filters.genre) {
      where.genre = filters.genre;
    }
    if (filters.language) {
      where.language = filters.language;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.movie.findMany({
      where,
      orderBy: { releaseDate: 'desc' },
      skip: filters.skip || 0,
      take: filters.take || 20,
    });
  }

  /**
   * Count movies with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} Count
   */
  async count(filters = {}) {
    const where = { isActive: true };

    if (filters.genre) {
      where.genre = filters.genre;
    }
    if (filters.language) {
      where.language = filters.language;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.movie.count({ where });
  }

  /**
   * Update movie
   * @param {string} id - Movie ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated movie
   */
  async update(id, updateData) {
    return prisma.movie.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete movie (soft delete)
   * @param {string} id - Movie ID
   * @returns {Promise<Object>} Deleted movie
   */
  async delete(id) {
    return prisma.movie.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Find movies by genre
   * @param {string} genre - Movie genre
   * @returns {Promise<Array>} List of movies
   */
  async findByGenre(genre) {
    return prisma.movie.findMany({
      where: { genre, isActive: true },
      orderBy: { releaseDate: 'desc' },
    });
  }

  /**
   * Find currently running movies
   * @returns {Promise<Array>} List of running movies
   */
  async findRunningMovies() {
    const now = new Date();
    return prisma.movie.findMany({
      where: {
        isActive: true,
        releaseDate: { lte: now },
        shows: {
          some: {
            startTime: { gte: now },
            status: { in: ['SCHEDULED', 'OPEN_FOR_BOOKING'] },
          },
        },
      },
      distinct: ['id'],
    });
  }

  /**
   * Get movie with shows
   * @param {string} id - Movie ID
   * @returns {Promise<Object|null>} Movie with shows
   */
  async findWithShows(id) {
    return prisma.movie.findFirst({
      where: { id, isActive: true },
      include: {
        shows: {
          where: {
            startTime: { gte: new Date() },
            status: { in: ['SCHEDULED', 'OPEN_FOR_BOOKING'] },
          },
          include: {
            theater: true,
            screen: true,
          },
        },
      },
    });
  }
}

module.exports = new MovieRepository();