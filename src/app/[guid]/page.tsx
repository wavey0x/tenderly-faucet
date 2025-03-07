import { RPC_CONFIG } from "@/config/rpc";
import { NextResponse } from "next/server";

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

    // Redirect with the RPC URL as a search param
    const baseUrl = new URL(
      "/",
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    );
    baseUrl.searchParams.set("rpc", rpcUrl);

    return NextResponse.redirect(baseUrl);
  } catch (error) {
    let errorMessage = "Invalid RPC URL";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    const baseUrl = new URL(
      "/",
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    );
    baseUrl.searchParams.set("error", errorMessage);

    return NextResponse.redirect(baseUrl);
  }
}
