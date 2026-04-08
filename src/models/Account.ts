export interface Account {
  account_number: string;
  card_number: string;
  pin: string;
  name: string;
  phone_number: string;
  email?: string;
  gender: string;
  profession: string;
  nationality: string;
  nid: string;
  address: string;
  balance: number;
  blocked: boolean;
  failed_pin_attempts: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAccountDTO {
  name: string;
  phone_number: string;
  email?: string;
  gender: string;
  profession: string;
  nationality?: string;
  nid: string;
  address: string;
  initial_deposit: number;
}

export interface AccountResponse {
  account_number: string;
  card_number: string;
  name: string;
  phone_number: string;
  email?: string;
  gender: string;
  profession: string;
  nationality: string;
  nid: string;
  address: string;
  balance: number;
  created_at: Date;
}
