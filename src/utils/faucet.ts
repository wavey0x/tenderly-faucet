import { ethers } from "ethers";
import { PRESET_TOKENS } from "@/config/tokens";
import { RPC_CONFIG } from "@/config/rpc";
import { MULTICALL_ADDRESS, TIMEOUTS } from "@/config/constants";
import type {
  Token,
  RpcValidationResult,
  AddressBalances,
  BalanceInfo,
} from "@/types";

export async function validateProvider(
  rpcUrl: string
): Promise<RpcValidationResult> {
  try {
    const cleanInput = rpcUrl.trim();

    // Debug log
    console.log("Validating RPC input:", {
      originalUrl: rpcUrl,
      cleanInput,
      isGuid: RPC_CONFIG.isGuid(cleanInput),
      isTenderlyUrl: RPC_CONFIG.isTenderlyUrl(cleanInput),
      startsWithHttp: cleanInput.startsWith("http"),
    });

    let urlToValidate: string;
    const isGuidInput = RPC_CONFIG.isGuid(cleanInput);

    // Case 1: Input is just a GUID - build full URL
    if (isGuidInput) {
      urlToValidate = RPC_CONFIG.buildUrl(cleanInput);
      console.log("Detected GUID, built URL:", urlToValidate);
    }
    // Case 2: Input is a full Tenderly URL - use as-is
    else if (RPC_CONFIG.isTenderlyUrl(cleanInput)) {
      urlToValidate = cleanInput;
      const extractedGuid = RPC_CONFIG.extractGuid(cleanInput);
      console.log(
        "Detected Tenderly URL, using as-is. Extracted GUID:",
        extractedGuid
      );
    }
    // Case 3: Input is some other URL format
    else if (cleanInput.startsWith("http")) {
      urlToValidate = cleanInput;
      console.log("Detected generic HTTP URL");
    }
    // Case 4: Invalid input
    else {
      throw new Error(
        "Invalid URL format - must be a GUID or valid HTTP(S) URL"
      );
    }

    // Validate the URL format
    new URL(urlToValidate);

    // Test connectivity by attempting to get network info with timeout
    console.log("Testing connectivity to:", urlToValidate);
    const tempProvider = new ethers.JsonRpcProvider(urlToValidate);

    // Add timeout to prevent hanging
    const timeout = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Connection timeout after ${TIMEOUTS.RPC_VALIDATION / 1000} seconds`
            )
          ),
        TIMEOUTS.RPC_VALIDATION
      )
    );

    const networkPromise = tempProvider.getNetwork();

    const network = await Promise.race([networkPromise, timeout]);

    console.log("RPC validation successful! Network:", network);
    return { isValid: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to validate RPC URL:", errorMessage);
    if (err instanceof Error) {
      console.error("Error stack:", err.stack);
    }

    // Check for region mismatch error and extract region
    // Error format: "testnet region 'us-east' and url region 'eu' do not match"
    const regionMismatchMatch = errorMessage.match(
      /testnet region '([^']+)' and url region/
    );

    if (regionMismatchMatch && RPC_CONFIG.isGuid(rpcUrl.trim())) {
      const correctRegion = regionMismatchMatch[1];
      console.log(
        `🔄 Region mismatch detected. Retrying with region: ${correctRegion}`
      );

      // Rebuild URL with correct region
      const correctedUrl = RPC_CONFIG.buildUrl(rpcUrl.trim(), correctRegion);
      console.log("Retrying with corrected URL:", correctedUrl);

      try {
        const retryProvider = new ethers.JsonRpcProvider(correctedUrl);
        const timeout = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Connection timeout after ${TIMEOUTS.RPC_VALIDATION / 1000} seconds`
                )
              ),
            TIMEOUTS.RPC_VALIDATION
          )
        );
        const network = await Promise.race([
          retryProvider.getNetwork(),
          timeout,
        ]);

        console.log(
          "✅ RPC validation successful with corrected region! Network:",
          network
        );
        return { isValid: true, correctedUrl };
      } catch (retryErr) {
        console.error("Retry with corrected region failed:", retryErr);
        return {
          isValid: false,
          error:
            retryErr instanceof Error
              ? retryErr.message
              : "Failed to connect with corrected region",
        };
      }
    }

    return { isValid: false, error: errorMessage };
  }
}

// Multicall ABI
const multicallAbi = [
  "function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)",
];

export function isValidEthereumAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

export async function isValidERC20(
  provider: ethers.JsonRpcProvider,
  address: string
): Promise<boolean> {
  if (!isValidEthereumAddress(address)) return false;

  // Special case: ETH address
  if (address === "0x0000000000000000000000000000000000000000") return false;

  try {
    const erc20Abi = [
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function balanceOf(address) view returns (uint256)",
    ];
    const contract = new ethers.Contract(address, erc20Abi, provider);

    // Try to call basic ERC20 functions with a timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), TIMEOUTS.TOKEN_VALIDATION)
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
  provider: ethers.JsonRpcProvider,
  address: string,
  tokenAddress?: string
): Promise<AddressBalances> {
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
      setTimeout(() => reject(new Error("Timeout")), TIMEOUTS.TOKEN_VALIDATION)
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
): Promise<BalanceInfo> {
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
      } catch {
        // Token might not be deployed on this network or doesn't implement ERC20 properly
        console.warn(
          `⚠️ Token ${token.symbol} (${token.address}) not available on this network - setting balance to 0`
        );
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
