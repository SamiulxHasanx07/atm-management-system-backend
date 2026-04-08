import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    card_number: string;
    account_number: string;
  };
}

export interface LoginResponse {
  token: string;
  account: {
    account_number: string;
    card_number: string;
    name: string;
    balance: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: any[];
}
