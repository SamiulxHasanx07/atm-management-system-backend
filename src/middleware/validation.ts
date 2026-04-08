import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiResponse } from '../types';

export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err: any) => ({
          field: err.path,
          message: err.msg,
        })),
      } as ApiResponse);
      return;
    }

    next();
  };
};

// Common validation chains
export const accountValidation = {
  createAccount: [
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),
    body('phone_number')
      .matches(/^[0-9]{10,15}$/)
      .withMessage('Phone number must be 10-15 digits'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
    body('gender')
      .isIn(['Male', 'Female', 'Other'])
      .withMessage('Gender must be Male, Female, or Other'),
    body('profession')
      .trim()
      .notEmpty()
      .withMessage('Profession is required'),
    body('nid')
      .matches(/^[0-9]+$/)
      .withMessage('NID must contain only numbers'),
    body('address')
      .trim()
      .notEmpty()
      .withMessage('Address is required'),
    body('initial_deposit')
      .isFloat({ min: 100 })
      .withMessage('Minimum initial deposit is 100 TK'),
  ],
  login: [
    body('card_number')
      .matches(/^[0-9]{16}$/)
      .withMessage('Card number must be 16 digits'),
    body('pin')
      .matches(/^[0-9]{4}$/)
      .withMessage('PIN must be 4 digits'),
  ],
  pinUpdate: [
    body('new_pin')
      .matches(/^[0-9]{4}$/)
      .withMessage('New PIN must be 4 digits'),
  ],
};

export const transactionValidation = {
  deposit: [
    body('amount')
      .isFloat({ min: 500, max: 25000 })
      .withMessage('Amount must be between 500 and 25,000 TK'),
  ],
  withdraw: [
    body('amount')
      .isFloat({ min: 500, max: 25000 })
      .withMessage('Amount must be between 500 and 25,000 TK'),
  ],
  cardlessDeposit: [
    body('account_number')
      .matches(/^[0-9]{12}$/)
      .withMessage('Account number must be 12 digits'),
    body('nid_proof')
      .matches(/^[0-9]{4}$/)
      .withMessage('NID proof must be last 4 digits'),
    body('amount')
      .isFloat({ min: 500, max: 25000 })
      .withMessage('Amount must be between 500 and 25,000 TK'),
  ],
};
