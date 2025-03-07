"use client";

import { useState, useEffect } from "react";
import { PRESET_TOKENS } from "@/config/tokens";
import {
  setTokenBalance,
  setEthBalance,
  isValidEthereumAddress,
  isValidERC20,
  getAllBalances,
  setProvider,
  validateProvider,
} from "@/utils/faucet";

const STORAGE_KEYS = {
  TENDERLY_URL: "tenderly-faucet-url",
  SAVED_ADDRESSES: "tenderly-faucet-addresses",
};

export default function Home() {
  const [showRpcInput, setShowRpcInput] = useState(true);
  const [tenderlyUrl, setTenderlyUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [useCustomToken, setUseCustomToken] = useState(false);
  const [selectedToken, setSelectedToken] = useState(PRESET_TOKENS[0].address);
  const [customToken, setCustomToken] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [balances, setBalances] = useState<{
    ETH: string;
    tokens: Record<string, string>;
  } | null>(null);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  // Load saved data from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEYS.TENDERLY_URL);
    if (savedUrl) {
      setTenderlyUrl(savedUrl);
      validateAndSetUrl(savedUrl);
      setShowRpcInput(false);
    }

    const addresses = localStorage.getItem(STORAGE_KEYS.SAVED_ADDRESSES);
    if (addresses) {
      setSavedAddresses(JSON.parse(addresses));
    }
  }, []);

  // Validate and set Tenderly URL
  const validateAndSetUrl = async (url: string) => {
    if (!url) {
      setIsValidUrl(false);
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await validateProvider(url);
      if (isValid) {
        setProvider(url);
        setIsValidUrl(true);
        localStorage.setItem(STORAGE_KEYS.TENDERLY_URL, url);
      } else {
        setIsValidUrl(false);
      }
    } catch (err) {
      setIsValidUrl(false);
      console.error("Invalid Tenderly URL:", err);
    } finally {
      setIsValidating(false);
    }
  };

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
  }, [isValidAddress, recipient]);

  // Reset success message when inputs change
  useEffect(() => {
    setSuccess("");
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
      const isValid = await isValidERC20(customToken);
      setIsValidToken(isValid);
    };
    validateToken();
  }, [customToken, useCustomToken]);

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
          const balances = await getAllBalances(recipient);
          setBalances(balances);
        } catch (err) {
          console.error("Error fetching balances:", err);
          setBalances(null);
        }
      } else {
        setBalances(null);
      }
    };

    checkAddressAndFetchBalances();
  }, [recipient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !isValidAddress ||
      (!useCustomToken && !selectedToken) ||
      (useCustomToken && !isValidToken)
    ) {
      setError("Invalid address or token");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const tokenAddress = useCustomToken ? customToken : selectedToken;
      const selectedTokenInfo = PRESET_TOKENS.find(
        (t) => t.address === tokenAddress
      );

      if (
        tokenAddress === "0x0000000000000000000000000000000000000000" ||
        selectedTokenInfo?.isEth
      ) {
        await setEthBalance(recipient, amount);
      } else {
        await setTokenBalance(
          tokenAddress,
          recipient,
          amount,
          selectedTokenInfo?.decimals
        );
      }

      setSuccess("Balance updated successfully!");

      // Refresh balances
      const newBalances = await getAllBalances(recipient);
      setBalances(newBalances);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4">
            <h2 className="text-xl mb-4 font-mono text-black">
              Set Tenderly RPC URL
            </h2>
            <div className="relative">
              <input
                type="text"
                value={tenderlyUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  setTenderlyUrl(url);
                  validateAndSetUrl(url);
                }}
                placeholder="https://rpc.tenderly.co/fork/..."
                className={`w-full p-2 pr-8 border bg-white text-black ${
                  tenderlyUrl && !isValidUrl ? "border-red-500" : "border-black"
                }`}
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isValidating ? (
                  <span className="text-gray-400">...</span>
                ) : tenderlyUrl ? (
                  isValidUrl ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )
                ) : null}
              </div>
            </div>
            {tenderlyUrl && !isValidUrl && !isValidating && (
              <div className="text-red-500 text-xs mt-1">
                Invalid or unreachable RPC URL
              </div>
            )}
            {isValidUrl && (
              <button
                onClick={() => setShowRpcInput(false)}
                className="mt-4 w-full p-2 border border-black text-black bg-white hover:bg-gray-50"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      <main className="p-4 max-w-md mx-auto font-mono text-black">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">Token Faucet</h1>
          {!showRpcInput && isValidUrl && (
            <button
              onClick={() => setShowRpcInput(true)}
              className="text-sm px-2 py-1 border border-black hover:bg-gray-50"
            >
              Change RPC
            </button>
          )}
        </div>

        {isValidUrl && !showRpcInput && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Token</label>
              <label className="block text-sm mb-1">
                <input
                  type="checkbox"
                  checked={useCustomToken}
                  onChange={(e) => setUseCustomToken(e.target.checked)}
                  className="mr-1"
                />
                Custom token
              </label>

              {useCustomToken ? (
                <div>
                  <input
                    type="text"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder="Token Address (0x...)"
                    className={`w-full p-1 border bg-white text-black ${
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
                  className="w-full p-1 border border-black bg-white text-black"
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
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Address (0x...)"
                  className={`w-full p-1 border bg-white text-black ${
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
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full p-1 border border-black bg-white text-black"
                required
              />
            </div>

            <button
              type="submit"
              disabled={
                loading || !isValidAddress || (useCustomToken && !isValidToken)
              }
              className={`w-full p-1 border border-black text-black
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

            {error && <div className="text-red-500 text-sm">{error}</div>}
            {success && <div className="text-green-500 text-sm">{success}</div>}
          </form>
        )}

        {balances && isValidAddress && !showRpcInput && (
          <div className="border border-gray-200 p-2 mt-6 text-sm font-mono bg-gray-50 text-black shadow-sm">
            <div className="text-sm mb-2 font-bold border-b border-gray-100 pb-2">
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
    </div>
  );
}
