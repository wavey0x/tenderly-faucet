"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateProvider } from "@/utils/faucet";
import { use } from "react";
import { RPC_CONFIG } from "@/config/rpc";

const STORAGE_KEYS = {
  TENDERLY_URL: "tenderly-faucet-url",
  ERROR: "tenderly-faucet-error",
};

export default function GuidPage({
  params,
}: {
  params: Promise<{ guid: string }>;
}) {
  const router = useRouter();
  const { guid } = use(params);

  useEffect(() => {
    const validateAndRedirect = async () => {
      const rpcUrl = RPC_CONFIG.buildUrl(guid);
      try {
        const isValid = await validateProvider(rpcUrl);
        if (isValid) {
          // Store the valid RPC URL
          localStorage.setItem(STORAGE_KEYS.TENDERLY_URL, rpcUrl);
          // Use window.location for a full page redirect
          window.location.href = "/";
        } else {
          // Invalid RPC, clear storage and redirect with error
          localStorage.removeItem(STORAGE_KEYS.TENDERLY_URL);
          localStorage.setItem(STORAGE_KEYS.ERROR, "Invalid RPC URL");
          window.location.href = "/";
        }
      } catch (err) {
        // Error validating RPC, clear storage and redirect with error
        localStorage.removeItem(STORAGE_KEYS.TENDERLY_URL);
        let errorMessage = "Invalid RPC URL";

        if (err instanceof Error) {
          try {
            // Try to parse the error info to get the Tenderly message
            const info = JSON.parse(err.message.split("info=")[1] || "{}");
            if (info.responseBody) {
              const response = JSON.parse(info.responseBody);
              errorMessage = response.message || errorMessage;
            }
          } catch (e) {
            // If parsing fails, use the original error message
            errorMessage = err.message;
          }
        }

        localStorage.setItem(STORAGE_KEYS.ERROR, errorMessage);
        window.location.href = "/";
      }
    };

    validateAndRedirect();
  }, [guid]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-sm">Validating RPC URL...</div>
    </div>
  );
}
