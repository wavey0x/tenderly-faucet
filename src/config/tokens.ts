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
    address: "0xCAcd6fd266aF91b8AeD52aCCc382b4e165586E29",
    symbol: "frxUSD",
    name: "frxUSD",
    decimals: 18,
  },
  {
    address: "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E",
    symbol: "crvUSD",
    name: "crvUSD",
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
  {
    address: "0xdA47862a83dac0c112BA89c6abC2159b95afd71C",
    symbol: "PRISMA",
    name: "Prisma Governance Token",
    decimals: 18,
  },
  {
    address: "0xe3668873D944E4A949DA05fc8bDE419eFF543882",
    symbol: "yPRISMA",
    name: "Yearn Prisma",
    decimals: 18,
  },
  {
    address: "0x34635280737b5BFe6c7DC2FC3065D60d66e78185",
    symbol: "cvxPRISMA",
    name: "Convex Prisma",
    decimals: 18,
  },
];
