const ShowRepository = require('../repositories/ShowRepository');
const TheaterRepository = require('../repositories/TheaterRepository');
const { cache } = require('../config/redis');
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * Show Controller
 * Handles show-related endpoints
 */
const showController = {
  /**
   * Get shows by movie and city
   * GET /api/v1/shows
   */
  getShows: asyncHandler(async (req, res) => {
    const { movieId, city, date, theaterId } = req.query;

    if (!movieId) {
      throw new ValidationError('Movie ID is required');
    }

    const showDate = date ? new Date(date) : new Date();

    // Try cache first
    const cacheKey = `shows:${movieId}:${city || 'all'}:${showDate.toDateString()}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
      });
    }

    let shows;
    if (theaterId) {
      shows = await ShowRepository.findShowsByTheater(theaterId, showDate);
    } else if (city) {
      shows = await ShowRepository.findShowsByMovieAndCity(movieId, city, showDate);
    } else {
      shows = await ShowRepository.findShowsByMovie(movieId, showDate);
    }

    // Enrich with availability info
    const enrichedShows = await Promise.all(shows.map(async (show) => {
      const availableSeats = await ShowRepository.countAvailableSeats(show.id);
      return {
        ...show,
        availableSeats,
      };
    }));

    // Cache for 2 minutes
    await cache.set(cacheKey, enrichedShows, 120);

    res.status(200).json({
      success: true,
      data: enrichedShows,
    });
  }),

  /**
   * Get show by ID with seat map
   * GET /api/v1/shows/:id
   */
  getShow: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const show = await ShowRepository.getShowWithSeatMap(id);

    if (!show) {
      throw new NotFoundError('Show');
    }

    res.status(200).json({
      success: true,
      data: show,
    });
  }),

  /**
   * Get show seats
   * GET /api/v1/shows/:id/seats
   */
  getShowSeats: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const showSeats = await ShowRepository.findShowSeatsByShow(id);

    res.status(200).json({
      success: true,
      data: showSeats,
    });
  }),

  /**
   * Create show (Admin/Theater Owner only)
   * POST /api/v1/admin/shows
   */
  createShow: asyncHandler(async (req, res) => {
    const { movieId, screenId, theaterId, startTime, endTime, basePrice } = req.body;

    // Validate screen availability
    const isAvailable = await ShowRepository.checkScreenAvailability(
      screenId,
      new Date(startTime),
      new Date(endTime)
    );

    if (!isAvailable) {
      throw new ValidationError('Screen is not available for the selected time slot');
    }

    // Create show
    const show = await ShowRepository.createShow({
      movieId,
      screenId,
      theaterId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      basePrice: parseFloat(basePrice),
    });

    // Get screen seats and create show seats
    const seats = await TheaterRepository.findSeatsByScreen(screenId);
    const showSeatData = seats.map(seat => {
      let price = parseFloat(basePrice);
      if (seat.seatType === 'PREMIUM') price *= 1.5;
      if (seat.seatType === 'RECLINER') price *= 2.0;
      return {
        seatId: seat.id,
        price,
      };
    });

    await ShowRepository.createShowSeats(show.id, showSeatData);

    // Invalidate cache
    await cache.delPattern('shows:*');

    res.status(201).json({
      success: true,
      message: 'Show created successfully',
      data: show,
    });
  }),

  /**
   * Update show status (Admin/Theater Owner only)
   * PUT /api/v1/admin/shows/:id/status
   */
  updateShowStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const show = await ShowRepository.updateShowStatus(id, status);

    // Invalidate cache
    await cache.delPattern('shows:*');

    res.status(200).json({
      success: true,
      message: 'Show status updated successfully',
      data: show,
    });
  }),

  /**
   * Cancel show (Admin/Theater Owner only)
   * DELETE /api/v1/admin/shows/:id
   */
  cancelShow: asyncHandler(async (req, res) => {
    const { id } = req.params;

    await ShowRepository.cancelShow(id);

    // Invalidate cache
    await cache.delPattern('shows:*');

    res.status(200).json({
      success: true,
      message: 'Show cancelled successfully',
    });
  }),
};

module.exports = showController;