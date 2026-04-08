import { pool } from '../config/database';
import { Account, CreateAccountDTO, AccountResponse } from '../models/Account';
import { hashPin, generatePin, generateCardNumber, generateAccountNumber, verifyPin } from '../utils/security';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '../utils/logger';

export class AccountService {
  /**
   * Create a new account
   */
  async createAccount(dto: CreateAccountDTO): Promise<{ account: AccountResponse; pin: string }> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Validate uniqueness
      const [phoneExists] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM accounts WHERE phone_number = ?',
        [dto.phone_number]
      );
      if (phoneExists[0].count > 0) {
        throw new Error('Phone number already registered');
      }

      const [emailExists] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM accounts WHERE email = ?',
        [dto.email]
      );
      if (dto.email && emailExists[0].count > 0) {
        throw new Error('Email already registered');
      }

      const [nidExists] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM accounts WHERE nid = ?',
        [dto.nid]
      );
      if (nidExists[0].count > 0) {
        throw new Error('NID already registered');
      }

      // Validate minimum deposit
      if (dto.initial_deposit < 100) {
        throw new Error('Minimum initial deposit is 100 TK');
      }

      // Generate account details
      const accountNumber = generateAccountNumber();
      const cardNumber = generateCardNumber();
      const pin = generatePin();
      const hashedPin = await hashPin(pin);

      // Insert account
      await connection.query<ResultSetHeader>(
        `INSERT INTO accounts 
         (account_number, card_number, pin, name, phone_number, email, gender, profession, nationality, nid, address, balance) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountNumber,
          cardNumber,
          hashedPin,
          dto.name,
          dto.phone_number,
          dto.email || null,
          dto.gender,
          dto.profession,
          dto.nationality || 'Bangladeshi',
          dto.nid,
          dto.address,
          dto.initial_deposit,
        ]
      );

      await connection.commit();

      const accountResponse: AccountResponse = {
        account_number: accountNumber,
        card_number: cardNumber,
        name: dto.name,
        phone_number: dto.phone_number,
        email: dto.email,
        gender: dto.gender,
        profession: dto.profession,
        nationality: dto.nationality || 'Bangladeshi',
        nid: dto.nid,
        address: dto.address,
        balance: dto.initial_deposit,
        created_at: new Date(),
      };

      logger.info(`Account created: ${accountNumber} for ${dto.name}`);

      return { account: accountResponse, pin };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find account by account number
   */
  async findByAccountNumber(accountNumber: string): Promise<Account | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM accounts WHERE account_number = ?',
      [accountNumber]
    );
    return (rows[0] as Account) || null;
  }

  /**
   * Find account by card number
   */
  async findByCardNumber(cardNumber: string): Promise<Account | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM accounts WHERE card_number = ?',
      [cardNumber]
    );
    return (rows[0] as Account) || null;
  }

  /**
   * Find account by phone number
   */
  async findByPhone(phoneNumber: string): Promise<Account | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM accounts WHERE phone_number = ?',
      [phoneNumber]
    );
    return (rows[0] as Account) || null;
  }

  /**
   * Find account by email
   */
  async findByEmail(email: string): Promise<Account | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM accounts WHERE email = ?',
      [email]
    );
    return (rows[0] as Account) || null;
  }

  /**
   * Find account by NID
   */
  async findByNid(nid: string): Promise<Account | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM accounts WHERE nid = ?',
      [nid]
    );
    return (rows[0] as Account) || null;
  }

  /**
   * List all accounts (admin)
   */
  async listAccounts(limit: number = 50, offset: number = 0): Promise<AccountResponse[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT account_number, card_number, name, phone_number, email, gender, 
              profession, nationality, nid, address, balance, created_at 
       FROM accounts 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows as AccountResponse[];
  }

  /**
   * Block an account (card)
   */
  async blockAccount(cardNumber: string): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE accounts SET blocked = TRUE WHERE card_number = ?',
      [cardNumber]
    );

    if (result.affectedRows === 0) {
      throw new Error('Account not found');
    }

    logger.warn(`Account blocked: ${cardNumber}`);
  }

  /**
   * Unblock an account (card)
   */
  async unblockAccount(cardNumber: string): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE accounts SET blocked = FALSE, failed_pin_attempts = 0 WHERE card_number = ?',
      [cardNumber]
    );

    if (result.affectedRows === 0) {
      throw new Error('Account not found');
    }

    logger.info(`Account unblocked: ${cardNumber}`);
  }

  /**
   * Verify PIN and handle failed attempts
   */
  async verifyPin(cardNumber: string, pin: string): Promise<{ valid: boolean; blocked?: boolean }> {
    const account = await this.findByCardNumber(cardNumber);
    
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.blocked) {
      return { valid: false, blocked: true };
    }

    const isValid = await verifyPin(pin, account.pin);

    if (!isValid) {
      // Increment failed attempts
      const newAttempts = account.failed_pin_attempts + 1;
      
      if (newAttempts >= 3) {
        // Block account after 3 failed attempts
        await this.blockAccount(cardNumber);
        logger.warn(`Account blocked due to multiple failed PIN attempts: ${cardNumber}`);
        return { valid: false, blocked: true };
      }

      await pool.query(
        'UPDATE accounts SET failed_pin_attempts = ? WHERE card_number = ?',
        [newAttempts, cardNumber]
      );

      return { valid: false, blocked: false };
    }

    // Reset failed attempts on successful login
    await pool.query(
      'UPDATE accounts SET failed_pin_attempts = 0 WHERE card_number = ?',
      [cardNumber]
    );

    return { valid: true, blocked: false };
  }

  /**
   * Update PIN (logged-in user)
   */
  async updatePin(cardNumber: string, newPin: string): Promise<void> {
    const account = await this.findByCardNumber(cardNumber);
    
    if (!account) {
      throw new Error('Account not found');
    }

    // Check if new PIN is same as old
    const isSamePin = await verifyPin(newPin, account.pin);
    if (isSamePin) {
      throw new Error('New PIN cannot be the same as current PIN');
    }

    const hashedPin = await hashPin(newPin);
    await pool.query(
      'UPDATE accounts SET pin = ?, failed_pin_attempts = 0 WHERE card_number = ?',
      [hashedPin, cardNumber]
    );

    logger.info(`PIN updated for account: ${cardNumber}`);
  }

  /**
   * Reset PIN (forgot PIN flow - verify by NID)
   */
  async resetPin(cardNumber: string, nidProof: string): Promise<string> {
    const account = await this.findByCardNumber(cardNumber);
    
    if (!account) {
      throw new Error('Account not found');
    }

    // Verify identity by matching last 4 digits of NID
    const last4Nid = account.nid.slice(-4);
    if (nidProof !== last4Nid) {
      throw new Error('NID verification failed');
    }

    // Generate new PIN
    const newPin = generatePin();
    const hashedPin = await hashPin(newPin);

    await pool.query(
      'UPDATE accounts SET pin = ?, blocked = FALSE, failed_pin_attempts = 0 WHERE card_number = ?',
      [hashedPin, cardNumber]
    );

    logger.info(`PIN reset for account: ${cardNumber}`);

    return newPin;
  }

  /**
   * Get account balance
   */
  async getBalance(cardNumber: string): Promise<number> {
    const account = await this.findByCardNumber(cardNumber);
    
    if (!account) {
      throw new Error('Account not found');
    }

    return account.balance;
  }

  /**
   * Get daily transaction total
   */
  async getDailyTotal(cardNumber: string, type: 'DEPOSIT' | 'WITHDRAW'): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE card_number = ? 
       AND transaction_type = ? 
       AND DATE(timestamp) = CURDATE()`,
      [cardNumber, type]
    );

    return parseFloat(rows[0].total);
  }

  /**
   * Get daily transaction count
   */
  async getDailyCount(cardNumber: string, type: 'DEPOSIT' | 'WITHDRAW'): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count 
       FROM transactions 
       WHERE card_number = ? 
       AND transaction_type = ? 
       AND DATE(timestamp) = CURDATE()`,
      [cardNumber, type]
    );

    return rows[0].count;
  }
}

export default new AccountService();
