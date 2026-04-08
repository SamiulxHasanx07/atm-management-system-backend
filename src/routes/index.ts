import { Router } from 'express';
import accountRoutes from './accountRoutes';
import transactionRoutes from './transactionRoutes';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: API
 *   description: ATM Management System API
 */

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);

export default router;
