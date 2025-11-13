import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { validateProvider } from "@/utils/faucet";
import { RPC_CONFIG } from "@/config/rpc";
import {
  saveRpcCache,
  loadRpcCache,
  clearRpcCache as clearRpcCacheUtil,
} from "@/utils/rpcCache";

export interface UseRpcConnectionReturn {
  // State
  rpcUrl: string;
  inputRpcUrl: string;
  showRpcInput: boolean;
  validRpc: boolean;
  provider: ethers.JsonRpcProvider | null;
  validationError: string | null;
  isValidating: boolean;
  validationComplete: boolean;
  copiedUrl: boolean;
  error: string | null;

  // Actions
  handleRpcSubmit: () => Promise<void>;
  handleRpcInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleChangeRpc: () => void;
  handleCopyUrl: () => Promise<void>;
  handleClearAndReconnect: () => void;
  handleCancelRpcInput: () => void;
  setError: (error: string | null) => void;
}

export function useRpcConnection(): UseRpcConnectionReturn {
  const [showRpcInput, setShowRpcInput] = useState(true);
  const [rpcUrl, setRpcUrl] = useState("");
  const [inputRpcUrl, setInputRpcUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [validRpc, setValidRpc] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Master initialization effect - coordinates all RPC loading with priority
  useEffect(() => {
    const initializeRpc = async () => {
      console.log("🔧 Starting RPC initialization...");

      // Check for GUID in URL params (highest priority)
      const params = new URLSearchParams(window.location.search);
      const guid = params.get("guid");
      const urlError = params.get("error");

      // Handle URL error parameter
      if (urlError) {
        setError(urlError);
        window.history.replaceState({}, "", "/");
        setValidationComplete(true);
        return;
      }

      // Priority 1: GUID from URL querystring
      if (guid) {
        console.log("📍 Priority 1: Validating GUID from URL:", guid);
        try {
          // Validate the GUID (with auto-retry on region mismatch)
          const result = await validateProvider(guid);

          if (result.isValid) {
            // Use corrected URL if provided, otherwise build from GUID
            const validatedUrl =
              result.correctedUrl || RPC_CONFIG.buildUrl(guid);

            console.log("✅ GUID validation successful! URL:", validatedUrl);
            setRpcUrl(validatedUrl);
            setValidRpc(true);
            setShowRpcInput(false);

            // Save to cache
            saveRpcCache(validatedUrl);

            if (result.correctedUrl) {
              console.log(
                "🔄 Auto-corrected URL with region:",
                result.correctedUrl
              );
            }
          } else {
            console.error("❌ GUID validation failed:", result.error);
            setError(result.error || "Invalid GUID or unreachable RPC URL");
            setShowRpcInput(true);
          }

          // Clear the URL params
          window.history.replaceState({}, "", "/");
        } catch (err) {
          console.error("Error validating GUID from URL:", err);
          setError("Failed to validate GUID");
          setShowRpcInput(true);
          window.history.replaceState({}, "", "/");
        }

        setValidationComplete(true);
        return;
      }

      // Priority 2: Load from cache (if no URL param)
      console.log("📍 Priority 2: Checking cache for stored RPC...");
      const cachedRpc = loadRpcCache();

      if (cachedRpc) {
        console.log("📂 Found cached RPC, validating...");

        // Show cached URL optimistically
        setRpcUrl(cachedRpc.url);
        setShowRpcInput(false);

        // Validate cached URL
        try {
          const result = await validateProvider(cachedRpc.url);

          if (result.isValid) {
            console.log("✅ Cached RPC validation successful!");

            // Use corrected URL if provided
            const validatedUrl = result.correctedUrl || cachedRpc.url;

            setRpcUrl(validatedUrl);
            setValidRpc(true);

            // Update cache if URL was corrected
            if (result.correctedUrl) {
              console.log(
                "🔄 Updated cache with corrected URL:",
                result.correctedUrl
              );
              saveRpcCache(validatedUrl);
            }
          } else {
            console.error("❌ Cached RPC validation failed:", result.error);
            setError(
              `Stored RPC URL is no longer valid: ${result.error || "Unknown error"}`
            );
            clearRpcCacheUtil();
            setShowRpcInput(true);
            setRpcUrl("");
            setValidRpc(false);
          }
        } catch (err) {
          console.error("Error validating cached RPC:", err);
          setError("Failed to validate stored RPC URL");
          clearRpcCacheUtil();
          setShowRpcInput(true);
          setRpcUrl("");
          setValidRpc(false);
        }

        setValidationComplete(true);
        return;
      }

      // Priority 3: No cached RPC - show input modal
      console.log("📍 Priority 3: No cached RPC found, showing input modal");
      setShowRpcInput(true);
      setValidationComplete(true);
    };

    initializeRpc();
  }, []);

  // Initialize provider when RPC is validated
  useEffect(() => {
    const initializeProvider = async () => {
      if (validRpc && rpcUrl) {
        try {
          console.log("Initializing provider with RPC URL:", rpcUrl);
          const newProvider = new ethers.JsonRpcProvider(rpcUrl);
          setProvider(newProvider);
        } catch (error) {
          console.error("Failed to initialize provider:", error);
          setError("Failed to initialize provider");
        }
      } else {
        console.warn("Provider not initialized: validRpc or rpcUrl is false");
      }
    };

    initializeProvider();
  }, [validRpc, rpcUrl]);

  const handleRpcSubmit = async () => {
    if (!inputRpcUrl) return;

    setIsValidating(true);
    setValidationError(null);

    try {
      const cleanInput = inputRpcUrl.trim();
      let finalUrl = cleanInput;

      // Determine the final URL to use
      // If it's a GUID, build the full URL (may be corrected by validation if region mismatch)
      if (RPC_CONFIG.isGuid(cleanInput)) {
        finalUrl = RPC_CONFIG.buildUrl(cleanInput);
        console.log("Building URL from GUID:", finalUrl);
      }
      // If it's already a Tenderly URL, use as-is (preserves region like us-east)
      else if (RPC_CONFIG.isTenderlyUrl(cleanInput)) {
        finalUrl = cleanInput;
        console.log("Using Tenderly URL as-is:", finalUrl);
      }
      // For other URLs, use as-is
      else {
        finalUrl = cleanInput;
        console.log("Using generic URL:", finalUrl);
      }

      // Check if we're trying to connect to the same URL we're already connected to
      // Compare by GUID to handle different region formats
      const currentGuid = RPC_CONFIG.extractGuid(rpcUrl);
      const newGuid = RPC_CONFIG.isGuid(cleanInput)
        ? cleanInput
        : RPC_CONFIG.extractGuid(finalUrl);

      if (currentGuid && newGuid && currentGuid === newGuid && validRpc) {
        console.log("Already connected to this RPC, skipping validation");
        setShowRpcInput(false);
        setValidationError(null);
        setIsValidating(false);
        return;
      }

      // Validate the URL (may return corrected URL if region mismatch)
      const result = await validateProvider(
        RPC_CONFIG.isGuid(cleanInput) ? cleanInput : finalUrl
      );

      if (result.isValid) {
        // Use corrected URL if provided, otherwise use the original
        const validatedUrl = result.correctedUrl || finalUrl;

        // Update the connected RPC URL
        setRpcUrl(validatedUrl);
        setValidRpc(true);
        setShowRpcInput(false);
        setValidationError(null);

        // Store the validated URL in cache
        saveRpcCache(validatedUrl);

        if (result.correctedUrl) {
          console.log(
            "✅ Connected using auto-corrected URL:",
            result.correctedUrl
          );
        }

        // Mark validation as complete to trigger provider initialization
        setValidationComplete(true);
      } else {
        setValidationError(result.error || "Invalid or unreachable RPC URL");
      }
    } catch (error) {
      console.error(
        "Error validating RPC:",
        error instanceof Error ? error.message : JSON.stringify(error)
      );
      setValidationError("Failed to validate RPC URL");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRpcInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setInputRpcUrl(url);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleChangeRpc = () => {
    setInputRpcUrl(""); // Clear input field for new entry
    setValidationError(null); // Clear any previous validation errors
    setShowRpcInput(true);
    // Keep the current RPC connection active
  };

  const handleCopyUrl = async () => {
    if (!rpcUrl) {
      console.error("No RPC URL to copy");
      return;
    }

    // Try modern clipboard API first
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(rpcUrl);
        console.log("Copied successfully with Clipboard API:", rpcUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
        return;
      } catch (err) {
        console.error("Clipboard API failed:", err);
        // Fall through to fallback method
      }
    }

    // Fallback method using execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = rpcUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        console.log("Copied successfully with execCommand:", rpcUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        console.error("execCommand failed");
      }
    } catch (err) {
      console.error("Fallback copy method failed:", err);
    }
  };

  const handleClearAndReconnect = () => {
    clearRpcCacheUtil();
    setRpcUrl("");
    setValidRpc(false);
    setInputRpcUrl("");
    setValidationError(null);
    setError(null);
  };

  const handleCancelRpcInput = () => {
    setShowRpcInput(false);
    setInputRpcUrl("");
    setValidationError(null);
  };

  return {
    // State
    rpcUrl,
    inputRpcUrl,
    showRpcInput,
    validRpc,
    provider,
    validationError,
    isValidating,
    validationComplete,
    copiedUrl,
    error,

    // Actions
    handleRpcSubmit,
    handleRpcInputChange,
    handleChangeRpc,
    handleCopyUrl,
    handleClearAndReconnect,
    handleCancelRpcInput,
    setError,
  };
}
