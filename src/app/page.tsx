"use client";

import { useState, useEffect } from "react";
import { PRESET_TOKENS } from "@/config/tokens";
import {
  setTokenBalance,
  setEthBalance,
  isValidEthereumAddress,
  isValidERC20,
  getAddressBalances,
} from "@/utils/faucet";

export default function Home() {
  const [useCustomToken, setUseCustomToken] = useState(false);
  const [selectedToken, setSelectedToken] = useState(PRESET_TOKENS[0].address);
  const [customToken, setCustomToken] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [balances, setBalances] = useState<{
    eth: string;
    token: string | null;
  } | null>(null);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

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
          const tokenAddress = useCustomToken ? customToken : selectedToken;
          // Don't try to get token balance for ETH
          const shouldGetTokenBalance =
            tokenAddress !== "0x0000000000000000000000000000000000000000" &&
            isValidEthereumAddress(tokenAddress);
          const balances = await getAddressBalances(
            recipient,
            shouldGetTokenBalance ? tokenAddress : undefined
          );
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
  }, [recipient, selectedToken, customToken, useCustomToken]);

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
      const newBalances = await getAddressBalances(
        recipient,
        tokenAddress !== "0x0000000000000000000000000000000000000000" &&
          isValidEthereumAddress(tokenAddress)
          ? tokenAddress
          : undefined
      );
      setBalances(newBalances);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="p-4 max-w-md mx-auto font-mono text-black">
        <h1 className="text-xl mb-4">Token Faucet</h1>

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

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Recipient
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Address (0x...)"
              className={`w-full p-1 border bg-white text-black ${
                recipient && !isValidAddress ? "border-red-500" : "border-black"
              }`}
              required
            />
            {recipient && !isValidAddress && (
              <div className="text-red-500 text-xs mt-1">Invalid address</div>
            )}
          </div>

          <button
            type="submit"
            disabled={
              loading || !isValidAddress || (useCustomToken && !isValidToken)
            }
            className={`w-full p-1 border border-black text-black
              ${
                loading || !isValidAddress || (useCustomToken && !isValidToken)
                  ? "bg-gray-100 border-gray-400 text-gray-500 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50"
              }`}
          >
            {loading ? "..." : "Fund"}
          </button>

          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-500 text-sm">{success}</div>}
        </form>

        {balances && isValidAddress && (
          <div className="border border-gray-200 p-2 mt-6 text-sm font-mono bg-gray-50 text-black shadow-sm">
            <div className="text-sm mb-2 font-bold border-b border-gray-100 pb-2">
              Wallet Info
            </div>
            <div className="mb-3 break-all">{recipient}</div>
            <div className="space-y-1">
              <div className="border-b border-gray-50 pb-1">
                ETH: {balances.eth}
              </div>
              {balances.token && <div>Token: {balances.token}</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
