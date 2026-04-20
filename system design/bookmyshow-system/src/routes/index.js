const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const movieController = require('../controllers/movieController');
const showController = require('../controllers/showController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BookMyShow API is running',
    timestamp: new Date().toISOString(),
  });
});

// ==================== AUTH ROUTES ====================
const authRoutes = express.Router();

authRoutes.post('/signup', authController.signup);
authRoutes.post('/login', authController.login);
authRoutes.post('/logout', authenticate, authController.logout);
authRoutes.post('/refresh-token', authController.refreshToken);
authRoutes.get('/me', authenticate, authController.getProfile);

router.use('/auth', authRoutes);

// ==================== MOVIE ROUTES ====================
const movieRoutes = express.Router();

movieRoutes.get('/', optionalAuth, movieController.getMovies);
movieRoutes.get('/running', optionalAuth, movieController.getRunningMovies);
movieRoutes.get('/:id', optionalAuth, movieController.getMovie);

// Admin routes
movieRoutes.post('/', authenticate, authorize('ADMIN'), movieController.createMovie);
movieRoutes.put('/:id', authenticate, authorize('ADMIN'), movieController.updateMovie);
movieRoutes.delete('/:id', authenticate, authorize('ADMIN'), movieController.deleteMovie);

router.use('/movies', movieRoutes);

// ==================== THEATER ROUTES ====================
const theaterRoutes = express.Router();

theaterRoutes.get('/', optionalAuth, async (req, res) => {
  const TheaterRepository = require('../repositories/TheaterRepository');
  const { city, latitude, longitude, radius } = req.query;

  let theaters;
  if (latitude && longitude) {
    theaters = await TheaterRepository.findTheatersNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius) || 10
    );
  } else if (city) {
    theaters = await TheaterRepository.findTheatersByCity(city);
  } else {
    return res.status(400).json({
      success: false,
      error: 'Please provide city or coordinates',
    });
  }

  res.status(200).json({
    success: true,
    data: theaters,
  });
});

theaterRoutes.get('/:id', optionalAuth, async (req, res) => {
  const TheaterRepository = require('../repositories/TheaterRepository');
  const theater = await TheaterRepository.getTheaterWithDetails(req.params.id);

  if (!theater) {
    return res.status(404).json({
      success: false,
      error: 'Theater not found',
    });
  }

  res.status(200).json({
    success: true,
    data: theater,
  });
});

router.use('/theaters', theaterRoutes);

// ==================== SHOW ROUTES ====================
const showRoutes = express.Router();

showRoutes.get('/', optionalAuth, showController.getShows);
showRoutes.get('/:id', optionalAuth, showController.getShow);
showRoutes.get('/:id/seats', optionalAuth, showController.getShowSeats);

// Admin routes
showRoutes.post('/', authenticate, authorize('ADMIN', 'THEATER_OWNER'), showController.createShow);
showRoutes.put('/:id/status', authenticate, authorize('ADMIN', 'THEATER_OWNER'), showController.updateShowStatus);
showRoutes.delete('/:id', authenticate, authorize('ADMIN', 'THEATER_OWNER'), showController.cancelShow);

router.use('/shows', showRoutes);

// ==================== SEAT LOCK ROUTES ====================
const seatRoutes = express.Router();

seatRoutes.post('/lock', authenticate, bookingController.lockSeats);
seatRoutes.delete('/lock/:lockId', authenticate, bookingController.releaseLock);
seatRoutes.get('/lock/:lockId', authenticate, bookingController.getLockStatus);

router.use('/seats', seatRoutes);

// ==================== BOOKING ROUTES ====================
const bookingRoutes = express.Router();

bookingRoutes.get('/', authenticate, bookingController.getUserBookings);
bookingRoutes.post('/', authenticate, bookingController.createBooking);
bookingRoutes.get('/:id', authenticate, bookingController.getBooking);
bookingRoutes.post('/:id/cancel', authenticate, bookingController.cancelBooking);

router.use('/bookings', bookingRoutes);

// ==================== TICKET ROUTES ====================
const ticketRoutes = express.Router();

ticketRoutes.get('/:ticketNumber', authenticate, bookingController.getTicket);
ticketRoutes.post('/:ticketNumber/validate', authenticate, authorize('ADMIN', 'THEATER_OWNER'), bookingController.validateTicket);

router.use('/tickets', ticketRoutes);

// ==================== ADMIN ROUTES ====================
const adminRoutes = express.Router();

// All admin routes require authentication and admin role
adminRoutes.use(authenticate);
adminRoutes.use(authorize('ADMIN'));

// Movies
adminRoutes.use('/movies', movieRoutes);

// Shows
adminRoutes.use('/shows', showRoutes);

router.use('/admin', adminRoutes);

module.exports = router;