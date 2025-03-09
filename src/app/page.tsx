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
import { ethers } from "ethers";
import Cookies from "js-cookie";

const STORAGE_KEYS = {
  SAVED_ADDRESSES: "tenderly-faucet-addresses",
  TENDERLY_URL: "tenderly-faucet-url",
  ERROR: "tenderly-faucet-error",
};

export default function Home() {
  const [showRpcInput, setShowRpcInput] = useState(true);
  const [rpcUrl, setRpcUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
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
          const isValid = await validateProvider(storedUrl);
          if (isValid) {
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
    if (!rpcUrl) return;

    setIsValidating(true);
    setError(null);
    // Clear localStorage at the start of validation
    localStorage.removeItem("tenderly-faucet-url");

    try {
      let fullUrl = rpcUrl;
      // Check if input is a GUID (just the UUID part)
      if (
        rpcUrl.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      ) {
        fullUrl = RPC_CONFIG.buildUrl(rpcUrl);
      }
      const isValid = await validateProvider(fullUrl);
      if (isValid) {
        setRpcUrl(fullUrl);
        setValidRpc(true);
        setShowRpcInput(false);
        // Store the new valid URL in localStorage
        localStorage.setItem("tenderly-faucet-url", fullUrl);
      } else {
        setError("Invalid or unreachable RPC URL");
      }
    } catch (error) {
      console.error(
        "Error validating RPC:",
        error instanceof Error ? error.message : JSON.stringify(error)
      );
      setError("Failed to validate RPC URL");
    } finally {
      setIsValidating(false);
      setValidationComplete(true);
    }
  };

  // Update the input change handler to prioritize user input
  const handleRpcInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setRpcUrl(url);
    setValidRpc(false); // Reset valid state until re-validated
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
    setShowRpcInput(true);
    // Don't clear the current RPC URL when opening the input
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
      if (!provider) {
        if (validationComplete) {
          setError("Provider is not initialized");
        }
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
          setError("Failed to fetch block data");
        }
      } catch (error) {
        console.error("Error fetching blockchain time:", error);
        setError("Failed to fetch blockchain time");
      }
    };

    if (validationComplete) {
      fetchBlockchainTime();
    }
  }, [provider, validationComplete]);

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
            {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
            <div className="relative">
              <input
                type="text"
                value={rpcUrl}
                onChange={handleRpcInputChange}
                placeholder="Enter full RPC URL or just the GUID (e.g. 4249ff26-95dc-488b-8f35-a6ca53ecebb3)"
                className={`w-full p-2 sm:p-2 text-sm sm:text-base border bg-white text-black ${
                  rpcUrl && !isValidating && !validRpc
                    ? "border-red-500"
                    : "border-black"
                }`}
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isValidating ? (
                  <span className="text-gray-400">...</span>
                ) : rpcUrl && validRpc ? (
                  <span className="text-green-500">✓</span>
                ) : null}
              </div>
            </div>
            {rpcUrl && !isValidating && !validRpc && (
              <div className="text-red-500 text-xs mt-1">
                Invalid or unreachable RPC URL
              </div>
            )}
            {isValidating && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleRpcSubmit();
                }}
                className="mt-3 w-full p-2 border border-black text-black bg-white hover:bg-gray-50 text-sm sm:text-base"
              >
                Validate
              </button>
            )}
          </div>
        </div>
      )}

      <main className="p-3 sm:p-4 max-w-md mx-auto font-mono text-black">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-lg sm:text-xl">🚰 Tenderly Token Faucet</h1>
          {!showRpcInput && validRpc && (
            <div className="relative group">
              <button
                onClick={handleChangeRpc}
                className="text-xs sm:text-sm px-2 py-1 border border-black hover:bg-gray-50"
              >
                Change RPC
              </button>
              <div className="absolute right-0 top-full mt-2 px-2 py-1 bg-black text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {getGuidFromUrl(rpcUrl)}
              </div>
            </div>
          )}
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
