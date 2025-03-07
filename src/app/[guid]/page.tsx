import { validateProvider } from "@/utils/faucet";
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
  const { guid } = await params;
  const rpcUrl = RPC_CONFIG.buildUrl(guid);

  try {
    const isValid = await validateProvider(rpcUrl);
    if (isValid) {
      // Store the valid RPC URL in a cookie instead of localStorage
      // This will be accessible on the client side
      const response = NextResponse.redirect(
        new URL(
          "/",
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        )
      );
      response.cookies.set(STORAGE_KEYS.TENDERLY_URL, rpcUrl, {
        path: "/",
        sameSite: "lax",
      });
      return response;
    }
  } catch (error) {
    let errorMessage = "Invalid RPC URL";
    if (error instanceof Error) {
      try {
        const info = JSON.parse(error.message.split("info=")[1] || "{}");
        if (info.responseBody) {
          const response = JSON.parse(info.responseBody);
          errorMessage = response.message || errorMessage;
        }
      } catch {
        errorMessage = error.message;
      }
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

  // If we get here, the RPC was invalid
  const response = NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
  );
  response.cookies.set(STORAGE_KEYS.ERROR, "Invalid RPC URL", {
    path: "/",
    sameSite: "lax",
  });
  return response;
}
