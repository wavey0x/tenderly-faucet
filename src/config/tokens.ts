import { Token } from "@/types";

export const PRESET_TOKENS: Token[] = [
  {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    isEth: true,
  },
  {
    address: "0x01791F726B4103694969820be083196cC7c045fF",
    symbol: "YB",
    name: "Yield Basis",
    decimals: 18,
  },
  {
    address: "0x22222222aEA0076fCA927a3f44dc0B4FdF9479D6",
    symbol: "yYB",
    name: "Yearn YB Token",
    decimals: 18,
  },
  {
    address: "0xBF319dDC2Edc1Eb6FDf9910E39b37Be221C8805F",
    symbol: "yvcrvUSD-2",
    name: "yvcrvUSD-2",
    decimals: 18,
  },
];
