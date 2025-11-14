"use client";

import { useRef } from "react";
import { PRESET_TOKENS } from "@/config/tokens";
import {
  setTokenBalance,
  setEthBalance,
} from "@/utils/faucet";
import { requireProvider } from "@/utils/errorHandler";
import { useRpcConnection } from "@/hooks/useRpcConnection";
import { useFaucetForm } from "@/hooks/useFaucetForm";
import { useBalances } from "@/hooks/useBalances";
import { useTimestamp } from "@/hooks/useTimestamp";
import { useSavedAddresses } from "@/hooks/useSavedAddresses";
import { useConfetti } from "@/hooks/useConfetti";

export default function Home() {
  // Initialize all custom hooks
  const rpc = useRpcConnection();
  const form = useFaucetForm(rpc.provider, rpc.validationComplete);
  const balancesHook = useBalances(rpc.provider, form.recipient, rpc.validationComplete);
  const timestamp = useTimestamp(rpc.provider, rpc.validationComplete, rpc.validRpc);
  const addresses = useSavedAddresses(form.recipient, balancesHook.isValidAddress);
  const confettiHook = useConfetti();

  const fundButtonRef = useRef<HTMLButtonElement | null>(null);

  // Helper functions
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balancesHook.isValidAddress) {
      form.setError("Invalid address");
      return;
    }

    if (!form.useCustomToken && !form.selectedToken) {
      form.setError("No token selected");
      return;
    }

    if (form.useCustomToken && !form.isValidToken) {
      form.setError("Invalid custom token");
      return;
    }

    form.setLoading(true);

    if (!requireProvider(rpc.provider, form.setError)) {
      form.setLoading(false);
      return;
    }

    try {
      const tokenAddress = form.useCustomToken ? form.customToken : form.selectedToken;
      console.log("Using token address:", tokenAddress);

      const selectedTokenInfo = PRESET_TOKENS.find(
        (t) => t.address === tokenAddress
      );

      if (
        tokenAddress === "0x0000000000000000000000000000000000000000" ||
        selectedTokenInfo?.isEth
      ) {
        await setEthBalance(rpc.provider, form.recipient, form.amount);
      } else {
        await setTokenBalance(
          rpc.provider,
          tokenAddress,
          form.recipient,
          form.amount,
          selectedTokenInfo?.decimals
        );
      }

      form.setSuccess("Success");

      // Trigger confetti
      confettiHook.trigger(fundButtonRef);

      // Refresh balances
      await balancesHook.refreshBalances();
    } catch (error) {
      console.error("Error during balance update:", error);
      form.setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      form.setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Confetti particles */}
      {confettiHook.confetti.map((piece, index) => (
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
      {rpc.showRpcInput && (
        <div className="fixed inset-0 bg-white flex items-start justify-center z-50 p-4 pt-12 sm:pt-20">
          <div className="w-full max-w-md">
            <h2 className="text-lg sm:text-xl mb-3 font-mono text-black">
              Input Tenderly Admin RPC URL or GUID
            </h2>
            {!rpc.inputRpcUrl && (
              <div className="mb-3 text-xs font-mono flex items-center gap-2">
                {rpc.validRpc ? (
                  <>
                    <span className="text-black">
                      Status: <span className="text-green-600 font-bold">connected</span> <span className="text-gray-500">({getGuidFromUrl(rpc.rpcUrl) || "Unknown"})</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        rpc.handleCopyUrl();
                      }}
                      className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-purple-600 transition-all duration-300"
                      title="Copy full URL"
                    >
                      {rpc.copiedUrl ? (
                        <span className="text-green-600 text-xs font-semibold animate-in fade-in zoom-in duration-200">
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
                          <rect x="3" y="6" width="7" height="8" rx="1" fill="white" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="6" y="2" width="7" height="8" rx="1" fill="white" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-black">
                    Status: <span className="text-gray-500">Not connected</span>
                  </span>
                )}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={rpc.inputRpcUrl}
                onChange={rpc.handleRpcInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && rpc.inputRpcUrl && !rpc.isValidating) {
                    e.preventDefault();
                    rpc.handleRpcSubmit();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    rpc.handleCancelRpcInput();
                  }
                }}
                placeholder="Enter full RPC URL or just the GUID (e.g. 4249ff26-95dc-488b-8f35-a6ca53ecebb3)"
                className={`w-full p-2 sm:p-2 text-sm sm:text-base border bg-white text-black ${
                  rpc.validationError ? "border-red-500" : "border-black"
                }`}
                autoFocus
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {rpc.isValidating && <span className="text-gray-400">...</span>}
              </div>
            </div>
            {rpc.validationError && (
              <div className="text-red-500 text-xs mt-1">{rpc.validationError}</div>
            )}
            <div className="flex gap-2 mt-3">
              {rpc.validRpc && (
                <button
                  onClick={rpc.handleCancelRpcInput}
                  disabled={rpc.isValidating}
                  className="flex-1 p-2 border border-black text-black bg-white hover:bg-gray-50 text-sm sm:text-base disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={rpc.handleRpcSubmit}
                disabled={!rpc.inputRpcUrl || rpc.isValidating}
                className="flex-1 p-2 border border-black bg-white text-black hover:bg-gray-50 text-sm sm:text-base disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {rpc.isValidating ? "Validating..." : rpc.validRpc ? "Update Connection" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!rpc.showRpcInput && rpc.validRpc && (
        <main className="p-4 max-w-md mx-auto">
          <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-mono">
                Connected RPC:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={rpc.handleCopyUrl}
                  className={`text-xs underline transition-all duration-300 ${
                    rpc.copiedUrl ? "text-green-700" : "text-gray-500 hover:text-purple-600"
                  }`}
                >
                  {rpc.copiedUrl ? (
                    <span className="animate-in fade-in zoom-in duration-200">✓</span>
                  ) : (
                    "Copy URL"
                  )}
                </button>
                <button
                  onClick={rpc.handleChangeRpc}
                  className="text-xs text-gray-500 hover:text-purple-600 underline"
                >
                  Change
                </button>
              </div>
            </div>
            <div className="text-xs text-black font-mono break-all">
              {getGuidFromUrl(rpc.rpcUrl) || rpc.rpcUrl}
            </div>
          </div>

          {rpc.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {rpc.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-xs text-gray-500 mb-1 font-mono">
                <input
                  type="checkbox"
                  checked={form.useCustomToken}
                  onChange={(e) => form.setUseCustomToken(e.target.checked)}
                  className="w-3 h-3"
                />
                Use custom token address
              </label>
              {form.useCustomToken ? (
                <input
                  type="text"
                  value={form.customToken}
                  onChange={(e) => form.setCustomToken(e.target.value)}
                  placeholder="0x..."
                  className={`w-full p-2 border bg-white text-black font-mono text-sm sm:text-base ${
                    form.customToken && !form.isValidToken
                      ? "border-red-500"
                      : "border-black"
                  }`}
                />
              ) : (
                <select
                  value={form.selectedToken}
                  onChange={(e) => form.setSelectedToken(e.target.value)}
                  className="w-full p-2 border border-black bg-white text-black font-mono text-sm sm:text-base"
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
              <input
                type="text"
                value={form.recipient}
                onChange={(e) => form.setRecipient(e.target.value)}
                placeholder="Recipient address"
                list="saved-addresses"
                className={`w-full p-2 border bg-white text-black font-mono text-sm sm:text-base ${
                  form.recipient && !balancesHook.isValidAddress
                    ? "border-red-500"
                    : "border-black"
                }`}
              />
              <datalist id="saved-addresses">
                {addresses.savedAddresses.map((addr) => (
                  <option key={addr} value={addr} />
                ))}
              </datalist>
            </div>

            {balancesHook.isValidAddress && (
              <div className="text-xs text-gray-600">
                ✓ Valid address
              </div>
            )}

            <div>
              <input
                type="text"
                value={form.amount}
                onChange={(e) => form.setAmount(e.target.value)}
                placeholder="Amount"
                className="w-full p-2 border border-black bg-white text-black font-mono text-sm sm:text-base"
              />
            </div>

            <button
              ref={fundButtonRef}
              type="submit"
              disabled={form.loading || !balancesHook.isValidAddress || (form.useCustomToken && !form.isValidToken)}
              className={`w-full p-2 text-sm sm:text-base border transition-colors
                ${form.success ? "border-green-500 bg-green-50 text-green-700"
                  : form.error ? "border-red-500 bg-red-50 text-red-700"
                  : form.loading || !balancesHook.isValidAddress || (form.useCustomToken && !form.isValidToken)
                  ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border-black bg-white text-black hover:bg-gray-50"
                }`}
            >
              {form.success ? form.success : form.error ? form.error : form.loading ? "..." : "Fund"}
            </button>
          </form>

          <button
            onClick={timestamp.openModal}
            className="w-full mt-4 p-2 border border-black bg-white text-black hover:bg-gray-50 text-sm sm:text-base font-mono"
          >
            ⏱️{" "}
            {timestamp.currentTimestamp !== null
              ? new Date(timestamp.currentTimestamp * 1000).toLocaleString()
              : "Loading..."}
          </button>

          {balancesHook.isValidAddress && !rpc.showRpcInput && (
            <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded">
              <h3 className="text-xs text-gray-700 mb-2 font-mono font-semibold">
                Current Balance:
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-gray-900">ETH:</span>
                  <span className="text-black">{balancesHook.balances?.ETH || "0"}</span>
                </div>
                {balancesHook.balances?.tokens && Object.entries(balancesHook.balances.tokens).map(
                  ([symbol, balance]) => (
                    <div
                      key={symbol}
                      className="flex justify-between text-sm font-mono"
                    >
                      <span className="text-gray-900">{symbol}:</span>
                      <span className="text-black">{balance}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {timestamp.showModal && (
        <div
          className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-12 sm:pt-20"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.85)" }}
        >
          <div
            ref={timestamp.modalRef}
            className="bg-white p-6 rounded-lg max-w-sm w-full relative border border-gray-200"
            style={{
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <button
              onClick={timestamp.closeModal}
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
                value={timestamp.advanceAmount}
                onChange={(e) => timestamp.setAdvanceAmount(Number(e.target.value))}
                className="w-full p-2 border border-black bg-white text-black font-mono"
              />
            </div>
            <div className="mb-4">
              <select
                value={timestamp.timeUnit}
                onChange={(e) => timestamp.setTimeUnit(e.target.value)}
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
                {timestamp.currentTimestamp !== null
                  ? new Date(timestamp.currentTimestamp * 1000).toLocaleString() +
                    " | " +
                    timestamp.currentTimestamp
                  : "Loading..."}
              </p>
            </div>
            <button
              onClick={timestamp.advanceTimestamp}
              disabled={timestamp.timestampLoading}
              className={`w-full p-2 text-sm sm:text-base border transition-colors font-mono
                ${timestamp.timestampSuccess ? "border-green-500 bg-green-50 text-green-700"
                  : timestamp.timestampError ? "border-red-500 bg-red-50 text-red-700"
                  : timestamp.timestampLoading
                  ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border-black bg-white text-black hover:bg-gray-50"
                }`}
            >
              {timestamp.timestampSuccess ? timestamp.timestampSuccess : timestamp.timestampError ? timestamp.timestampError : timestamp.timestampLoading ? "..." : "Set"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
