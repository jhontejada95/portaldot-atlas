import dotenv from "dotenv";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const apiUrl = process.env.ATLAS_API_URL ?? "http://127.0.0.1:4030";
const expectedNetwork = "eip155:84532";

function decodeBase64UrlJson(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

const response = await fetch(new URL("/v1/independent-probe", apiUrl), {
  headers: { accept: "application/json" },
});
const encodedRequirement = response.headers.get("PAYMENT-REQUIRED");

if (response.status !== 402) {
  throw new Error(`Expected an unpaid 402 challenge, received ${response.status}.`);
}
if (!encodedRequirement) {
  throw new Error("The 402 response did not include PAYMENT-REQUIRED.");
}

const requirement = decodeBase64UrlJson(encodedRequirement);
const offer = requirement.accepts?.[0];
if (requirement.x402Version !== 2 || requirement.error !== "Payment required") {
  throw new Error("The endpoint did not return an x402 v2 payment requirement.");
}
if (offer?.scheme !== "exact" || offer.network !== expectedNetwork || offer.amount !== "1000") {
  throw new Error("The endpoint payment requirement differs from Atlas's Base Sepolia exact-price policy.");
}
if (!/^0x[a-fA-F0-9]{40}$/.test(offer.payTo ?? "") || /^0x0{40}$/i.test(offer.payTo)) {
  throw new Error("The x402 receiver is missing or zeroed.");
}

console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(),
  status: response.status,
  x402Version: requirement.x402Version,
  resource: requirement.resource?.url,
  scheme: offer.scheme,
  network: offer.network,
  amount: offer.amount,
  asset: offer.asset,
  payTo: offer.payTo,
}, null, 2));
