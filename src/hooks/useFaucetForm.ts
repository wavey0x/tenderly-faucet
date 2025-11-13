import { useReducer, useEffect, useState } from "react";
import { ethers } from "ethers";
import { isValidERC20 } from "@/utils/faucet";
import { PRESET_TOKENS } from "@/config/tokens";
import { useErrorHandler, useSuccessHandler } from "@/utils/errorHandler";

// State interface
export interface FaucetFormState {
  useCustomToken: boolean;
  selectedToken: string;
  customToken: string;
  amount: string;
  recipient: string;
  loading: boolean;
}

// Action types
type FaucetFormAction =
  | { type: "SET_USE_CUSTOM_TOKEN"; payload: boolean }
  | { type: "SET_SELECTED_TOKEN"; payload: string }
  | { type: "SET_CUSTOM_TOKEN"; payload: string }
  | { type: "SET_AMOUNT"; payload: string }
  | { type: "SET_RECIPIENT"; payload: string }
  | { type: "SET_LOADING"; payload: boolean };

// Reducer
function faucetFormReducer(
  state: FaucetFormState,
  action: FaucetFormAction
): FaucetFormState {
  switch (action.type) {
    case "SET_USE_CUSTOM_TOKEN":
      return { ...state, useCustomToken: action.payload };
    case "SET_SELECTED_TOKEN":
      return { ...state, selectedToken: action.payload };
    case "SET_CUSTOM_TOKEN":
      return { ...state, customToken: action.payload };
    case "SET_AMOUNT":
      return { ...state, amount: action.payload };
    case "SET_RECIPIENT":
      return { ...state, recipient: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export interface UseFaucetFormReturn {
  // State
  useCustomToken: boolean;
  selectedToken: string;
  customToken: string;
  amount: string;
  recipient: string;
  loading: boolean;
  success: string | null;
  error: string | null;
  isValidToken: boolean;

  // Actions
  setUseCustomToken: (value: boolean) => void;
  setSelectedToken: (address: string) => void;
  setCustomToken: (address: string) => void;
  setAmount: (amount: string) => void;
  setRecipient: (address: string) => void;
  setLoading: (loading: boolean) => void;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
}

export function useFaucetForm(
  provider: ethers.JsonRpcProvider | null,
  validationComplete: boolean
): UseFaucetFormReturn {
  const [state, dispatch] = useReducer(faucetFormReducer, {
    useCustomToken: false,
    selectedToken: PRESET_TOKENS[0].address,
    customToken: "",
    amount: "",
    recipient: "",
    loading: false,
  });

  const [isValidToken, setIsValidToken] = useState(true);
  const { error, showError, clearError } = useErrorHandler();
  const { success, showSuccess, clearSuccess } = useSuccessHandler();

  // Reset success/error when inputs change
  useEffect(() => {
    clearError();
    clearSuccess();
  }, [
    state.recipient,
    state.amount,
    state.selectedToken,
    state.customToken,
    state.useCustomToken,
    clearError,
    clearSuccess,
  ]);

  // Validate custom token
  useEffect(() => {
    const validateToken = async () => {
      if (!state.useCustomToken) {
        setIsValidToken(true);
        return;
      }
      if (!state.customToken) {
        setIsValidToken(false);
        return;
      }
      // Don't validate if it's the ETH address
      if (
        state.customToken === "0x0000000000000000000000000000000000000000"
      ) {
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
      const isValid = await isValidERC20(provider, state.customToken);
      setIsValidToken(isValid);
    };
    validateToken();
  }, [state.customToken, state.useCustomToken, provider, validationComplete]);

  return {
    // State
    useCustomToken: state.useCustomToken,
    selectedToken: state.selectedToken,
    customToken: state.customToken,
    amount: state.amount,
    recipient: state.recipient,
    loading: state.loading,
    success,
    error,
    isValidToken,

    // Actions
    setUseCustomToken: (value: boolean) =>
      dispatch({ type: "SET_USE_CUSTOM_TOKEN", payload: value }),
    setSelectedToken: (address: string) =>
      dispatch({ type: "SET_SELECTED_TOKEN", payload: address }),
    setCustomToken: (address: string) =>
      dispatch({ type: "SET_CUSTOM_TOKEN", payload: address }),
    setAmount: (amount: string) =>
      dispatch({ type: "SET_AMOUNT", payload: amount }),
    setRecipient: (address: string) =>
      dispatch({ type: "SET_RECIPIENT", payload: address }),
    setLoading: (loading: boolean) =>
      dispatch({ type: "SET_LOADING", payload: loading }),
    setSuccess: showSuccess,
    setError: showError,
  };
}
