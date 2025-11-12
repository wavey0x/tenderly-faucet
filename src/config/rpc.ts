import { DEFAULT_RPC_BASE_URL, PATTERNS } from "./constants";

export const RPC_CONFIG = {
  // Base URL pattern for Tenderly RPC
  BASE_URL: process.env.NEXT_PUBLIC_TENDERLY_RPC_BASE_URL || DEFAULT_RPC_BASE_URL,

  // GUID regex pattern
  GUID_PATTERN: PATTERNS.GUID,

  // Function to check if input is a GUID
  isGuid: (input: string): boolean => {
    return RPC_CONFIG.GUID_PATTERN.test(input.trim());
  },

  // Function to extract GUID from a Tenderly RPC URL
  extractGuid: (url: string): string | null => {
    try {
      const cleanUrl = url.trim();
      // Check if it's already just a GUID
      if (RPC_CONFIG.isGuid(cleanUrl)) {
        return cleanUrl;
      }

      // Try to extract GUID from URL
      // Tenderly URLs are in format: https://virtual.mainnet[.region].rpc.tenderly.co/GUID
      const urlObj = new URL(cleanUrl);
      const pathParts = urlObj.pathname.split("/").filter((p) => p);

      // The GUID should be the last part of the path
      if (pathParts.length > 0) {
        const potentialGuid = pathParts[pathParts.length - 1];
        if (RPC_CONFIG.isGuid(potentialGuid)) {
          return potentialGuid;
        }
      }

      return null;
    } catch {
      return null;
    }
  },

  // Function to check if URL is a Tenderly RPC URL
  isTenderlyUrl: (url: string): boolean => {
    try {
      const urlObj = new URL(url.trim());
      return (
        urlObj.hostname.includes("rpc.tenderly.co") ||
        urlObj.hostname.includes("virtual.mainnet")
      );
    } catch {
      return false;
    }
  },

  // Function to build the full RPC URL from a GUID with optional region
  buildUrl: (guid: string, region?: string) => {
    // Remove any whitespace and ensure clean URL parts
    const cleanGuid = guid.replace(/\s+/g, "");
    let baseUrl = RPC_CONFIG.BASE_URL.replace(/\s+/g, "");

    // If region is specified, inject it into the URL
    if (region) {
      // Parse the base URL and inject the region
      // Transform: https://virtual.mainnet.rpc.tenderly.co
      // To: https://virtual.mainnet.{region}.rpc.tenderly.co
      baseUrl = baseUrl.replace(
        /virtual\.mainnet\.rpc/,
        `virtual.mainnet.${region}.rpc`
      );
    }

    // Ensure base URL ends without a slash
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    // Construct URL with explicit concatenation
    const url = cleanBaseUrl + "/" + cleanGuid;

    // Debug log
    console.log("Building RPC URL:", {
      originalGuid: guid,
      cleanGuid,
      region,
      baseUrl,
      cleanBaseUrl,
      finalUrl: url,
    });

    return url;
  },
};
