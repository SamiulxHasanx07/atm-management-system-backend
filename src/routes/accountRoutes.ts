import { Router } from 'express';
import AccountController from '../controllers/AccountController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Account management endpoints
 */

// Public routes
router.post('/', AccountController.createAccount.bind(AccountController));
router.post('/login', AccountController.login.bind(AccountController));
router.get('/:accountNumber', AccountController.getAccount.bind(AccountController));

// Protected routes (require authentication)
router.get('/', authMiddleware, AccountController.listAccounts.bind(AccountController));
router.get('/:cardNumber/balance', authMiddleware, AccountController.getBalance.bind(AccountController));
router.post('/:cardNumber/block', AccountController.blockAccount.bind(AccountController));
router.post('/:cardNumber/unblock', authMiddleware, AccountController.unblockAccount.bind(AccountController));
router.put('/:cardNumber/pin', authMiddleware, AccountController.updatePin.bind(AccountController));
router.post('/:cardNumber/pin/reset', AccountController.resetPin.bind(AccountController));

export default router;
