export const RPC_CONFIG = {
  // Base URL pattern for Tenderly RPC
  BASE_URL:
    process.env.NEXT_PUBLIC_TENDERLY_RPC_BASE_URL ||
    "https://virtual.mainnet.rpc.tenderly.co",

  // Function to build the full RPC URL from a GUID
  buildUrl: (guid: string) => {
    // Remove any whitespace and ensure clean URL parts
    const cleanGuid = guid.replace(/\s+/g, "");
    const baseUrl = RPC_CONFIG.BASE_URL.replace(/\s+/g, "");

    // Ensure base URL ends without a slash
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    // Construct URL with explicit concatenation
    const url = cleanBaseUrl + "/" + cleanGuid;

    // Debug log
    console.log("Building RPC URL:", {
      originalGuid: guid,
      cleanGuid,
      baseUrl,
      cleanBaseUrl,
      finalUrl: url,
    });

    return url;
  },
};
