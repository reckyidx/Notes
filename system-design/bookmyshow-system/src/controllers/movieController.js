const MovieRepository = require('../repositories/MovieRepository');
const { cache } = require('../config/redis');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');

/**
 * Movie Controller
 * Handles movie-related endpoints
 */
const movieController = {
  /**
   * Get all movies
   * GET /api/v1/movies
   */
  getMovies: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, genre, language, search } = req.query;
    const skip = (page - 1) * limit;

    const filters = {
      skip,
      take: parseInt(limit),
      genre,
      language,
      search,
    };

    // Try cache first
    const cacheKey = `movies:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
      });
    }

    const movies = await MovieRepository.findAll(filters);
    const total = await MovieRepository.count(filters);

    const response = {
      movies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    res.status(200).json({
      success: true,
      data: response,
    });
  }),

  /**
   * Get movie by ID
   * GET /api/v1/movies/:id
   */
  getMovie: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const movie = await MovieRepository.findById(id);
    
    if (!movie) {
      throw new NotFoundError('Movie');
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  }),

  /**
   * Get running movies
   * GET /api/v1/movies/running
   */
  getRunningMovies: asyncHandler(async (req, res) => {
    const movies = await MovieRepository.findRunningMovies();

    res.status(200).json({
      success: true,
      data: movies,
    });
  }),

  /**
   * Create movie (Admin only)
   * POST /api/v1/admin/movies
   */
  createMovie: asyncHandler(async (req, res) => {
    const { title, description, durationMinutes, genre, language, releaseDate, posterUrl } = req.body;

    const movie = await MovieRepository.create({
      title,
      description,
      durationMinutes,
      genre,
      language,
      releaseDate: new Date(releaseDate),
      posterUrl,
    });

    // Invalidate cache
    await cache.delPattern('movies:*');

    res.status(201).json({
      success: true,
      message: 'Movie created successfully',
      data: movie,
    });
  }),

  /**
   * Update movie (Admin only)
   * PUT /api/v1/admin/movies/:id
   */
  updateMovie: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.releaseDate) {
      updateData.releaseDate = new Date(updateData.releaseDate);
    }

    const movie = await MovieRepository.update(id, updateData);

    // Invalidate cache
    await cache.delPattern('movies:*');

    res.status(200).json({
      success: true,
      message: 'Movie updated successfully',
      data: movie,
    });
  }),

  /**
   * Delete movie (Admin only)
   * DELETE /api/v1/admin/movies/:id
   */
  deleteMovie: asyncHandler(async (req, res) => {
    const { id } = req.params;

    await MovieRepository.delete(id);

    // Invalidate cache
    await cache.delPattern('movies:*');

    res.status(200).json({
      success: true,
      message: 'Movie deleted successfully',
    });
  }),
};

module.exports = movieController;