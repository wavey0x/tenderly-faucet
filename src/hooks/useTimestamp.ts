import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useErrorHandler, useSuccessHandler, requireProvider } from "@/utils/errorHandler";

export interface UseTimestampReturn {
  // Modal state
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;

  // Form state
  advanceAmount: number;
  setAdvanceAmount: (amount: number) => void;
  timeUnit: string;
  setTimeUnit: (unit: string) => void;

  // Blockchain state
  currentTimestamp: number | null;

  // Submit state
  timestampSuccess: string | null;
  timestampError: string | null;
  timestampLoading: boolean;

  // Actions
  advanceTimestamp: () => Promise<void>;
}

export function useTimestamp(
  provider: ethers.JsonRpcProvider | null,
  validationComplete: boolean,
  validRpc: boolean
): UseTimestampReturn {
  const [showModal, setShowModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [timeUnit, setTimeUnit] = useState("seconds");
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);
  const [timestampLoading, setTimestampLoading] = useState(false);

  const { error: timestampError, showError: showTimestampError } = useErrorHandler();
  const { success: timestampSuccess, showSuccess: showTimestampSuccess } = useSuccessHandler();

  const modalRef = useRef<HTMLDivElement | null>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal]);

  // Fetch blockchain time when provider is ready
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
    setTimestampLoading(true);

    let secondsToAdd = advanceAmount;
    if (timeUnit === "days") {
      secondsToAdd *= 86400;
    } else if (timeUnit === "weeks") {
      secondsToAdd *= 604800;
    }

    if (!requireProvider(provider, showTimestampError)) {
      setTimestampLoading(false);
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
        showTimestampSuccess("Success");
      } else {
        showTimestampError("Failed to fetch block data");
      }
    } catch (error) {
      console.error("Error advancing timestamp:", error);
      showTimestampError("Failed to advance timestamp");
    } finally {
      setTimestampLoading(false);
    }
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return {
    // Modal state
    showModal,
    openModal,
    closeModal,
    modalRef,

    // Form state
    advanceAmount,
    setAdvanceAmount,
    timeUnit,
    setTimeUnit,

    // Blockchain state
    currentTimestamp,

    // Submit state
    timestampSuccess,
    timestampError,
    timestampLoading,

    // Actions
    advanceTimestamp,
  };
}
