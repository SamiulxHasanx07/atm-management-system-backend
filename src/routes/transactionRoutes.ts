import { Router } from 'express';
import TransactionController from '../controllers/TransactionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction management endpoints
 */

// Public routes
router.post('/cardless-deposit', TransactionController.cardlessDeposit.bind(TransactionController));

// Protected routes (require authentication)
router.post('/:cardNumber/deposit', authMiddleware, TransactionController.deposit.bind(TransactionController));
router.post('/:cardNumber/withdraw', authMiddleware, TransactionController.withdraw.bind(TransactionController));
router.get('/:cardNumber', authMiddleware, TransactionController.getTransactions.bind(TransactionController));
router.get('/', authMiddleware, TransactionController.getAllTransactions.bind(TransactionController));

export default router;
