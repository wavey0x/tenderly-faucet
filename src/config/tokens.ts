export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isEth?: boolean;
}

export const PRESET_TOKENS: Token[] = [
  {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    isEth: true,
  },
  {
    address: "0x57aB1E0003F623289CD798B1824Be09a793e4Bec",
    symbol: "reUSD",
    name: "reUSD Stablecoin",
    decimals: 18,
  },
  {
    address: "0x419905009e4656fdC02418C7Df35B1E61Ed5F726",
    symbol: "RSUP",
    name: "RSUP Governance Token",
    decimals: 18,
  },
  {
    address: "0x14361C243174794E2207296a6AD59bb0Dec1d388",
    symbol: "crvUSD-sDOLA",
    name: "Curve Lend - crvUSD sDOLA",
    decimals: 18,
  },
  {
    address: "0xaB3cb84c310186B2Fa4B4503624A5D90b5DcB22D",
    symbol: "frxUSD-sfrxETH",
    name: "Fraxlend - frxUSD sfrxETH",
    decimals: 18,
  },
  {
    address: "0xB6aF437ceEa0DBeA524115eFC905F0F44fd1eBAF",
    symbol: "Curve Pool: reUSD-sfrxUSD",
    name: "Curve Pool: reUSD-sfrxUSD",
    decimals: 18,
  },
  {
    address: "0xA6d9F4f3A67B35E81DFa560b0FcDE9B0751F1f53",
    symbol: "Curve Pool: reUSD-scrvUSD",
    name: "Curve Pool: reUSD-scrvUSD",
    decimals: 18,
  },
];
