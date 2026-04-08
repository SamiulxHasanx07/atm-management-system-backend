import bcrypt from 'bcrypt';
import { pool } from '../src/config/database';

/**
 * Database Seed Script
 * Creates sample data for testing
 */
async function seed(): Promise<void> {
  console.log('🌱 Starting database seed...');

  const hashedPin = await bcrypt.hash('1234', 10);

  const sampleAccounts = [
    {
      account_number: '100000000001',
      card_number: '4000000000000001',
      pin: hashedPin,
      name: 'John Doe',
      phone_number: '01712345678',
      email: 'john@example.com',
      gender: 'Male',
      profession: 'Engineer',
      nationality: 'Bangladeshi',
      nid: '1234567890123',
      address: '123 Main Street, Dhaka',
      balance: 10000.00,
      blocked: false,
    },
    {
      account_number: '100000000002',
      card_number: '4000000000000002',
      pin: hashedPin,
      name: 'Jane Smith',
      phone_number: '01712345679',
      email: 'jane@example.com',
      gender: 'Female',
      profession: 'Teacher',
      nationality: 'Bangladeshi',
      nid: '1234567890124',
      address: '456 Park Avenue, Dhaka',
      balance: 25000.00,
      blocked: false,
    },
  ];

  try {
    const connection = await pool.getConnection();

    // Insert sample accounts
    for (const account of sampleAccounts) {
      await connection.query(
        `INSERT IGNORE INTO accounts 
         (account_number, card_number, pin, name, phone_number, email, gender, profession, nationality, nid, address, balance, blocked) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          account.account_number,
          account.card_number,
          account.pin,
          account.name,
          account.phone_number,
          account.email,
          account.gender,
          account.profession,
          account.nationality,
          account.nid,
          account.address,
          account.balance,
          account.blocked,
        ]
      );
      console.log(`✅ Seeded account: ${account.name}`);
    }

    // Insert sample transactions
    await connection.query(
      `INSERT INTO transactions (card_number, amount, transaction_type) VALUES ?`,
      [
        ['4000000000000001', 5000, 'DEPOSIT'],
        ['4000000000000001', 2000, 'WITHDRAW'],
        ['4000000000000002', 10000, 'DEPOSIT'],
      ]
    );
    console.log('✅ Seeded sample transactions');

    connection.release();
    console.log('✅ Seed completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// Execute seed
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export default seed;
