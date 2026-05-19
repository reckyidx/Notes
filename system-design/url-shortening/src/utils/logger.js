const winston = require('winston');
const path = require('path');

/**
 * Factory Pattern for Logger Creation
 * Creates different types of loggers based on environment
 */
class LoggerFactory {
  static createLogger() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const formats = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
    ];

    if (isDevelopment) {
      formats.push(winston.format.colorize());
      formats.push(winston.format.printf(({ timestamp, level, message, stack }) => {
        if (stack) {
          return `${timestamp} [${level}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level}]: ${message}`;
      }));
    } else {
      formats.push(winston.format.json());
    }

    const transports = [
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
      }),
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
      }),
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
      }),
    ];

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      formats,
      transports,
    });
  }
}

module.exports = LoggerFactory.createLogger();
