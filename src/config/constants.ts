// Storage keys for localStorage and cookies
export const STORAGE_KEYS = {
  SAVED_ADDRESSES: "tenderly-faucet-addresses",
  TENDERLY_URL: "tenderly-faucet-url",
  ERROR: "tenderly-faucet-error",
} as const;

// Multicall contract address (Multicall3 - deployed on most networks)
export const MULTICALL_ADDRESS =
  "0xcA11bde05977b3631167028862bE2a173976CA11";

// Time conversion constants
export const TIME_UNITS = {
  SECONDS: 1,
  DAYS: 86400,
  WEEKS: 604800,
} as const;

// Validation timeouts (in milliseconds)
export const TIMEOUTS = {
  RPC_VALIDATION: 10000,
  TOKEN_VALIDATION: 5000,
} as const;

// Default RPC configuration
export const DEFAULT_RPC_BASE_URL = "https://virtual.mainnet.rpc.tenderly.co";

// Regex patterns
export const PATTERNS = {
  GUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  TENDERLY_URL: /virtual\.mainnet\.([^.]+)\.rpc\.tenderly\.co/,
  GUID_IN_URL:
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;
