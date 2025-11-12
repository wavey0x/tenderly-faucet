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
import Cookies from "js-cookie";

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

  const modalRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    // Check for GUID in URL params
    const params = new URLSearchParams(window.location.search);
    const guid = params.get("guid");
    const urlError = params.get("error");

    if (guid) {
      try {
        const rpcUrl = RPC_CONFIG.buildUrl(guid);
        console.log("Constructed RPC URL:", rpcUrl);
        setRpcUrl(rpcUrl);
        setShowRpcInput(false);
        setValidRpc(true);
        // Save to localStorage when loading from URL
        localStorage.setItem("tenderly-faucet-url", rpcUrl);
        // Clear the URL params
        window.history.replaceState({}, "", "/");
      } catch {
        setError("Invalid GUID format");
        window.history.replaceState({}, "", "/");
      }
    } else {
      console.warn("No GUID found in URL");
    }

    if (urlError) {
      setError(urlError);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    const validateStoredRpc = async () => {
      const storedUrl = localStorage.getItem("tenderly-faucet-url");
      if (storedUrl) {
        try {
          const result = await validateProvider(storedUrl);
          if (result.isValid) {
            setRpcUrl(storedUrl);
            setValidRpc(true);
            setShowRpcInput(false);
          } else {
            localStorage.removeItem("tenderly-faucet-url");
          }
        } catch (error) {
          console.error("Error validating stored RPC:", error);
          localStorage.removeItem("tenderly-faucet-url");
        }
      }
      setValidationComplete(true);
    };

    validateStoredRpc();
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

        // Store the validated URL in localStorage
        localStorage.setItem("tenderly-faucet-url", validatedUrl);

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
      return;
    }

    if (!useCustomToken && !selectedToken) {
      setError("No token selected");
      return;
    }

    if (useCustomToken && !isValidToken) {
      setError("Invalid custom token");
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

      setSuccess("Balance updated successfully!");

      // Refresh balances
      if (!provider) {
        console.error("Provider is not initialized");
        setError("Provider is not initialized");
        return;
      }
      const newBalances = await getAllBalances(provider, recipient);
      setBalances(newBalances);
    } catch (error) {
      console.error("Error during balance update:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    const initializeProvider = async () => {
      if (validRpc && rpcUrl) {
        try {
          console.log("Initializing provider with RPC URL:", rpcUrl);
          const newProvider = new ethers.JsonRpcProvider(rpcUrl);
          setProvider(newProvider);
          Cookies.set(STORAGE_KEYS.TENDERLY_URL, rpcUrl);
        } catch (error) {
          console.error("Failed to initialize provider:", error);
          setError("Failed to initialize provider");
          Cookies.set(
            STORAGE_KEYS.ERROR,
            error instanceof Error ? error.message : JSON.stringify(error)
          );
        }
      } else {
        console.warn("Provider not initialized: validRpc or rpcUrl is false");
      }
    };

    initializeProvider();
  }, [validRpc, rpcUrl]);

  // Load the RPC URL from cookies on initial load
  useEffect(() => {
    const storedUrl = Cookies.get(STORAGE_KEYS.TENDERLY_URL);
    if (storedUrl) {
      console.log("Loaded RPC URL from cookies:", storedUrl);
      setRpcUrl(storedUrl);
      setValidRpc(true);
    } else {
      console.warn("No RPC URL found in cookies");
    }
  }, []);

  useEffect(() => {
    const fetchBlockchainTime = async () => {
      if (!provider || !validRpc) {
        console.log("Skipping blockchain time fetch: provider or validRpc not ready");
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
        console.warn("Could not fetch blockchain time (may require admin RPC):", error);
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
      {success && (
        <div className="fixed top-1/2 -translate-y-1/2 animate-fly-across">
          <div className="text-4xl relative">
            <span className="absolute -top-4 left-4 transform -rotate-12">
              🦛
            </span>
            <span className="transform -rotate-45">🚀</span>
          </div>
        </div>
      )}

      {/* RPC Modal */}
      {showRpcInput && (
        <div className="fixed inset-0 bg-white flex items-start sm:items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <h2 className="text-lg sm:text-xl mb-3 font-mono text-black">
              Input Tenderly Admin RPC URL or GUID
            </h2>
            {validRpc && rpcUrl && (
              <div className="text-xs text-gray-600 mb-3">
                Currently connected to: {getGuidFromUrl(rpcUrl) || "Unknown"}
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
                  validationError
                    ? "border-red-500"
                    : "border-black"
                }`}
                autoFocus
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isValidating && (
                  <span className="text-gray-400">...</span>
                )}
              </div>
            </div>
            {validationError && (
              <div className="text-red-500 text-xs mt-1">
                {validationError}
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
            onClick={handleChangeRpc}
            className="w-full p-3 mb-4 border-2 border-purple-400 bg-purple-50/30 hover:bg-purple-50/50 cursor-pointer text-xs transition-all shadow-sm hover:shadow-md rounded-lg"
            style={{
              boxShadow: "0 0 0 1px rgba(168, 85, 247, 0.1), 0 2px 4px rgba(168, 85, 247, 0.1)",
            }}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-purple-600 font-semibold uppercase tracking-wide text-[10px]">rpc</div>
                <div className="font-mono break-all text-gray-700">{getGuidFromUrl(rpcUrl) || "N/A"}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-purple-600 font-semibold uppercase tracking-wide text-[10px]">region</div>
                <div className="font-mono text-gray-700">{getRegionFromUrl(rpcUrl)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Separator */}
        {!showRpcInput && validRpc && (
          <div className="border-b border-gray-200 mb-6"></div>
        )}

        <div className="mb-6">
          <h1 className="text-lg sm:text-xl text-center">🚰 Tenderly Token Faucet</h1>
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
              type="submit"
              disabled={
                loading || !isValidAddress || (useCustomToken && !isValidToken)
              }
              className={`w-full p-2 text-sm sm:text-base border border-black text-black
                ${
                  loading ||
                  !isValidAddress ||
                  (useCustomToken && !isValidToken)
                    ? "bg-gray-100 border-gray-400 text-gray-500 cursor-not-allowed"
                    : "bg-white hover:bg-gray-50"
                }`}
            >
              {loading ? "..." : "Fund"}
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

            {error && (
              <div className="text-red-500 text-xs sm:text-sm">{error}</div>
            )}
            {success && (
              <div className="text-green-500 text-xs sm:text-sm">{success}</div>
            )}
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
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white p-4 rounded shadow-lg max-w-sm w-full relative"
          >
            <button
              onClick={() => setShowTimestampModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-2 text-black">
              Set EVM Timestamp
            </h3>
            <div className="mb-2">
              <label className="block text-sm mb-1 text-black">
                Advance by:
              </label>
              <input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded text-black"
              />
            </div>
            <div className="mb-2">
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-black"
              >
                <option value="seconds">Seconds</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
            <div className="mb-2">
              <p className="text-black">
                {currentTimestamp !== null
                  ? new Date(currentTimestamp * 1000).toLocaleString() +
                    " | " +
                    currentTimestamp
                  : "Loading..."}
              </p>
            </div>
            <button
              onClick={advanceTimestamp}
              className="w-full p-2 bg-gray-200 text-black rounded hover:bg-gray-300"
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
