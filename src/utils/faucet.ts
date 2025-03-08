import { ethers } from "ethers";
import { PRESET_TOKENS, Token } from "@/config/tokens";
import { RPC_CONFIG } from "@/config/rpc";
import { useProvider } from "../context/ProviderContext";

export async function validateProvider(rpcUrl: string): Promise<boolean> {
  try {
    // Clean the URL and ensure it's properly formatted
    const cleanUrl = rpcUrl.replace(/\s+/g, "");

    // Debug log
    console.log("Validating RPC URL:", {
      originalUrl: rpcUrl,
      cleanUrl,
      hasSpaces: rpcUrl.includes(" "),
      startsWithHttp: cleanUrl.startsWith("http"),
    });

    // Check if it's a GUID
    if (
      cleanUrl.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      const fullUrl = RPC_CONFIG.buildUrl(cleanUrl);
      const tempProvider = new ethers.JsonRpcProvider(fullUrl);
      await tempProvider.getNetwork();
      return true;
    }

    // Handle full URL case
    if (!cleanUrl.startsWith("http")) {
      throw new Error("Invalid URL format");
    }

    // Try to construct a URL object to validate format
    new URL(cleanUrl);

    const tempProvider = new ethers.JsonRpcProvider(cleanUrl);
    // Try to get chain ID - this will fail if the RPC is invalid
    await tempProvider.getNetwork();
    return true;
  } catch (err) {
    console.error(
      "Failed to validate RPC URL:",
      err instanceof Error ? err.message : JSON.stringify(err)
    );
    return false;
  }
}

// Add this after the provider initialization
const multicallAbi = [
  "function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)",
];
const MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11"; // Multicall3 contract

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
    const { provider } = useProvider();
    const erc20Abi = [
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function balanceOf(address) view returns (uint256)",
    ];
    const contract = new ethers.Contract(address, erc20Abi, provider);

    // Try to call basic ERC20 functions with a timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 5000)
    );

    await Promise.race([
      Promise.all([
        contract.decimals().catch(() => null),
        contract.symbol().catch(() => null),
        contract.balanceOf(address).catch(() => null),
      ]),
      timeout,
    ]);

    // If any of the calls returned null, the contract is not a valid ERC20
    const [decimals, symbol, balance] = await Promise.all([
      contract.decimals().catch(() => null),
      contract.symbol().catch(() => null),
      contract.balanceOf(address).catch(() => null),
    ]);

    return decimals !== null && symbol !== null && balance !== null;
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
  const { provider } = useProvider();
  const ethBalance = await provider.getBalance(address);

  if (!tokenAddress) {
    return {
      eth: formatBalance(ethBalance.toString()),
      token: null,
      symbol: null,
    };
  }

  try {
    const erc20Abi = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ];
    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);

    // Add timeout to prevent hanging
    const timeout = new Promise<[string, number, string]>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 5000)
    );

    const [tokenBalance, decimals, symbol] = await Promise.race([
      Promise.all([
        contract.balanceOf(address).catch(() => "0"),
        contract.decimals().catch(() => 18),
        contract.symbol().catch(() => "???"),
      ]),
      timeout,
    ]);

    return {
      eth: formatBalance(ethBalance.toString()),
      token: formatBalance(tokenBalance.toString(), decimals),
      symbol,
    };
  } catch (err) {
    console.error("Error fetching token balance:", err);
    return {
      eth: formatBalance(ethBalance.toString()),
      token: null,
      symbol: null,
    };
  }
}

export async function setEthBalance(
  provider: ethers.JsonRpcProvider,
  userAddress: string,
  amount: string
) {
  try {
    // Validate address
    if (!isValidEthereumAddress(userAddress)) {
      throw new Error("Invalid address");
    }

    // Convert to wei
    const amountInWei = ethers.parseEther(amount);

    // Ensure provider is not null
    if (!provider) {
      throw new Error("Provider is null when attempting to set ETH balance.");
    }

    // Make the RPC call
    const result = await provider.send("tenderly_setBalance", [
      userAddress,
      `0x${amountInWei.toString(16)}`,
    ]);

    if (!result) {
      throw new Error("Failed to set ETH balance");
    }

    return result;
  } catch (err) {
    console.error("Error setting ETH balance:", err);
    throw new Error(
      err instanceof Error ? err.message : "Failed to set ETH balance"
    );
  }
}

export async function setTokenBalance(
  provider: ethers.JsonRpcProvider,
  tokenAddress: string,
  userAddress: string,
  amount: string,
  decimals: number = 18
) {
  try {
    // Validate addresses
    if (
      !isValidEthereumAddress(tokenAddress) ||
      !isValidEthereumAddress(userAddress)
    ) {
      throw new Error("Invalid address");
    }

    // Convert to wei
    const amountInWei = ethers.parseUnits(amount, decimals);

    // Make the RPC call with simple array parameters
    const result = await provider.send("tenderly_setErc20Balance", [
      tokenAddress,
      userAddress,
      `0x${amountInWei.toString(16)}`,
    ]);

    if (!result) {
      throw new Error("Failed to set token balance");
    }

    return result;
  } catch (err) {
    console.error("Error setting token balance:", err);
    throw new Error(
      err instanceof Error
        ? err.message
        : "Failed to set token balance. Please verify the token contract is valid."
    );
  }
}

export async function getAllBalances(
  provider: ethers.JsonRpcProvider,
  address: string
) {
  try {
    const multicall = new ethers.Contract(
      MULTICALL_ADDRESS,
      multicallAbi,
      provider
    );
    const erc20Interface = new ethers.Interface([
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ]);

    // Create calls array for multicall
    const calls = PRESET_TOKENS.flatMap((token: Token) => {
      if (token.isEth) return []; // Skip ETH as it needs special handling
      return [
        {
          target: token.address,
          callData: erc20Interface.encodeFunctionData("balanceOf", [address]),
        },
        {
          target: token.address,
          callData: erc20Interface.encodeFunctionData("decimals"),
        },
      ];
    });

    // Get ETH balance separately (not via multicall)
    const ethBalance = await provider.getBalance(address);

    // Execute multicall
    const [, returnData] = await multicall.aggregate(calls);

    // Process results
    const balances = {
      ETH: formatBalance(ethBalance.toString()),
      tokens: {} as Record<string, string>,
    };

    // Process token results
    let i = 0;
    PRESET_TOKENS.forEach((token) => {
      if (token.isEth) return; // Skip ETH as we handled it separately

      try {
        const balance = erc20Interface.decodeFunctionResult(
          "balanceOf",
          returnData[i]
        )[0];
        const decimals = erc20Interface.decodeFunctionResult(
          "decimals",
          returnData[i + 1]
        )[0];
        balances.tokens[token.symbol] = formatBalance(
          balance.toString(),
          decimals
        );
      } catch (err) {
        console.error(`Error decoding balance for ${token.symbol}:`, err);
        balances.tokens[token.symbol] = "0";
      }
      i += 2; // Increment by 2 as we made 2 calls per token
    });

    return balances;
  } catch (err) {
    console.error("Error in getAllBalances:", err);
    return {
      ETH: "0",
      tokens: Object.fromEntries(
        PRESET_TOKENS.filter((t) => !t.isEth).map((t) => [t.symbol, "0"])
      ),
    };
  }
}
