import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse, AuthRequest } from '../types';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'No authorization header provided',
      } as ApiResponse);
      return;
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      } as ApiResponse);
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as {
      card_number: string;
      account_number: string;
    };

    req.user = decoded;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expired',
      } as ApiResponse);
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Invalid token',
    } as ApiResponse);
    return;
  }
};
