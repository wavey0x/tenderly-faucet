// src/context/ProviderContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

const ProviderContext = createContext(null);

export const useProvider = () => {
  return useContext(ProviderContext);
};

export const ProviderProvider = ({ children }) => {
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);

  useEffect(() => {
    const savedRpcUrl = localStorage.getItem("tenderly-faucet-url");
    if (savedRpcUrl) {
      const newProvider = new ethers.JsonRpcProvider(savedRpcUrl);
      setProvider(newProvider);
    }
  }, []);

  const initializeProvider = (rpcUrl: string) => {
    const newProvider = new ethers.JsonRpcProvider(rpcUrl);
    setProvider(newProvider);
    localStorage.setItem("tenderly-faucet-url", rpcUrl);
  };

  return (
    <ProviderContext.Provider value={{ provider, initializeProvider }}>
      {children}
    </ProviderContext.Provider>
  );
};
