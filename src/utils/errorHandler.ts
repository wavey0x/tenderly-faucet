import { useState, useCallback, useRef, useEffect } from "react";
import { ethers } from "ethers";

/**
 * Hook for managing error state with auto-clear functionality
 * Automatically clears errors after specified duration and prevents memory leaks
 */
export function useErrorHandler(defaultDuration: number = 2000) {
  const [error, setErrorState] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showError = useCallback(
    (message: string, duration: number = defaultDuration) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setErrorState(message);

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        setErrorState(null);
        timeoutRef.current = null;
      }, duration);
    },
    [defaultDuration]
  );

  const clearError = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setErrorState(null);
  }, []);

  return { error, showError, clearError };
}

/**
 * Hook for managing success state with auto-clear functionality
 */
export function useSuccessHandler(defaultDuration: number = 2000) {
  const [success, setSuccessState] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showSuccess = useCallback(
    (message: string, duration: number = defaultDuration) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setSuccessState(message);

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        setSuccessState(null);
        timeoutRef.current = null;
      }, duration);
    },
    [defaultDuration]
  );

  const clearSuccess = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSuccessState(null);
  }, []);

  return { success, showSuccess, clearSuccess };
}

/**
 * Type guard to check if provider is initialized
 * Use this in functions that require a provider
 *
 * @example
 * if (!requireProvider(provider, showError)) return;
 * // TypeScript now knows provider is not null
 */
export function requireProvider(
  provider: ethers.JsonRpcProvider | null,
  onError: (message: string) => void
): provider is ethers.JsonRpcProvider {
  if (!provider) {
    onError("Provider is not initialized");
    return false;
  }
  return true;
}

/**
 * Utility to validate an address and show error if invalid
 */
export function requireValidAddress(
  address: string,
  isValid: boolean,
  onError: (message: string) => void
): boolean {
  if (!address) {
    onError("Address is required");
    return false;
  }
  if (!isValid) {
    onError("Invalid address");
    return false;
  }
  return true;
}
