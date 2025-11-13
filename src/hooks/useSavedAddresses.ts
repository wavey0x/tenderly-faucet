import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "@/config/constants";

export interface UseSavedAddressesReturn {
  savedAddresses: string[];
  addAddress: (address: string) => void;
  removeAddress: (address: string) => void;
}

export function useSavedAddresses(
  currentAddress: string,
  isValid: boolean
): UseSavedAddressesReturn {
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);

  // Load saved addresses from localStorage on mount
  useEffect(() => {
    const addresses = localStorage.getItem(STORAGE_KEYS.SAVED_ADDRESSES);
    if (addresses) {
      try {
        setSavedAddresses(JSON.parse(addresses));
      } catch (err) {
        console.error("Failed to parse saved addresses:", err);
        setSavedAddresses([]);
      }
    }
  }, []);

  // Auto-save valid addresses
  useEffect(() => {
    if (
      isValid &&
      currentAddress &&
      !savedAddresses.includes(currentAddress)
    ) {
      const newAddresses = [...savedAddresses, currentAddress];
      setSavedAddresses(newAddresses);
      localStorage.setItem(
        STORAGE_KEYS.SAVED_ADDRESSES,
        JSON.stringify(newAddresses)
      );
    }
  }, [isValid, currentAddress, savedAddresses]);

  const addAddress = (address: string) => {
    if (!savedAddresses.includes(address)) {
      const newAddresses = [...savedAddresses, address];
      setSavedAddresses(newAddresses);
      localStorage.setItem(
        STORAGE_KEYS.SAVED_ADDRESSES,
        JSON.stringify(newAddresses)
      );
    }
  };

  const removeAddress = (address: string) => {
    const newAddresses = savedAddresses.filter((addr) => addr !== address);
    setSavedAddresses(newAddresses);
    localStorage.setItem(
      STORAGE_KEYS.SAVED_ADDRESSES,
      JSON.stringify(newAddresses)
    );
  };

  return {
    savedAddresses,
    addAddress,
    removeAddress,
  };
}
