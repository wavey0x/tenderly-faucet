"use client";

import { useState, useEffect, useRef } from "react";
import { PRESET_TOKENS } from "@/config/tokens";
import {
  setTokenBalance,
  setEthBalance,
  isValidEthereumAddress,
  isValidERC20,
  getAllBalances,
  validateProvider,
} from "@/utils/faucet";
import { RPC_CONFIG } from "@/config/rpc";
import { STORAGE_KEYS } from "@/config/constants";
import { ethers } from "ethers";
import {
  saveRpcCache,
  loadRpcCache,
  clearRpcCache,
  updateRpcCacheUsage,
} from "@/utils/rpcCache";

export default function Home() {
  const [showRpcInput, setShowRpcInput] = useState(true);
  const [rpcUrl, setRpcUrl] = useState(""); // Currently connected RPC URL
  const [inputRpcUrl, setInputRpcUrl] = useState(""); // What user is typing in modal
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null); // Specific validation error
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [useCustomToken, setUseCustomToken] = useState(false);
  const [selectedToken, setSelectedToken] = useState(PRESET_TOKENS[0].address);
  const [customToken, setCustomToken] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [balances, setBalances] = useState<{
    ETH: string;
    tokens: Record<string, string>;
  } | null>(null);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);
  const [validRpc, setValidRpc] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [showTimestampModal, setShowTimestampModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [timeUnit, setTimeUnit] = useState("seconds");
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; top: number; tx: number }>>([]);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const fundButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowTimestampModal(false);
      }
    };

    if (showTimestampModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTimestampModal]);

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
            clearRpcCache();
            setShowRpcInput(true);
            setRpcUrl("");
            setValidRpc(false);
          }
        } catch (err) {
          console.error("Error validating cached RPC:", err);
          setError("Failed to validate stored RPC URL");
          clearRpcCache();
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

  // Update the input change handler to only update input state
  const handleRpcInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setInputRpcUrl(url);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  // Load saved data from localStorage
  useEffect(() => {
    const addresses = localStorage.getItem(STORAGE_KEYS.SAVED_ADDRESSES);
    if (addresses) {
      setSavedAddresses(JSON.parse(addresses));
    }
  }, []);

  // Save valid addresses
  useEffect(() => {
    if (isValidAddress && recipient && !savedAddresses.includes(recipient)) {
      const newAddresses = [...savedAddresses, recipient];
      setSavedAddresses(newAddresses);
      localStorage.setItem(
        STORAGE_KEYS.SAVED_ADDRESSES,
        JSON.stringify(newAddresses)
      );
    }
  }, [isValidAddress, recipient, savedAddresses]);

  // Reset success message when inputs change
  useEffect(() => {
    setSuccess(null);
  }, [recipient, amount, selectedToken, customToken, useCustomToken]);

  useEffect(() => {
    const validateToken = async () => {
      if (!useCustomToken) {
        setIsValidToken(true);
        return;
      }
      if (!customToken) {
        setIsValidToken(false);
        return;
      }
      // Don't validate if it's the ETH address
      if (customToken === "0x0000000000000000000000000000000000000000") {
        setIsValidToken(true);
        return;
      }
      if (!provider) {
        if (validationComplete) {
          console.error("Provider is not initialized");
          setIsValidToken(false);
        }
        return;
      }
      const isValid = await isValidERC20(provider, customToken);
      setIsValidToken(isValid);
    };
    validateToken();
  }, [customToken, useCustomToken, provider, validationComplete]);

  useEffect(() => {
    const checkAddressAndFetchBalances = async () => {
      if (!recipient) {
        setIsValidAddress(false);
        setBalances(null);
        return;
      }

      const isValid = isValidEthereumAddress(recipient);
      setIsValidAddress(isValid);

      if (isValid) {
        try {
          if (!provider) {
            if (validationComplete) {
              console.error("Provider is not initialized");
              setError("Provider is not initialized");
            }
            return;
          }
          const balances = await getAllBalances(provider, recipient);
          setBalances(balances);
        } catch (error) {
          console.error("Error fetching balances:", error);
          setBalances(null);
        }
      } else {
        setBalances(null);
      }
    };

    checkAddressAndFetchBalances();
  }, [recipient, provider, validationComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAddress) {
      setError("Invalid address");
      setTimeout(() => setError(null), 2000);
      return;
    }

    if (!useCustomToken && !selectedToken) {
      setError("No token selected");
      setTimeout(() => setError(null), 2000);
      return;
    }

    if (useCustomToken && !isValidToken) {
      setError("Invalid custom token");
      setTimeout(() => setError(null), 2000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tokenAddress = useCustomToken ? customToken : selectedToken;
      console.log("Using token address:", tokenAddress);

      const selectedTokenInfo = PRESET_TOKENS.find(
        (t) => t.address === tokenAddress
      );

      if (
        tokenAddress === "0x0000000000000000000000000000000000000000" ||
        selectedTokenInfo?.isEth
      ) {
        if (!provider) {
          throw new Error("Provider not initialized");
        }
        await setEthBalance(provider, recipient, amount);
      } else {
        if (!provider) {
          console.error("Provider is not initialized");
          setError("Provider is not initialized");
          setLoading(false);
          setTimeout(() => setError(null), 2000);
          return;
        }
        await setTokenBalance(
          provider,
          tokenAddress,
          recipient,
          amount,
          selectedTokenInfo?.decimals
        );
      }

      setSuccess("Success");

      // Trigger confetti
      createConfetti();

      // Refresh balances
      if (!provider) {
        console.error("Provider is not initialized");
        setError("Provider is not initialized");
        setLoading(false);
        setTimeout(() => setError(null), 2000);
        return;
      }
      const newBalances = await getAllBalances(provider, recipient);
      setBalances(newBalances);

      // Clear success message after 2 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (error) {
      console.error("Error during balance update:", error);
      setError(error instanceof Error ? error.message : "An error occurred");

      // Clear error message after 2 seconds
      setTimeout(() => {
        setError(null);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Create confetti burst from button
  const createConfetti = () => {
    if (!fundButtonRef.current) return;

    const button = fundButtonRef.current;
    const rect = button.getBoundingClientRect();
    const buttonCenterX = rect.left + rect.width / 2;
    const buttonCenterY = rect.top + rect.height / 2;

    const newConfetti = [];
    const confettiCount = 30;

    for (let i = 0; i < confettiCount; i++) {
      const angle = (Math.PI * 2 * i) / confettiCount;
      const spread = 150 + Math.random() * 100;
      const tx = Math.cos(angle) * spread;

      newConfetti.push({
        id: Date.now() + i,
        left: buttonCenterX,
        top: buttonCenterY,
        tx: tx,
      });
    }

    setConfetti(newConfetti);

    // Clear confetti after animation
    setTimeout(() => {
      setConfetti([]);
    }, 1500);
  };

  // Update the Change RPC button click handler
  const handleChangeRpc = () => {
    setInputRpcUrl(""); // Clear input field for new entry
    setValidationError(null); // Clear any previous validation errors
    setShowRpcInput(true);
    // Keep the current RPC connection active
  };

  // Add this function to extract GUID from RPC URL
  const getGuidFromUrl = (url: string) => {
    try {
      const match = url.match(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      return match ? match[0].slice(1) : null;
    } catch {
      return null;
    }
  };

  // Extract region from RPC URL
  const getRegionFromUrl = (url: string) => {
    try {
      // Extract region from URLs like: https://virtual.mainnet.us-east.rpc.tenderly.co
      const match = url.match(/virtual\.mainnet\.([^.]+)\.rpc\.tenderly\.co/);
      return match ? match[1] : "default";
    } catch {
      return "default";
    }
  };

  // Copy full RPC URL to clipboard
  const handleCopyUrl = async () => {
    if (rpcUrl) {
      try {
        await navigator.clipboard.writeText(rpcUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch (err) {
        console.error("Failed to copy URL:", err);
      }
    }
  };

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


  useEffect(() => {
    const fetchBlockchainTime = async () => {
      if (!provider || !validRpc) {
        console.log(
          "Skipping blockchain time fetch: provider or validRpc not ready"
        );
        return;
      }

      try {
        // Mine a new block to ensure the latest timestamp
        await provider.send("evm_mine", []);

        // Fetch the latest block
        const block = await provider.getBlock("latest");
        if (block) {
          // Set the current timestamp from the block
          setCurrentTimestamp(block.timestamp);
        } else {
          console.warn("Failed to fetch block data");
        }
      } catch (error) {
        // Don't set global error for blockchain time fetch failures
        // This might fail if using non-admin RPC URL
        console.warn(
          "Could not fetch blockchain time (may require admin RPC):",
          error
        );
      }
    };

    if (validationComplete && validRpc && provider) {
      fetchBlockchainTime();
    }
  }, [provider, validationComplete, validRpc]);

  const advanceTimestamp = async () => {
    let secondsToAdd = advanceAmount;
    if (timeUnit === "days") {
      secondsToAdd *= 86400;
    } else if (timeUnit === "weeks") {
      secondsToAdd *= 604800;
    }

    if (!provider) {
      setError("Provider is not initialized");
      return;
    }

    try {
      // Increase the blockchain time
      await provider.send("evm_increaseTime", [
        `0x${secondsToAdd.toString(16)}`,
      ]);

      // Mine a new block to apply the time change
      await provider.send("evm_mine", []);

      // Fetch the latest block to get the new timestamp
      const block = await provider.getBlock("latest");
      if (block) {
        setCurrentTimestamp(block.timestamp);

        // Perform the animation to indicate success
        const timestampElement = document.getElementById("timestamp-display");
        if (timestampElement) {
          timestampElement.classList.add("text-green-500");
          setTimeout(() => {
            timestampElement.classList.remove("text-green-500");
          }, 500);
        }
      } else {
        setError("Failed to fetch block data");
      }
    } catch (error) {
      console.error("Error advancing timestamp:", error);
      setError("Failed to advance timestamp");
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Confetti particles */}
      {confetti.map((piece, index) => (
        <div
          key={piece.id}
          className={`confetti confetti-${(index % 10) + 1}`}
          style={{
            left: `${piece.left}px`,
            top: `${piece.top}px`,
            '--tx': `${piece.tx}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* RPC Modal */}
      {showRpcInput && (
        <div className="fixed inset-0 bg-white flex items-start justify-center z-50 p-4 pt-12 sm:pt-20">
          <div className="w-full max-w-md">
            <h2 className="text-lg sm:text-xl mb-3 font-mono text-black">
              Input Tenderly Admin RPC URL or GUID
            </h2>
            {validRpc && rpcUrl && (
              <div className="text-xs text-gray-600 mb-3 flex items-center gap-2">
                <span>
                  Currently connected to: {getGuidFromUrl(rpcUrl) || "Unknown"}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopyUrl();
                  }}
                  className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-purple-600 transition-colors"
                  title="Copy full URL"
                >
                  {copiedUrl ? (
                    <span className="text-green-600 text-xs font-semibold">
                      ✓
                    </span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-3 h-3"
                    >
                      <rect x="5" y="2" width="7" height="9" rx="1" />
                      <path
                        d="M3 5h1v9a1 1 0 0 0 1 1h5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={inputRpcUrl}
                onChange={handleRpcInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputRpcUrl && !isValidating) {
                    e.preventDefault();
                    handleRpcSubmit();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setShowRpcInput(false);
                    setInputRpcUrl("");
                    setValidationError(null);
                  }
                }}
                placeholder="Enter full RPC URL or just the GUID (e.g. 4249ff26-95dc-488b-8f35-a6ca53ecebb3)"
                className={`w-full p-2 sm:p-2 text-sm sm:text-base border bg-white text-black ${
                  validationError ? "border-red-500" : "border-black"
                }`}
                autoFocus
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isValidating && <span className="text-gray-400">...</span>}
              </div>
            </div>
            {validationError && (
              <div className="text-red-500 text-xs mt-1">{validationError}</div>
            )}
            {validRpc && !inputRpcUrl && (
              <div className="mt-3 mb-2">
                <button
                  onClick={() => {
                    clearRpcCache();
                    setRpcUrl("");
                    setValidRpc(false);
                    setInputRpcUrl("");
                    setValidationError(null);
                    setError(null);
                  }}
                  className="text-xs text-gray-500 hover:text-red-600 underline"
                >
                  Clear RPC & Reconnect
                </button>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              {validRpc && (
                <button
                  onClick={() => {
                    setShowRpcInput(false);
                    setInputRpcUrl("");
                    setValidationError(null);
                  }}
                  disabled={isValidating}
                  className="flex-1 p-2 border border-gray-400 text-gray-700 bg-white hover:bg-gray-50 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
              {inputRpcUrl && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleRpcSubmit();
                  }}
                  disabled={isValidating}
                  className={`p-2 border border-black text-black bg-white hover:bg-gray-50 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed ${
                    validRpc ? "flex-1" : "w-full"
                  }`}
                >
                  {isValidating ? "Validating..." : "Validate & Connect"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="p-3 sm:p-4 max-w-md mx-auto font-mono text-black">
        {!showRpcInput && validRpc && (
          <div
            className="w-full p-3 mb-4 border-2 border-purple-400 bg-purple-50/30 hover:bg-purple-50/50 text-xs transition-all shadow-sm hover:shadow-md rounded-lg cursor-pointer"
            onClick={handleChangeRpc}
            style={{
              boxShadow:
                "0 0 0 1px rgba(168, 85, 247, 0.1), 0 2px 4px rgba(168, 85, 247, 0.1)",
            }}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-purple-600 font-semibold uppercase tracking-wide text-[10px]">
                  tenderly rpc
                </div>
                <div className="font-mono break-all text-gray-700 flex items-center gap-2">
                  <span>{getGuidFromUrl(rpcUrl) || "N/A"}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyUrl();
                    }}
                    className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-purple-600 transition-colors flex-shrink-0"
                    title="Copy full URL"
                  >
                    {copiedUrl ? (
                      <span className="text-green-600 text-xs font-semibold">
                        ✓
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="w-3 h-3"
                      >
                        <rect x="5" y="2" width="7" height="9" rx="1" />
                        <path
                          d="M3 5h1v9a1 1 0 0 0 1 1h5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-purple-600 font-semibold uppercase tracking-wide text-[10px]">
                  region
                </div>
                <div className="font-mono text-gray-700">
                  {getRegionFromUrl(rpcUrl)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Separator */}
        {!showRpcInput && validRpc && (
          <div className="border-b border-gray-200 mb-6"></div>
        )}

        <div className="mb-6">
          <h1 className="text-lg sm:text-xl text-center">
            🚰 Tenderly Token Faucet
          </h1>
        </div>

        {validRpc && !showRpcInput && (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Token</label>
              <label className="block text-xs sm:text-sm mb-1">
                <input
                  type="checkbox"
                  checked={useCustomToken}
                  onChange={(e) => setUseCustomToken(e.target.checked)}
                  className="mr-1"
                />
                Custom
              </label>

              {useCustomToken ? (
                <div>
                  <input
                    type="text"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder="Token Address (0x...)"
                    className={`w-full p-2 text-sm sm:text-base border bg-white text-black ${
                      customToken && !isValidToken
                        ? "border-red-500"
                        : "border-black"
                    }`}
                    required
                  />
                  {customToken && !isValidToken && (
                    <div className="text-red-500 text-xs mt-1">
                      Invalid ERC20 token
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full p-2 text-sm sm:text-base border border-black bg-white text-black"
                >
                  {PRESET_TOKENS.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Wallet</label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                  }}
                  placeholder="Address (0x...)"
                  className={`w-full p-2 text-sm sm:text-base border bg-white text-black ${
                    recipient && !isValidAddress
                      ? "border-red-500"
                      : "border-black"
                  }`}
                  list="saved-addresses"
                  required
                />
                <datalist id="saved-addresses">
                  {savedAddresses.map((addr) => (
                    <option key={addr} value={addr} />
                  ))}
                </datalist>
              </div>
              {recipient && !isValidAddress && (
                <div className="text-red-500 text-xs mt-1">Invalid address</div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                }}
                placeholder="Enter amount"
                className="w-full p-2 text-sm sm:text-base border border-black bg-white text-black"
                required
              />
            </div>

            <button
              ref={fundButtonRef}
              type="submit"
              disabled={
                loading || !isValidAddress || (useCustomToken && !isValidToken)
              }
              className={`w-full p-2 text-sm sm:text-base border transition-colors
                ${
                  success
                    ? "border-green-500 bg-green-50 text-green-700"
                    : error
                    ? "border-red-500 bg-red-50 text-red-700"
                    : loading ||
                      !isValidAddress ||
                      (useCustomToken && !isValidToken)
                    ? "border-gray-400 bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "border-black bg-white text-black hover:bg-gray-50"
                }`}
            >
              {success ? success : error ? error : loading ? "..." : "Fund"}
            </button>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowTimestampModal(true);
              }}
              className="block text-center mt-2 text-sm text-gray-600"
            >
              ⏱️{" "}
              {currentTimestamp !== null
                ? new Date(currentTimestamp * 1000).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    hour12: true,
                  })
                : "Loading..."}
            </a>
          </form>
        )}

        {balances && isValidAddress && !showRpcInput && (
          <div className="border border-gray-200 p-2 mt-4 sm:mt-6 text-xs sm:text-sm font-mono bg-gray-50 text-black shadow-sm">
            <div className="text-xs sm:text-sm mb-2 font-bold border-b border-gray-100 pb-2">
              Wallet Info
            </div>
            <div className="space-y-1">
              <div className="border-b border-gray-50 pb-1 flex justify-between">
                <span>ETH</span>
                <span>{balances.ETH}</span>
              </div>
              {Object.entries(balances.tokens).map(([symbol, balance]) => (
                <div
                  key={symbol}
                  className="border-b border-gray-50 pb-1 flex justify-between"
                >
                  <span>{symbol}</span>
                  <span>{balance}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showTimestampModal && (
        <div
          className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-12 sm:pt-20"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.85)" }}
        >
          <div
            ref={modalRef}
            className="bg-white p-6 rounded-lg max-w-sm w-full relative border border-gray-200"
            style={{
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <button
              onClick={() => setShowTimestampModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl leading-none"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4 text-black font-mono">
              Set EVM Timestamp
            </h3>
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1 font-mono">
                Advance by:
              </label>
              <input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                className="w-full p-2 border border-black bg-white text-black font-mono"
              />
            </div>
            <div className="mb-4">
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value)}
                className="w-full p-2 border border-black bg-white text-black font-mono"
              >
                <option value="seconds">Seconds</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs text-gray-500 mb-1 font-mono">
                Current timestamp:
              </p>
              <p className="text-sm text-black font-mono">
                {currentTimestamp !== null
                  ? new Date(currentTimestamp * 1000).toLocaleString() +
                    " | " +
                    currentTimestamp
                  : "Loading..."}
              </p>
            </div>
            <button
              onClick={advanceTimestamp}
              className="w-full p-2 bg-white border border-black text-black hover:bg-gray-50 font-mono"
            >
              Advance chain timestamp
            </button>
            {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
