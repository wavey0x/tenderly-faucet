// Token interface
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isEth?: boolean;
}

// Balance information
export interface BalanceInfo {
  ETH: string;
  tokens: Record<string, string>;
}

// Address balance response
export interface AddressBalances {
  eth: string;
  token: string | null;
  symbol: string | null;
}

// RPC validation result
export interface RpcValidationResult {
  isValid: boolean;
  correctedUrl?: string;
  error?: string;
}

// Time unit types
export type TimeUnit = "seconds" | "days" | "weeks";

// RPC state
export interface RpcState {
  url: string;
  isValid: boolean;
  isValidating: boolean;
  error: string | null;
}
