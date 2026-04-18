import { pool } from '../config/database';
import { Transaction, TransactionDTO, TransactionFilter, TransferResult } from '../models/Transaction';
import accountService from './AccountService';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '../utils/logger';

type ServiceError = Error & { statusCode?: number };

export class TransactionService {
  private accountService = accountService;

  private throwServiceError(message: string, statusCode: number): never {
    const error = new Error(message) as ServiceError;
    error.statusCode = statusCode;
    throw error;
  }

  /**
   * Deposit money
   */
  async deposit(cardNumber: string, amount: number): Promise<{ transaction: Transaction; balance: number }> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Validate amount
      if (amount <= 0) {
        throw new Error('Deposit amount must be positive');
      }

      if (amount < 500) {
        throw new Error('Minimum deposit amount is 500 TK');
      }

      if (amount > 25000) {
        throw new Error('Maximum deposit amount is 25,000 TK');
      }

      if (amount % 500 !== 0) {
        throw new Error('Deposit amount must be a multiple of 500');
      }

      // Check daily limits
      const dailyTotal = await this.accountService.getDailyTotal(cardNumber, 'DEPOSIT');
      const dailyCount = await this.accountService.getDailyCount(cardNumber, 'DEPOSIT');

      if (dailyTotal + amount > 50000) {
        throw new Error('Daily deposit limit of 50,000 TK exceeded');
      }

      if (dailyCount >= 5) {
        throw new Error('Maximum 5 deposit transactions per day');
      }

      // Check if account exists
      const account = await this.accountService.findByCardNumber(cardNumber);
      if (!account) {
        throw new Error('Account not found');
      }

      if (account.blocked) {
        throw new Error('Account is blocked');
      }

      // Update balance
      const newBalance = Number(account.balance) + amount;
      await connection.query<ResultSetHeader>(
        'UPDATE accounts SET balance = ? WHERE card_number = ?',
        [newBalance, cardNumber]
      );

