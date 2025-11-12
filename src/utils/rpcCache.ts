import { RPC_CONFIG } from "@/config/rpc";

export interface RpcCacheData {
  url: string;
  guid: string | null;
  region: string;
  lastValidated: number;
  lastUsed: number;
}

const CACHE_KEY = "tenderly-faucet-rpc-cache";

/**
 * Save RPC URL to localStorage with metadata
 */
export function saveRpcCache(url: string): void {
  try {
    const guid = RPC_CONFIG.extractGuid(url);
    const region = extractRegion(url);

    const cacheData: RpcCacheData = {
      url,
      guid,
      region,
      lastValidated: Date.now(),
      lastUsed: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log("💾 Saved RPC to cache:", { guid, region });
  } catch (err) {
    console.error("Failed to save RPC cache:", err);
  }
}

/**
 * Load RPC URL from localStorage
 */
export function loadRpcCache(): RpcCacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const data: RpcCacheData = JSON.parse(cached);

    // Update lastUsed timestamp
    data.lastUsed = Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));

    console.log("📂 Loaded RPC from cache:", {
      guid: data.guid,
      region: data.region,
      lastValidated: new Date(data.lastValidated).toLocaleString(),
    });

    return data;
  } catch (err) {
    console.error("Failed to load RPC cache:", err);
    return null;
  }
}

/**
 * Clear RPC cache from localStorage
 */
export function clearRpcCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log("🗑️  Cleared RPC cache");
  } catch (err) {
    console.error("Failed to clear RPC cache:", err);
  }
}

/**
 * Update last used timestamp
 */
export function updateRpcCacheUsage(): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data: RpcCacheData = JSON.parse(cached);
      data.lastUsed = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.error("Failed to update RPC cache usage:", err);
  }
}

/**
 * Extract region from RPC URL
 */
function extractRegion(url: string): string {
  try {
    const match = url.match(/virtual\.mainnet\.([^.]+)\.rpc\.tenderly\.co/);
    return match ? match[1] : "default";
  } catch {
    return "default";
  }
}

/**
 * Check if cache is stale (older than threshold)
 * @param thresholdMs - Threshold in milliseconds (default: 24 hours)
 */
export function isCacheStale(
  cache: RpcCacheData,
  thresholdMs: number = 24 * 60 * 60 * 1000
): boolean {
  const age = Date.now() - cache.lastValidated;
  return age > thresholdMs;
}
