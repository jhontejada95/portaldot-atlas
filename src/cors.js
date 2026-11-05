import { assertWalletAuthOrigin } from "./wallet-auth.js";

/**
 * Browser access to the API is limited to the same dashboard origins that may
 * request a wallet challenge. Extension background requests use host
 * permissions and do not need a permissive web-page CORS policy.
 */
export function allowedCorsHeaders(origin) {
  if (!origin) return null;
  try {
    const allowedOrigin = assertWalletAuthOrigin(origin);
    return {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    };
  } catch {
    return null;
  }
}

export function applyAtlasCors(request, response, next) {
  const headers = allowedCorsHeaders(request.get("origin"));
  if (headers) {
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  }
  next();
}
