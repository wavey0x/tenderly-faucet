export const RPC_CONFIG = {
  // Base URL pattern for Tenderly RPC
  BASE_URL:
    process.env.NEXT_PUBLIC_TENDERLY_RPC_BASE_URL ||
    "https://virtual.mainnet.rpc.tenderly.co",

  // Function to build the full RPC URL from a GUID
  buildUrl: (guid: string) => {
    const cleanGuid = guid.trim();
    const baseUrl = RPC_CONFIG.BASE_URL.trim();
    return `${baseUrl}/${cleanGuid}`;
  },
};
