module.exports = {
  // Server Configuration
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    accessTokenExpiry: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY) || 900, // 15 minutes
    refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY) || 604800, // 7 days
  },
  
  // Bcrypt Configuration
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  },
  
  // Seat Lock Configuration
  seatLock: {
    ttl: parseInt(process.env.SEAT_LOCK_TTL) || 300, // 5 minutes
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  
  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  // Payment Gateway Configuration
  payment: {
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  
  // Booking Configuration
  booking: {
    maxSeatsPerBooking: 5,
    cancellationWindowHours: 4, // Can cancel up to 4 hours before show
  },
  
  // Notification Configuration
  notification: {
    reminderHoursBeforeShow: 5, // Send reminder 5 hours before show
  },
};