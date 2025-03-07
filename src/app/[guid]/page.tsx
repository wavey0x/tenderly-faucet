import { redirect } from "next/navigation";
import { validateProvider } from "@/utils/faucet";
import { RPC_CONFIG } from "@/config/rpc";

const STORAGE_KEYS = {
  TENDERLY_URL: "tenderly-faucet-url",
  ERROR: "tenderly-faucet-error",
};

export default async function GuidPage({
  params,
}: {
  params: { guid: string };
}) {
  const rpcUrl = RPC_CONFIG.buildUrl(params.guid);

  try {
    const isValid = await validateProvider(rpcUrl);
    if (isValid) {
      // Store the valid RPC URL in a cookie instead of localStorage
      // This will be accessible on the client side
      const response = redirect("/");
      response.cookies.set(STORAGE_KEYS.TENDERLY_URL, rpcUrl, {
        path: "/",
        sameSite: "lax",
      });
      return response;
    }
  } catch (err) {
    let errorMessage = "Invalid RPC URL";
    if (err instanceof Error) {
      try {
        const info = JSON.parse(err.message.split("info=")[1] || "{}");
        if (info.responseBody) {
          const response = JSON.parse(info.responseBody);
          errorMessage = response.message || errorMessage;
        }
      } catch (e) {
        errorMessage = err.message;
      }
    }

    const response = redirect("/");
    response.cookies.set(STORAGE_KEYS.ERROR, errorMessage, {
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  // If we get here, the RPC was invalid
  const response = redirect("/");
  response.cookies.set(STORAGE_KEYS.ERROR, "Invalid RPC URL", {
    path: "/",
    sameSite: "lax",
  });
  return response;
}
