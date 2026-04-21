import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';

// Import configuration
import { testConnection } from './config/database';
import { initializeDatabase } from './config/databaseInit';
import swaggerSpec from './config/swagger';

// Import routes
import apiRoutes from './routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = process.env.VERCEL === '1';

// ==========================================
// MIDDLEWARE
// ==========================================

// Security: Set HTTP headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Enable CORS for frontend applications
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging
if (!IS_VERCEL) {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// ROUTES
// ==========================================

// Swagger documentation - serve CSS/JS assets and the UI
app.use(
  '/api-docs',
  swaggerUi.serve as any,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ATM Management System - API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  }) as any
);

// Swagger JSON endpoint (useful for debugging and programmatic access)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ATM Management System API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ==========================================
// SERVER STARTUP (only when not on Vercel)
// ==========================================

if (!IS_VERCEL) {
  let server: any;

  const startServer = async (): Promise<void> => {
    try {
      // Initialize database
      console.log('🗄️  Initializing database...');
      await initializeDatabase();

      // Test database connection
      console.log('🔌 Testing database connection...');
      await testConnection();

      // Start server
      server = app.listen(PORT, () => {
        console.log('');
        console.log('=========================================');
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
        console.log(`🔌 Health Check: http://localhost:${PORT}/health`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('=========================================');
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  };

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    if (server) {
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
      // Force close after 10 seconds
      setTimeout(() => {
        console.log('Forcing shutdown...');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle port already in use
  process.on('uncaughtException', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please kill the other process or use a different port.`);
      process.exit(1);
    }
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
  });

  // Start the server
  startServer();
}

// Export for Vercel serverless
export default app;
module.exports = app;
