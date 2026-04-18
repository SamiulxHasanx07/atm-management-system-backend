import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database Migration Script
 * Run this to set up the database schema
 */
async function migrate(): Promise<void> {
  console.log('🚀 Starting database migration...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const dbName = process.env.DB_NAME || 'bangla_bank';
    
    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' ready`);

    await connection.query(`USE ${dbName}`);

    // Create accounts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_number VARCHAR(20) PRIMARY KEY,
        card_number VARCHAR(20) UNIQUE NOT NULL,
        pin VARCHAR(64) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        gender VARCHAR(20),
        profession VARCHAR(50),
        nationality VARCHAR(50) DEFAULT 'Bangladeshi',
        nid VARCHAR(20) UNIQUE,
        address TEXT,
        balance DECIMAL(15, 2) DEFAULT 0.00,
        blocked BOOLEAN DEFAULT FALSE,
        failed_pin_attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_card_number (card_number),
        INDEX idx_phone_number (phone_number),
        INDEX idx_email (email),
        INDEX idx_nid (nid),
        INDEX idx_account_number (account_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table "accounts" ready');

    // Create transactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_number VARCHAR(20) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        transaction_type ENUM('DEPOSIT', 'WITHDRAW', 'SEND_MONEY', 'RECEIVED_MONEY', 'TRANSFER') NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_number) REFERENCES accounts(card_number) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_card_number (card_number),
        INDEX idx_timestamp (timestamp),
        INDEX idx_transaction_type (transaction_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table "transactions" ready');

    await connection.query(`
      ALTER TABLE transactions
      MODIFY COLUMN transaction_type ENUM('DEPOSIT', 'WITHDRAW', 'SEND_MONEY', 'RECEIVED_MONEY', 'TRANSFER') NOT NULL;
    `);
    console.log('✅ Table "transactions" enum synced');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Execute migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default migrate;
