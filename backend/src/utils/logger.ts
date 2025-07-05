import winston from 'winston';
import { config } from '@/config/config';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS',
  }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport
if (!config.isProduction) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.log.level,
    })
  );
}

// File transports for production
if (config.isProduction) {
  // Combined logs
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
      level: config.log.level,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  
  // Error logs
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      format: logFormat,
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  
  // Console for production (with simpler format)
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      level: 'info',
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.log.level,
  format: logFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({ filename: 'logs/rejections.log' })
);

// Create request logger for HTTP requests
export const requestLogger = {
  info: (message: string, meta?: any) => {
    logger.info(message, { context: 'REQUEST', ...meta });
  },
  error: (message: string, meta?: any) => {
    logger.error(message, { context: 'REQUEST', ...meta });
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, { context: 'REQUEST', ...meta });
  },
};

// Create database logger
export const dbLogger = {
  info: (message: string, meta?: any) => {
    logger.info(message, { context: 'DATABASE', ...meta });
  },
  error: (message: string, meta?: any) => {
    logger.error(message, { context: 'DATABASE', ...meta });
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, { context: 'DATABASE', ...meta });
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, { context: 'DATABASE', ...meta });
  },
};

// Create security logger
export const securityLogger = {
  info: (message: string, meta?: any) => {
    logger.info(message, { context: 'SECURITY', ...meta });
  },
  error: (message: string, meta?: any) => {
    logger.error(message, { context: 'SECURITY', ...meta });
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, { context: 'SECURITY', ...meta });
  },
};

// Create performance logger
export const performanceLogger = {
  info: (message: string, meta?: any) => {
    logger.info(message, { context: 'PERFORMANCE', ...meta });
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, { context: 'PERFORMANCE', ...meta });
  },
};

// Log startup information
logger.info('Logger initialized', {
  level: config.log.level,
  environment: config.env,
  transports: transports.length,
});

// Export logger as default
export default logger;