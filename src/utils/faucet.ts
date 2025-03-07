import { ethers } from "ethers";

if (!process.env.NEXT_PUBLIC_TENDERLY_RPC_URL) {
  throw new Error(
    "NEXT_PUBLIC_TENDERLY_RPC_URL is not defined in environment variables"
  );
}

const provider = new ethers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_TENDERLY_RPC_URL
);

export function isValidEthereumAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

export async function isValidERC20(address: string): Promise<boolean> {
  if (!isValidEthereumAddress(address)) return false;

  // Special case: ETH address
  if (address === "0x0000000000000000000000000000000000000000") return false;

  try {
    const erc20Abi = [
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ];
    const contract = new ethers.Contract(address, erc20Abi, provider);

    // Try to call basic ERC20 functions
    await Promise.all([contract.decimals(), contract.symbol()]);

    return true;
  } catch {
    return false;
  }
}

function formatBalance(amount: string, decimals: number = 18): string {
  try {
    const value = ethers.formatUnits(amount, decimals);
    // Remove trailing zeros after decimal point
    return value.replace(/\.?0+$/, "");
  } catch {
    return "0";
  }
}

export async function getAddressBalances(
  address: string,
  tokenAddress?: string
) {
  const ethBalance = await provider.getBalance(address);

  if (!tokenAddress) {
    return {
      eth: formatBalance(ethBalance.toString()),
      token: null,
    };
  }

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];
  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const [tokenBalance, decimals] = await Promise.all([
    tokenContract.balanceOf(address),
    tokenContract.decimals(),
  ]);

  return {
    eth: formatBalance(ethBalance.toString()),
    token: formatBalance(tokenBalance.toString(), decimals),
  };
}

export async function setEthBalance(userAddress: string, amount: string) {
  const amountInWei = ethers.parseEther(amount);
  await provider.send("tenderly_addBalance", [
    userAddress,
    `0x${amountInWei.toString(16)}`,
  ]);
}

export async function setTokenBalance(
  tokenAddress: string,
  userAddress: string,
  amount: string,
  decimals: number = 18
) {
  const amountInWei = ethers.parseUnits(amount, decimals);
  await provider.send("tenderly_setErc20Balance", [
    tokenAddress,
    userAddress,
    `0x${amountInWei.toString(16)}`,
  ]);
}
