import { Request, Response } from 'express';
import accountService from '../services/AccountService';
import { CreateAccountDTO } from '../models/Account';
import { ApiResponse } from '../types';

export class AccountController {
  private accountService = accountService;

  /**
   * @swagger
   * /api/accounts:
   *   post:
   *     summary: Create a new account
   *     tags: [Accounts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - phone_number
   *               - gender
   *               - profession
   *               - nid
   *               - address
   *               - initial_deposit
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *               phone_number:
   *                 type: string
   *                 pattern: '^[0-9]{10,15}$'
   *               email:
   *                 type: string
   *                 format: email
   *               gender:
   *                 type: string
   *                 enum: [Male, Female, Other]
   *               profession:
   *                 type: string
   *               nid:
   *                 type: string
   *                 pattern: '^[0-9]+$'
   *               address:
   *                 type: string
   *               nationality:
   *                 type: string
   *                 default: Bangladeshi
   *               initial_deposit:
   *                 type: number
   *                 minimum: 100
   *     responses:
   *       201:
   *         description: Account created successfully
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
   *                     account:
   *                       $ref: '#/components/schemas/AccountResponse'
   *                     pin:
   *                       type: string
   *                       description: Generated 4-digit PIN
   *       400:
   *         description: Validation error or duplicate entry
   */
  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateAccountDTO = req.body;

      const result = await this.accountService.createAccount(dto);

      const response: ApiResponse = {
        success: true,
        message: 'Account created successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        message: error.message || 'Failed to create account',
        error: error.message,
      };

      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/accounts/{accountNumber}:
   *   get:
   *     summary: Get account by account number
   *     tags: [Accounts]
   *     parameters:
   *       - in: path
   *         name: accountNumber
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Account details
   *       404:
   *         description: Account not found
   */
  async getAccount(req: Request, res: Response): Promise<void> {
    try {
      const { accountNumber } = req.params;

      const account = await this.accountService.findByAccountNumber(accountNumber);

      if (!account) {
        res.status(404).json({
          success: false,
          message: 'Account not found',
        } as ApiResponse);
        return;
      }

      // Remove sensitive fields
      const { pin, blocked, failed_pin_attempts, ...safeAccount } = account;

      res.status(200).json({
        success: true,
        message: 'Account retrieved',
        data: safeAccount,
      } as ApiResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve account',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/accounts:
   *   get:
   *     summary: List all accounts (Admin)
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: List of accounts
   */
  async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const accounts = await this.accountService.listAccounts(limit, offset);

      res.status(200).json({
        success: true,
        message: 'Accounts retrieved',
        data: accounts,
        pagination: { limit, offset },
      } as ApiResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve accounts',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/accounts/{cardNumber}/block:
   *   post:
   *     summary: Block an account card
   *     tags: [Accounts]
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
   *               - nid_proof
   *             properties:
   *               nid_proof:
   *                 type: string
   *                 description: Last 4 digits of NID
   *     responses:
   *       200:
   *         description: Account blocked successfully
   *       400:
   *         description: NID verification failed
   */
  async blockAccount(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      const { nid_proof } = req.body;

      const account = await this.accountService.findByCardNumber(cardNumber);

      if (!account) {
        res.status(404).json({
          success: false,
          message: 'Account not found',
        } as ApiResponse);
        return;
      }

      // Verify NID
      if (nid_proof !== account.nid.slice(-4)) {
        res.status(400).json({
          success: false,
          message: 'NID verification failed',
        } as ApiResponse);
        return;
      }

      await this.accountService.blockAccount(cardNumber);

      res.status(200).json({
        success: true,
        message: 'Account blocked successfully',
      } as ApiResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to block account',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/accounts/{cardNumber}/unblock:
   *   post:
   *     summary: Unblock an account card (Admin)
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cardNumber
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Account unblocked successfully
   */
  async unblockAccount(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;

      await this.accountService.unblockAccount(cardNumber);

      res.status(200).json({
        success: true,
        message: 'Account unblocked successfully',
      } as ApiResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to unblock account',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/accounts/login:
   *   post:
   *     summary: Authenticate with card number and PIN
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - card_number
   *               - pin
   *             properties:
   *               card_number:
   *                 type: string
   *               pin:
   *                 type: string
   *                 maxLength: 4
   *                 minLength: 4
   *     responses:
   *       200:
   *         description: Authentication successful
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
   *                     token:
   *                       type: string
   *                     account:
   *                       type: object
   *       401:
   *         description: Invalid PIN or account blocked
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { card_number, pin } = req.body;

      const account = await this.accountService.findByCardNumber(card_number);

      if (!account) {
        res.status(404).json({
          success: false,
          message: 'Account not found',
        } as ApiResponse);
        return;
      }

      const result = await this.accountService.verifyPin(card_number, pin);

      if (result.blocked) {
        res.status(403).json({
          success: false,
          message: 'Account is blocked due to multiple failed attempts. Contact support.',
        } as ApiResponse);
        return;
      }

      if (!result.valid) {
        res.status(401).json({
          success: false,
          message: 'Invalid PIN',
        } as ApiResponse);
        return;
      }

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        {
          card_number: account.card_number,
          account_number: account.account_number,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          token,
          account: {
            account_number: account.account_number,
            card_number: account.card_number,
            name: account.name,
            balance: account.balance,
          },
        },
      } as ApiResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Authentication failed',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/accounts/{cardNumber}/pin:
   *   put:
   *     summary: Update PIN (authenticated user)
   *     tags: [Accounts]
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
   *               - new_pin
   *             properties:
   *               new_pin:
   *                 type: string
   *                 maxLength: 4
   *                 minLength: 4
   *     responses:
   *       200:
   *         description: PIN updated successfully
   *       400:
   *         description: Validation error
   */
  async updatePin(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      const { new_pin } = req.body;

      await this.accountService.updatePin(cardNumber, new_pin);

      res.status(200).json({
        success: true,
        message: 'PIN updated successfully',
      } as ApiResponse);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update PIN',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/accounts/{cardNumber}/pin/reset:
   *   post:
   *     summary: Reset PIN (forgot PIN)
   *     tags: [Accounts]
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
   *               - nid_proof
   *             properties:
   *               nid_proof:
   *                 type: string
   *                 description: Last 4 digits of NID
   *     responses:
   *       200:
   *         description: PIN reset successful
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
   *                     new_pin:
   *                       type: string
   */
  async resetPin(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      const { nid_proof } = req.body;

      const newPin = await this.accountService.resetPin(cardNumber, nid_proof);

      res.status(200).json({
        success: true,
        message: 'PIN reset successful. Please save your new PIN.',
        data: { new_pin: newPin },
      } as ApiResponse);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reset PIN',
        error: error.message,
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/accounts/{cardNumber}/balance:
   *   get:
   *     summary: Get account balance
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cardNumber
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Current balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;

      const balance = await this.accountService.getBalance(cardNumber);

      res.status(200).json({
        success: true,
        message: 'Balance retrieved',
        data: { balance },
      } as ApiResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve balance',
        error: error.message,
      } as ApiResponse);
    }
  }
}

export default new AccountController();
