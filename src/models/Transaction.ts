export interface Transaction {
  id: number;
  card_number: string;
  amount: number;
  transaction_type: 'DEPOSIT' | 'WITHDRAW';
  timestamp: Date;
}

export interface TransactionDTO {
  card_number: string;
  amount: number;
  transaction_type: 'DEPOSIT' | 'WITHDRAW';
}

export interface TransactionFilter {
  card_number?: string;
  transaction_type?: 'DEPOSIT' | 'WITHDRAW';
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}
