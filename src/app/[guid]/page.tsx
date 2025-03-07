import { RPC_CONFIG } from "@/config/rpc";
import { NextResponse } from "next/server";

const STORAGE_KEYS = {
  TENDERLY_URL: "tenderly-faucet-url",
  ERROR: "tenderly-faucet-error",
};

export default async function GuidPage({
  params,
}: {
  params: Promise<{ guid: string }>;
}) {
  try {
    const { guid } = await params;
    if (!guid || typeof guid !== "string") {
      throw new Error("Invalid GUID");
    }

    const rpcUrl = RPC_CONFIG.buildUrl(guid);
    if (!rpcUrl.startsWith("http")) {
      throw new Error("Invalid RPC URL format");
    }

    const response = NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
    );
    response.cookies.set(STORAGE_KEYS.TENDERLY_URL, rpcUrl, {
      path: "/",
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    let errorMessage = "Invalid RPC URL";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    const response = NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
    );
    response.cookies.set(STORAGE_KEYS.ERROR, errorMessage, {
      path: "/",
      sameSite: "lax",
    });
    return response;
  }
}
