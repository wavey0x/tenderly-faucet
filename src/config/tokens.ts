import { Token } from "@/types";

export const PRESET_TOKENS: Token[] = [
  {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    isEth: true,
    showBalanceOnly: false,
  },
  {
    address: "0x01791F726B4103694969820be083196cC7c045fF",
    symbol: "YB",
    name: "Yield Basis",
    decimals: 18,
    showBalanceOnly: false,
  },
  {
    address: "0x22222222aEA0076fCA927a3f44dc0B4FdF9479D6",
    symbol: "yYB",
    name: "Yearn YB Token",
    decimals: 18,
    showBalanceOnly: false,
  },
  {
    address: "0x5D2eA33449A60a70E8FCdc5251FDd86a030fAD91",
    symbol: "YBS",
    name: "YBS",
    decimals: 18,
    showBalanceOnly: true,
  },
  {
    address: "0x64c08F63De0D4AF43aE09d3E26737ED2A492F02B",
    symbol: "Curve Pool",
    name: "Curve Pool",
    decimals: 18,
    showBalanceOnly: true,
  },
  {
    address: "0xA785dbbb48f6C42bE29DeA00Eb1347b341D681a5",
    symbol: "yvyYB",
    name: "yvyYB",
    decimals: 18,
    showBalanceOnly: true,
  },
  {
    address: "0xe0287cA62fE23f4FFAB827d5448d68aFe6DD9Fd7",
    symbol: "yvLP_YB",
    name: "yvLP_YB",
    decimals: 18,
    showBalanceOnly: true,
  },
  {
    address: "0xBF319dDC2Edc1Eb6FDf9910E39b37Be221C8805F",
    symbol: "yvcrvUSD-2",
    name: "yvcrvUSD-2",
    decimals: 18,
    showBalanceOnly: false,
  },
];
