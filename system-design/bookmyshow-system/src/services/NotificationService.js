const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');
const config = require('../config');
const prisma = require('../config/database');

/**
 * Notification Service
 * Handles all notification types (Email, SMS, Push)
 * Pattern: Factory Pattern for notification channels
 * Pattern: Strategy Pattern for notification types
 */
class NotificationService {
  constructor() {
    this.emailTransporter = this.createEmailTransporter();
  }

  /**
   * Create email transporter
   * @returns {Object} Nodemailer transporter
   */
  createEmailTransporter() {
    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  /**
   * Send booking confirmation notification
   * @param {Object} booking - Booking object
   * @returns {Promise<Object>} Notification result
   */
  async sendBookingConfirmation(booking) {
    const user = booking.user;
    const show = booking.show;
    const movie = show.movie;
    const theater = show.theater;

    const emailContent = this.generateBookingConfirmationEmail(booking);
    
    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'BOOKING_CONFIRMATION',
        channel: 'EMAIL',
        status: 'PENDING',
        content: {
          bookingId: booking.id,
          movieTitle: movie.title,
          theaterName: theater.name,
          showTime: show.startTime,
        },
        scheduledAt: new Date(),
      },
    });

    try {
      // Send email
      await this.sendEmail({
        to: user.email,
        subject: `Booking Confirmed - ${movie.title}`,
        html: emailContent,
      });

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      logger.info('Booking confirmation sent', { bookingId: booking.id, userId: user.id });

      return { success: true, notificationId: notification.id };
    } catch (error) {
      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });

      logger.error('Failed to send booking confirmation', { error: error.message, bookingId: booking.id });
      throw error;
    }
  }

  /**
   * Send cancellation notification
   * @param {Object} booking - Booking object
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Notification result
   */
  async sendCancellationNotification(booking, reason = null) {
    const user = booking.user;
    const show = booking.show;
    const movie = show.movie;

    const emailContent = this.generateCancellationEmail(booking, reason);

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'CANCELLATION',
        channel: 'EMAIL',
        status: 'PENDING',
        content: {
          bookingId: booking.id,
          movieTitle: movie.title,
          reason,
        },
        scheduledAt: new Date(),
      },
    });

    try {
      await this.sendEmail({
        to: user.email,
        subject: `Booking Cancelled - ${movie.title}`,
        html: emailContent,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      logger.info('Cancellation notification sent', { bookingId: booking.id });

      return { success: true, notificationId: notification.id };
    } catch (error) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });

      logger.error('Failed to send cancellation notification', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule show reminder
   * @param {Object} booking - Booking object
   * @returns {Promise<Object>} Scheduled notification
   */
  async scheduleShowReminder(booking) {
    const show = booking.show;
    const user = booking.user;

    // Calculate reminder time (5 hours before show)
    const showTime = new Date(show.startTime);
    const reminderTime = new Date(showTime.getTime() - config.notification.reminderHoursBeforeShow * 60 * 60 * 1000);

    // Don't schedule if reminder time is in the past
    if (reminderTime <= new Date()) {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SHOW_REMINDER',
        channel: 'EMAIL',
        status: 'PENDING',
        content: {
          bookingId: booking.id,
          showId: show.id,
          movieTitle: show.movie.title,
          theaterName: show.theater.name,
          showTime: show.startTime,
        },
        scheduledAt: reminderTime,
      },
    });

    logger.info('Show reminder scheduled', { 
      notificationId: notification.id, 
      scheduledAt: reminderTime 
    });

    return notification;
  }

  /**
   * Process pending notifications (cron job)
   * @returns {Promise<number>} Count of processed notifications
   */
  async processPendingNotifications() {
    const pendingNotifications = await prisma.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      include: {
        user: true,
      },
    });

    let processedCount = 0;

    for (const notification of pendingNotifications) {
      try {
        const content = notification.content;
        let emailContent;

        switch (notification.type) {
          case 'BOOKING_CONFIRMATION':
            emailContent = this.generateBookingConfirmationEmailFromContent(content);
            break;
          case 'SHOW_REMINDER':
            emailContent = this.generateShowReminderEmail(notification);
            break;
          case 'CANCELLATION':
            emailContent = this.generateCancellationEmailFromContent(content);
            break;
          default:
            continue;
        }

        await this.sendEmail({
          to: notification.user.email,
          subject: this.getSubjectForType(notification.type),
          html: emailContent,
        });

        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: new Date() },
        });

        processedCount++;
      } catch (error) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'FAILED' },
        });

        logger.error('Failed to process notification', { 
          notificationId: notification.id, 
          error: error.message 
        });
      }
    }

    logger.info('Processed pending notifications', { count: processedCount });

    return processedCount;
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    const mailOptions = {
      from: `"BookMyShow" <${config.email.user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    // In development, just log the email
    if (config.nodeEnv === 'development') {
      logger.info('Email would be sent', { to: options.to, subject: options.subject });
      return { messageId: 'dev-' + Date.now() };
    }

    return this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * Generate booking confirmation email HTML
   * @param {Object} booking - Booking object
   * @returns {string} HTML content
   */
  generateBookingConfirmationEmail(booking) {
    const user = booking.user;
    const show = booking.show;
    const movie = show.movie;
    const theater = show.theater;
    const seats = booking.seats.map(s => `${s.seat.rowNumber}-${s.seat.seatNumber}`).join(', ');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e50914; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .booking-details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .ticket { border: 2px dashed #e50914; padding: 15px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name},</p>
            <p>Your booking has been confirmed. Here are the details:</p>
            
            <div class="booking-details">
              <h2>${movie.title}</h2>
              <p><strong>Theater:</strong> ${theater.name}</p>
              <p><strong>Address:</strong> ${theater.address}</p>
              <p><strong>Show Time:</strong> ${new Date(show.startTime).toLocaleString()}</p>
              <p><strong>Screen:</strong> ${show.screen.name}</p>
              <p><strong>Seats:</strong> ${seats}</p>
              <p><strong>Booking ID:</strong> ${booking.id}</p>
              <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
            </div>

            <div class="ticket">
              <p><strong>Important:</strong></p>
              <ul>
                <li>Please arrive at least 15 minutes before show time</li>
                <li>Show your booking ID or QR code at the counter</li>
                <li>Outside food and beverages are not allowed</li>
              </ul>
            </div>

            <p>Enjoy your movie!</p>
            <p>Best regards,<br>BookMyShow Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate cancellation email HTML
   * @param {Object} booking - Booking object
   * @param {string} reason - Cancellation reason
   * @returns {string} HTML content
   */
  generateCancellationEmail(booking, reason = null) {
    const user = booking.user;
    const show = booking.show;
    const movie = show.movie;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #666; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Cancelled</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name},</p>
            <p>Your booking for <strong>${movie.title}</strong> has been cancelled.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Refund Amount:</strong> ₹${booking.totalAmount}</p>
            <p>The refund will be processed within 5-7 business days.</p>
            <p>We hope to see you again soon!</p>
            <p>Best regards,<br>BookMyShow Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate show reminder email HTML
   * @param {Object} notification - Notification object
   * @returns {string} HTML content
   */
  generateShowReminderEmail(notification) {
    const content = notification.content;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e50914; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Show Reminder</h1>
          </div>
          <div class="content">
            <p>Dear ${notification.user.name},</p>
            <p>This is a reminder that your movie <strong>${content.movieTitle}</strong> is coming up!</p>
            <p><strong>Theater:</strong> ${content.theaterName}</p>
            <p><strong>Show Time:</strong> ${new Date(content.showTime).toLocaleString()}</p>
            <p>Don't forget to arrive at least 15 minutes early!</p>
            <p>Enjoy your movie!</p>
            <p>Best regards,<br>BookMyShow Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get subject line for notification type
   * @param {string} type - Notification type
   * @returns {string} Subject line
   */
  getSubjectForType(type) {
    const subjects = {
      BOOKING_CONFIRMATION: 'Your Booking is Confirmed - BookMyShow',
      SHOW_REMINDER: 'Show Reminder - Your movie is coming up!',
      CANCELLATION: 'Booking Cancelled - BookMyShow',
      PAYMENT_SUCCESS: 'Payment Successful - BookMyShow',
      PAYMENT_FAILED: 'Payment Failed - BookMyShow',
    };
    return subjects[type] || 'Notification from BookMyShow';
  }

  /**
   * Generate email from notification content
   */
  generateBookingConfirmationEmailFromContent(content) {
    return `<p>Your booking for ${content.movieTitle} is confirmed!</p>`;
  }

  generateCancellationEmailFromContent(content) {
    return `<p>Your booking for ${content.movieTitle} has been cancelled.</p>`;
  }
}

module.exports = new NotificationService();