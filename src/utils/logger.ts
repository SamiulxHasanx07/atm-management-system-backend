import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const IS_VERCEL = process.env.VERCEL === '1';

const transports: winston.transport[] = [];

// File transports only when NOT on Vercel (read-only filesystem)
if (!IS_VERCEL) {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

// Console logging in development or on Vercel
if (process.env.NODE_ENV !== 'production' || IS_VERCEL) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Ensure at least one transport exists
if (transports.length === 0) {
  transports.push(new winston.transports.Console());
}

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'atm-backend' },
  transports,
});

export default logger;
