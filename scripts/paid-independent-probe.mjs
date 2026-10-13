import dotenv from "dotenv";
import { decodePaymentResponseHeader, wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const apiUrl = process.env.ATLAS_API_URL ?? "http://127.0.0.1:4030";
const expectedPayTo = process.env.ATLAS_EXPECTED_X402_PAY_TO;
const privateKey = process.env.ATLAS_PAYER_PRIVATE_KEY ?? process.env.WAYFARE_AGENT_PRIVATE_KEY;
const confirmation = process.env.ATLAS_PAID_PROBE_CONFIRMATION;

function decodeBase64UrlJson(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

if (confirmation !== "approve-atlas-x402-once") {
  throw new Error("Refusing paid probe. Set ATLAS_PAID_PROBE_CONFIRMATION=approve-atlas-x402-once only for one explicitly authorized payment.");
}
if (!/^0x[a-fA-F0-9]{40}$/.test(expectedPayTo ?? "") || /^0x0{40}$/i.test(expectedPayTo)) {
  throw new Error("Set ATLAS_EXPECTED_X402_PAY_TO to the already-reviewed, non-zero Base Sepolia receiver before authorizing a payment.");
}
if (!privateKey) {
  throw new Error("Set ATLAS_PAYER_PRIVATE_KEY only after explicitly authorizing this paid probe.");
}

const challenge = await fetch(new URL("/v1/independent-probe", apiUrl), { headers: { accept: "application/json" } });
const encodedRequirement = challenge.headers.get("PAYMENT-REQUIRED");
if (challenge.status !== 402 || !encodedRequirement) {
  throw new Error(`Expected an unpaid x402 challenge before payment, received HTTP ${challenge.status}.`);
}
const requirement = decodeBase64UrlJson(encodedRequirement);
const offer = requirement.accepts?.[0];
if (
  requirement.x402Version !== 2
  || offer?.scheme !== "exact"
  || offer.network !== "eip155:84532"
  || offer.amount !== "1000"
  || offer.payTo?.toLowerCase() !== expectedPayTo.toLowerCase()
) {
  throw new Error("The live x402 offer differs from Atlas's reviewed Base Sepolia exact-price policy; payment was not attempted.");
}

const account = privateKeyToAccount(privateKey);
const paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:84532", client: new ExactEvmScheme(account) }],
});

const response = await paidFetch(new URL("/v1/independent-probe", apiUrl), {
  method: "GET",
  headers: { accept: "application/json" },
});
const paymentHeader = response.headers.get("PAYMENT-RESPONSE");
const body = await response.json();

console.log(JSON.stringify({
  status: response.status,
  payer: account.address,
  payment: paymentHeader ? decodePaymentResponseHeader(paymentHeader) : null,
  body,
}, null, 2));

if (!response.ok) process.exitCode = 1;
