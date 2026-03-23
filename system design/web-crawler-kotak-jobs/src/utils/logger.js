import winston from 'winston';
import config from '../config/config.js';

// Singleton Pattern for Logger
class Logger {
  static instance = null;

  constructor() {
    if (Logger.instance) {
      return Logger.instance;
    }

    const transports = [];

    // Console transport
    if (config.logging.console.enabled) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: config.logging.console.colorize }),
            winston.format.timestamp(),
            winston.format.printf(
              (info) => `${info.timestamp} [${info.level}]: ${info.message}${
                Object.keys(info.metadata || {}).length ? ' ' + JSON.stringify(info.metadata) : ''
              }`
            )
          ),
        })
      );
    }

    // File transport
    if (config.logging.file.enabled) {
      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: config.logging.file.directory + '/' + config.logging.file.filename,
          level: config.logging.level,
          maxsize: config.logging.file.maxSize,
          maxFiles: config.logging.file.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: config.logging.file.directory + '/' + config.logging.file.errorFilename,
          level: 'error',
          maxsize: config.logging.file.maxSize,
          maxFiles: config.logging.file.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    }

    this.logger = winston.createLogger({
      level: config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.metadata()
      ),
      transports,
      exitOnError: false,
    });

    Logger.instance = this;
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  verbose(message, meta = {}) {
    this.logger.verbose(message, meta);
  }
}

export default Logger;