      // Record transaction
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO transactions (card_number, amount, transaction_type) VALUES (?, ?, ?)',
        [cardNumber, amount, 'DEPOSIT']
      );

      await connection.commit();

      const transaction: Transaction = {
        id: result.insertId,
        card_number: cardNumber,
        amount,
        transaction_type: 'DEPOSIT',
        timestamp: new Date(),
      };

      logger.info(`Deposit: ${amount} TK to account ${cardNumber}. New balance: ${newBalance} TK`);

      return { transaction, balance: newBalance };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Withdraw money
   */
  async withdraw(cardNumber: string, amount: number): Promise<{ transaction: Transaction; balance: number }> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Validate amount
      if (amount <= 0) {
        throw new Error('Withdrawal amount must be positive');
      }

      if (amount < 500) {
        throw new Error('Minimum withdrawal amount is 500 TK');
      }

      if (amount > 25000) {
        throw new Error('Maximum withdrawal amount is 25,000 TK');
      }

      if (amount % 500 !== 0) {
        throw new Error('Withdrawal amount must be a multiple of 500');
      }

      // Check daily limits
      const dailyTotal = await this.accountService.getDailyTotal(cardNumber, 'WITHDRAW');
      const dailyCount = await this.accountService.getDailyCount(cardNumber, 'WITHDRAW');

      if (dailyTotal + amount > 50000) {
        throw new Error('Daily withdrawal limit of 50,000 TK exceeded');
      }

      if (dailyCount >= 5) {
        throw new Error('Maximum 5 withdrawal transactions per day');
      }

      // Check if account exists
      const account = await this.accountService.findByCardNumber(cardNumber);
      if (!account) {
        throw new Error('Account not found');
      }

      if (account.blocked) {
        throw new Error('Account is blocked');
      }

      // Check minimum balance
      const currentBalance = Number(account.balance);
      if (currentBalance - amount < 500) {
        throw new Error('Insufficient balance. Minimum balance of 500 TK must be maintained');
      }

      // Update balance
      const newBalance = currentBalance - amount;
      await connection.query<ResultSetHeader>(
        'UPDATE accounts SET balance = ? WHERE card_number = ?',
        [newBalance, cardNumber]
      );

      // Record transaction
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO transactions (card_number, amount, transaction_type) VALUES (?, ?, ?)',
        [cardNumber, amount, 'WITHDRAW']
      );

      await connection.commit();

      const transaction: Transaction = {
        id: result.insertId,
        card_number: cardNumber,
        amount,
        transaction_type: 'WITHDRAW',
        timestamp: new Date(),
      };

      logger.info(`Withdrawal: ${amount} TK from account ${cardNumber}. New balance: ${newBalance} TK`);

      return { transaction, balance: newBalance };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get transactions for a card
   */
  async getTransactions(cardNumber: string, filters?: TransactionFilter): Promise<Transaction[]> {
    let query = 'SELECT * FROM transactions WHERE card_number = ?';
    const params: any[] = [cardNumber];

    if (filters?.transaction_type) {
      query += ' AND transaction_type = ?';
      params.push(filters.transaction_type);
    }

    if (filters?.date_from) {
      query += ' AND timestamp >= ?';
      params.push(filters.date_from);
    }

    if (filters?.date_to) {
      query += ' AND timestamp <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows as Transaction[];
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number): Promise<Transaction | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    return (rows[0] as Transaction) || null;
  }

  /**
   * Get all transactions (admin)
   */
  async getAllTransactions(filters?: TransactionFilter): Promise<{ transactions: Transaction[]; total: number }> {
    let query = 'SELECT * FROM transactions WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as count FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (filters?.card_number) {
      query += ' AND card_number = ?';
      countQuery += ' AND card_number = ?';
      params.push(filters.card_number);
    }

    if (filters?.transaction_type) {
      query += ' AND transaction_type = ?';
      countQuery += ' AND transaction_type = ?';
      params.push(filters.transaction_type);
    }

    if (filters?.date_from) {
      query += ' AND timestamp >= ?';
      countQuery += ' AND timestamp >= ?';
      params.push(filters.date_from);
    }

    if (filters?.date_to) {
      query += ' AND timestamp <= ?';
      countQuery += ' AND timestamp <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const [countRows] = await pool.query<RowDataPacket[]>(countQuery, params);
    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return {
      transactions: rows as Transaction[],
      total: countRows[0].count,
    };
  }

  /**
   * Cardless deposit (by account number and NID verification)
   */
  async cardlessDeposit(
    accountNumber: string,
    nidProof: string,
    amount: number
  ): Promise<{ transaction: Transaction; balance: number }> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Find account
      const account = await this.accountService.findByAccountNumber(accountNumber);
      if (!account) {
        throw new Error('Account not found');
      }

      // Verify NID (last 4 digits)
      const last4Nid = account.nid.slice(-4);
      if (nidProof !== last4Nid) {
        throw new Error('NID verification failed');
      }

      // Validate amount
      if (amount <= 0) {
        throw new Error('Deposit amount must be positive');
      }

      if (amount < 500) {
        throw new Error('Minimum deposit amount is 500 TK');
      }

      if (amount > 25000) {
        throw new Error('Maximum deposit amount is 25,000 TK');
      }

      if (amount % 500 !== 0) {
        throw new Error('Deposit amount must be a multiple of 500');
      }

      // Update balance
      const newBalance = Number(account.balance) + amount;
      await connection.query<ResultSetHeader>(
        'UPDATE accounts SET balance = ? WHERE account_number = ?',
        [newBalance, accountNumber]
      );

      // Record transaction
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO transactions (card_number, amount, transaction_type) VALUES (?, ?, ?)',
        [account.card_number, amount, 'DEPOSIT']
      );

      await connection.commit();

      const transaction: Transaction = {
        id: result.insertId,
        card_number: account.card_number,
        amount,
        transaction_type: 'DEPOSIT',
        timestamp: new Date(),
      };

      logger.info(`Cardless deposit: ${amount} TK to account ${accountNumber}. New balance: ${newBalance} TK`);

      return { transaction, balance: newBalance };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get daily transfer total for a card
   */
  private async getDailyTransferTotal(cardNumber: string): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE card_number = ?
       AND transaction_type IN ('SEND_MONEY', 'TRANSFER')
       AND DATE(timestamp) = CURDATE()`,
      [cardNumber]
    );
    return parseFloat(rows[0].total);
  }

  /**
   * Get daily transfer count for a card
   */
  private async getDailyTransferCount(cardNumber: string): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count
       FROM transactions
       WHERE card_number = ?
       AND transaction_type IN ('SEND_MONEY', 'TRANSFER')
       AND DATE(timestamp) = CURDATE()`,
      [cardNumber]
    );
    return rows[0].count;
  }

  /**
   * Validate transfer amount
   * Rules:
   * - Minimum: 500 TK
   * - Maximum: 50,000 TK per transaction
   * - Must be multiple of 500 (500, 1000, 1500, 2000, ...)
   */
  private validateTransferAmount(amount: number): void {
    if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount)) {
      this.throwServiceError('Transfer amount must be a valid number', 400);
    }

    if (amount <= 0) {
      this.throwServiceError('Transfer amount must be positive', 400);
    }

    if (amount < 500) {
      this.throwServiceError('Minimum transfer amount is 500 TK', 400);
    }

    if (amount > 50000) {
      this.throwServiceError('Maximum transfer amount per transaction is 50,000 TK', 400);
    }

    if (amount % 500 !== 0) {
      this.throwServiceError('Transfer amount must be a multiple of 500 (e.g., 500, 1000, 1500, 2000, ...)', 400);
    }
  }

  /**
   * Transfer money to another account by card number
   */
  async transferByCardNumber(
    senderCardNumber: string,
    recipientCardNumber: string,
    amount: number
  ): Promise<TransferResult> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Validate amount
      this.validateTransferAmount(amount);

      // Prevent self-transfer
      if (senderCardNumber === recipientCardNumber) {
        this.throwServiceError('Cannot transfer to your own account', 400);
      }

      // Get sender account
      const senderAccount = await this.accountService.findByCardNumber(senderCardNumber);
      if (!senderAccount) {
        this.throwServiceError('Sender account not found', 404);
      }

      if (senderAccount.blocked) {
        this.throwServiceError('Sender account is blocked', 403);
      }

      // Get recipient account
      const recipientAccount = await this.accountService.findByCardNumber(recipientCardNumber);
      if (!recipientAccount) {
        this.throwServiceError('Recipient account not found', 404);
      }

      if (recipientAccount.blocked) {
        this.throwServiceError('Recipient account is blocked', 403);
      }

      // Check sender balance
      const senderBalance = Number(senderAccount.balance);
      if (senderBalance - amount < 500) {
        this.throwServiceError('Insufficient balance. Minimum balance of 500 TK must be maintained', 400);
      }

      // Check daily transfer limits (specific to TRANSFER type)
      const dailyTransferTotal = await this.getDailyTransferTotal(senderCardNumber);
      const dailyTransferCount = await this.getDailyTransferCount(senderCardNumber);

      if (dailyTransferCount >= 3) {
        this.throwServiceError('Maximum 3 transfer transactions allowed per day', 400);
      }

      if (dailyTransferTotal + amount > 50000) {
        this.throwServiceError('Daily transfer limit of 50,000 TK exceeded', 400);
      }

      // Deduct from sender
      const newSenderBalance = senderBalance - amount;
      await connection.query<ResultSetHeader>(
        'UPDATE accounts SET balance = ? WHERE card_number = ?',
        [newSenderBalance, senderCardNumber]
      );

      // Add to recipient
      const newRecipientBalance = Number(recipientAccount.balance) + amount;
      await connection.query<ResultSetHeader>(
        'UPDATE accounts SET balance = ? WHERE card_number = ?',
        [newRecipientBalance, recipientCardNumber]
      );

      // Record transaction for sender (as SEND_MONEY)
      const [senderResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO transactions (card_number, amount, transaction_type) VALUES (?, ?, ?)',
        [senderCardNumber, amount, 'SEND_MONEY']
      );

      // Record transaction for recipient (as RECEIVED_MONEY)
      await connection.query<ResultSetHeader>(
        'INSERT INTO transactions (card_number, amount, transaction_type) VALUES (?, ?, ?)',
        [recipientCardNumber, amount, 'RECEIVED_MONEY']
      );

      await connection.commit();

      const transaction: Transaction = {
        id: senderResult.insertId,
        card_number: senderCardNumber,
        amount,
        transaction_type: 'SEND_MONEY',
        timestamp: new Date(),
      };

      logger.info(`Transfer: ${amount} TK from ${senderCardNumber} to ${recipientCardNumber}. Sender balance: ${newSenderBalance} TK`);

      return {
        transaction,
        senderBalance: newSenderBalance,
        recipientCardNumber,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Transfer money to another account by account number
   */
  async transferByAccountNumber(
    senderCardNumber: string,
    recipientAccountNumber: string,
    amount: number
  ): Promise<TransferResult> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Validate amount
      this.validateTransferAmount(amount);

      // Get sender account
      const senderAccount = await this.accountService.findByCardNumber(senderCardNumber);
      if (!senderAccount) {
        this.throwServiceError('Sender account not found', 404);
      }

      if (senderAccount.blocked) {
        this.throwServiceError('Sender account is blocked', 403);
      }

      // Get recipient account by account number
      const recipientAccount = await this.accountService.findByAccountNumber(recipientAccountNumber);
      if (!recipientAccount) {
        this.throwServiceError('Recipient account not found', 404);
      }

      // Prevent self-transfer
      if (senderAccount.account_number === recipientAccountNumber) {
        this.throwServiceError('Cannot transfer to your own account', 400);
      }

      if (recipientAccount.blocked) {
        this.throwServiceError('Recipient account is blocked', 403);
      }

      // Check sender balance
      const senderBalance = Number(senderAccount.balance);
      if (senderBalance - amount < 500) {
        this.throwServiceError('Insufficient balance. Minimum balance of 500 TK must be maintained', 400);
      }

      // Check daily transfer limits (specific to TRANSFER type)
      const dailyTransferTotal = await this.getDailyTransferTotal(senderCardNumber);
      const dailyTransferCount = await this.getDailyTransferCount(senderCardNumber);

      if (dailyTransferCount >= 3) {
        this.throwServiceError('Maximum 3 transfer transactions allowed per day', 400);
      }

      if (dailyTransferTotal + amount > 50000) {
        this.throwServiceError('Daily transfer limit of 50,000 TK exceeded', 400);
      }

      // Deduct from sender
      const newSenderBalance = senderBalance - amount;
      await connection.query<ResultSetHeader>(
        'UPDATE accounts SET balance = ? WHERE card_number = ?',
        [newSenderBalance, senderCardNumber]
      );

      // Add to recipient
      const newRecipientBalance = Number(recipientAccount.balance) + amount;
      await connection.query<ResultSetHeader>(
        'UPDATE accounts SET balance = ? WHERE account_number = ?',
        [newRecipientBalance, recipientAccountNumber]
      );

      // Record transaction for sender (as SEND_MONEY)
      const [senderResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO transactions (card_number, amount, transaction_type) VALUES (?, ?, ?)',
        [senderCardNumber, amount, 'SEND_MONEY']
      );

      // Record transaction for recipient (as RECEIVED_MONEY)
      await connection.query<ResultSetHeader>(
        'INSERT INTO transactions (card_number, amount, transaction_type) VALUES (?, ?, ?)',
        [recipientAccount.card_number, amount, 'RECEIVED_MONEY']
      );

      await connection.commit();

      const transaction: Transaction = {
        id: senderResult.insertId,
        card_number: senderCardNumber,
        amount,
        transaction_type: 'SEND_MONEY',
        timestamp: new Date(),
      };

      logger.info(`Transfer: ${amount} TK from ${senderCardNumber} to account ${recipientAccountNumber}. Sender balance: ${newSenderBalance} TK`);

      return {
        transaction,
        senderBalance: newSenderBalance,
        recipientCardNumber: recipientAccount.card_number,
        recipientAccountNumber,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default new TransactionService();
