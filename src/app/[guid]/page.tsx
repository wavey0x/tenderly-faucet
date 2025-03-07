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
  params: { guid: string };
}) {
  try {
    const rpcUrl = RPC_CONFIG.buildUrl(params.guid);
    const isValid = await validateProvider(rpcUrl);

    if (isValid) {
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

    // If we get here, the RPC was invalid
    const response = NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
    );
    response.cookies.set(STORAGE_KEYS.ERROR, "Invalid RPC URL", {
      path: "/",
      sameSite: "lax",
    });
    return response;
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
}
