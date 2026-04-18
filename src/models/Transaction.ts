export interface Transaction {
  id: number;
  card_number: string;
  amount: number;
  transaction_type: 'DEPOSIT' | 'WITHDRAW' | 'SEND_MONEY' | 'RECEIVED_MONEY' | 'TRANSFER';
  timestamp: Date;
}

export interface TransactionDTO {
  card_number: string;
  amount: number;
  transaction_type: 'DEPOSIT' | 'WITHDRAW' | 'SEND_MONEY' | 'RECEIVED_MONEY' | 'TRANSFER';
}

export interface TransferResult {
  transaction: Transaction;
  senderBalance: number;
  recipientCardNumber: string;
  recipientAccountNumber?: string;
}

export interface TransactionFilter {
  card_number?: string;
  transaction_type?: 'DEPOSIT' | 'WITHDRAW' | 'SEND_MONEY' | 'RECEIVED_MONEY' | 'TRANSFER';
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}
