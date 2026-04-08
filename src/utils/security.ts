import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Hash a PIN using bcrypt
 */
export const hashPin = async (pin: string): Promise<string> => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  return bcrypt.hash(pin, saltRounds);
};

/**
 * Verify a PIN against a hashed PIN
 */
export const verifyPin = async (pin: string, hashedPin: string): Promise<boolean> => {
  return bcrypt.compare(pin, hashedPin);
};

/**
 * Generate a random 4-digit PIN
 */
export const generatePin = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Generate a random 16-digit card number
 */
export const generateCardNumber = (): string => {
  const prefix = '4'; // Visa-like prefix
  const randomDigits = Array.from({ length: 15 }, () =>
    Math.floor(Math.random() * 10)
  ).join('');
  return prefix + randomDigits;
};

/**
 * Generate a random 12-digit account number
 */
export const generateAccountNumber = (): string => {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
    .join('');
};

/**
 * Get last 4 digits of a string (for NID verification)
 */
export const getLast4Digits = (value: string): string => {
  return value.slice(-4);
};
