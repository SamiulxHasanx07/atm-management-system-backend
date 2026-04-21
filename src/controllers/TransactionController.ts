import { Request, Response } from 'express';
import transactionService from '../services/TransactionService';
import { ApiResponse, AuthRequest } from '../types';
import { TransactionFilter } from '../models/Transaction';

export class TransactionController {
  private transactionService = transactionService;

  private respondWithError(res: Response, error: any, fallbackMessage: string): void {
    const statusCode = error?.statusCode || 400;
    const message = error?.message || fallbackMessage;

    res.status(statusCode).json({
      success: false,
      message,
      error: message,
    } as ApiResponse);
  }

  /**
   * @swagger
   * /api/transactions/{cardNumber}/deposit:
   *   post:
   *     summary: Deposit money
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cardNumber
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *             properties:
   *               amount:
   *                 type: number
   *                 minimum: 500
   *                 maximum: 25000
   *                 description: Must be multiple of 500
   *     responses:
   *       200:
   *         description: Deposit successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     transaction:
   *                       $ref: '#/components/schemas/Transaction'
   *                     balance:
   *                       type: number
   *       400:
   *         description: Validation error or limit exceeded
   */
  async deposit(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      const { amount } = req.body;

      const result = await this.transactionService.deposit(cardNumber, amount);

      res.status(200).json({
        success: true,
        message: 'Deposit successful',
        data: result,
      } as ApiResponse);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Deposit failed',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/transactions/{cardNumber}/withdraw:
   *   post:
   *     summary: Withdraw money
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cardNumber
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *             properties:
   *               amount:
   *                 type: number
   *                 minimum: 500
   *                 maximum: 25000
   *                 description: Must be multiple of 500
   *     responses:
   *       200:
   *         description: Withdrawal successful
   *       400:
   *         description: Insufficient balance or limit exceeded
   */
  async withdraw(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      const { amount } = req.body;

      const result = await this.transactionService.withdraw(cardNumber, amount);

      res.status(200).json({
        success: true,
        message: 'Withdrawal successful',
        data: result,
      } as ApiResponse);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Withdrawal failed',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/transactions/{cardNumber}:
   *   get:
   *     summary: Get transaction history
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cardNumber
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [DEPOSIT, WITHDRAW, SEND_MONEY, RECEIVED_MONEY]
   *       - in: query
   *         name: date_from
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: date_to
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *     responses:
   *       200:
   *         description: Transaction history
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      const { type, date_from, date_to, limit } = req.query;

      const filters: TransactionFilter = {
        card_number: cardNumber,
      };

      if (type) filters.transaction_type = type as 'DEPOSIT' | 'WITHDRAW' | 'SEND_MONEY' | 'RECEIVED_MONEY' | 'TRANSFER';
      if (date_from) filters.date_from = new Date(date_from as string);
      if (date_to) filters.date_to = new Date(date_to as string);
      if (limit) filters.limit = parseInt(limit as string);

      const transactions = await this.transactionService.getTransactions(cardNumber, filters);

      res.status(200).json({
        success: true,
        message: 'Transactions retrieved',
        data: transactions,
      } as ApiResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve transactions',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/transactions:
   *   get:
   *     summary: Get all transactions (Admin)
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: card_number
   *         schema:
   *           type: string
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [DEPOSIT, WITHDRAW, SEND_MONEY, RECEIVED_MONEY]
   *       - in: query
   *         name: date_from
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: date_to
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *     responses:
   *       200:
   *         description: All transactions with pagination
   */
  async getAllTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { card_number, type, date_from, date_to, limit, offset } = req.query;

      const filters: TransactionFilter = {};

      if (card_number) filters.card_number = card_number as string;
      if (type) filters.transaction_type = type as 'DEPOSIT' | 'WITHDRAW' | 'SEND_MONEY' | 'RECEIVED_MONEY' | 'TRANSFER';
      if (date_from) filters.date_from = new Date(date_from as string);
      if (date_to) filters.date_to = new Date(date_to as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await this.transactionService.getAllTransactions(filters);

      res.status(200).json({
        success: true,
        message: 'Transactions retrieved',
        data: result.transactions,
        pagination: {
          total: result.total,
          limit: filters.limit || 50,
          offset: filters.offset || 0,
        },
      } as ApiResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve transactions',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/transactions/cardless-deposit:
   *   post:
   *     summary: Cardless deposit using account number
   *     tags: [Transactions]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - account_number
   *               - nid_proof
   *               - amount
   *             properties:
   *               account_number:
   *                 type: string
   *                 description: 12-digit account number
   *               nid_proof:
   *                 type: string
   *                 description: Last 4 digits of NID
   *               amount:
   *                 type: number
   *                 minimum: 500
   *                 maximum: 25000
   *                 description: Must be multiple of 500
   *     responses:
   *       200:
   *         description: Cardless deposit successful
   *       400:
   *         description: Validation error or NID verification failed
   */
  async cardlessDeposit(req: Request, res: Response): Promise<void> {
    try {
      const { account_number, nid_proof, amount } = req.body;

      const result = await this.transactionService.cardlessDeposit(
        account_number,
        nid_proof,
        amount
      );

      res.status(200).json({
        success: true,
        message: 'Cardless deposit successful',
        data: result,
      } as ApiResponse);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cardless deposit failed',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/transactions/{cardNumber}/transfer/card:
   *   post:
   *     summary: Transfer money to another account by card number
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cardNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: Sender's card number
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - recipient_card_number
   *               - amount
   *             properties:
   *               recipient_card_number:
   *                 type: string
   *                 description: Recipient's card number
   *               amount:
   *                 type: number
   *                 minimum: 500
   *                 maximum: 50000
   *                 description: Must be multiple of 500 (e.g., 500, 1000, 1500...). Max 50,000 per transaction. Max 3 transfers per day.
   *     responses:
   *       200:
   *         description: Transfer successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     transaction:
   *                       $ref: '#/components/schemas/Transaction'
   *                     senderBalance:
   *                       type: number
   *                     recipientCardNumber:
   *                       type: string
   *       400:
   *         description: Validation error, insufficient balance, or daily limit exceeded
   *       401:
   *         description: Unauthorized - JWT token required
   */
  async transferByCardNumber(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      const { recipient_card_number, amount } = req.body;
      const authReq = req as AuthRequest;

      if (authReq.user?.card_number && authReq.user.card_number !== cardNumber) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to transfer from this card',
          error: 'You are not authorized to transfer from this card',
        } as ApiResponse);
        return;
      }

      const result = await this.transactionService.transferByCardNumber(
        cardNumber,
        recipient_card_number,
        amount
      );

      res.status(200).json({
        success: true,
        message: `Transfer successful to card ${result.recipientCardNumber}`,
        data: result,
      } as ApiResponse);
    } catch (error: any) {
      this.respondWithError(res, error, 'Transfer failed');
    }
  }

  /**
   * @swagger
   * /api/transactions/{cardNumber}/transfer/account:
   *   post:
   *     summary: Transfer money to another account by account number
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cardNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: Sender's card number
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - recipient_account_number
   *               - amount
   *             properties:
   *               recipient_account_number:
   *                 type: string
   *                 description: Recipient's account number
   *               amount:
   *                 type: number
   *                 minimum: 500
   *                 maximum: 50000
   *                 description: Must be multiple of 500 (e.g., 500, 1000, 1500...). Max 50,000 per transaction. Max 3 transfers per day.
   *     responses:
   *       200:
   *         description: Transfer successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     transaction:
   *                       $ref: '#/components/schemas/Transaction'
   *                     senderBalance:
   *                       type: number
   *                     recipientCardNumber:
   *                       type: string
   *                     recipientAccountNumber:
   *                       type: string
   *       400:
   *         description: Validation error, insufficient balance, or daily limit exceeded
   *       401:
   *         description: Unauthorized - JWT token required
   */
  async transferByAccountNumber(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      const { recipient_account_number, amount } = req.body;
      const authReq = req as AuthRequest;

      if (authReq.user?.card_number && authReq.user.card_number !== cardNumber) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to transfer from this card',
          error: 'You are not authorized to transfer from this card',
        } as ApiResponse);
        return;
      }

      const result = await this.transactionService.transferByAccountNumber(
        cardNumber,
        recipient_account_number,
        amount
      );

      res.status(200).json({
        success: true,
        message: `Transfer successful to account ${result.recipientAccountNumber}`,
        data: result,
      } as ApiResponse);
    } catch (error: any) {
      this.respondWithError(res, error, 'Transfer failed');
    }
  }
}

export default new TransactionController();
