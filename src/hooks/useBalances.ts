import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  getAllBalances,
  isValidEthereumAddress,
} from "@/utils/faucet";

export interface BalanceInfo {
  ETH: string;
  tokens: Record<string, string>;
}

export interface UseBalancesReturn {
  balances: BalanceInfo | null;
  isValidAddress: boolean;
  refreshBalances: () => Promise<void>;
}

export function useBalances(
  provider: ethers.JsonRpcProvider | null,
  address: string,
  validationComplete: boolean
): UseBalancesReturn {
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [isValidAddress, setIsValidAddress] = useState(false);

  // Check address and fetch balances when address or provider changes
  useEffect(() => {
    const checkAddressAndFetchBalances = async () => {
      if (!address) {
        setIsValidAddress(false);
        setBalances(null);
        return;
      }

      const isValid = isValidEthereumAddress(address);
      setIsValidAddress(isValid);

      if (isValid) {
        try {
          if (!provider) {
            if (validationComplete) {
              console.error("Provider is not initialized");
            }
            return;
          }
          const fetchedBalances = await getAllBalances(provider, address);
          setBalances(fetchedBalances);
        } catch (error) {
          console.error("Error fetching balances:", error);
          setBalances(null);
        }
      } else {
        setBalances(null);
      }
    };

    checkAddressAndFetchBalances();
  }, [address, provider, validationComplete]);

  const refreshBalances = async () => {
    if (!provider || !address || !isValidAddress) return;

    try {
      const fetchedBalances = await getAllBalances(provider, address);
      setBalances(fetchedBalances);
    } catch (error) {
      console.error("Error refreshing balances:", error);
    }
  };

  return {
    balances,
    isValidAddress,
    refreshBalances,
  };
}
