import { pool } from '../config/database';
import { Transaction, TransactionDTO, TransactionFilter } from '../models/Transaction';
import accountService from './AccountService';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '../utils/logger';

export class TransactionService {
  private accountService = accountService;

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
}

export default new TransactionService();
