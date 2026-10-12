import dotenv from "dotenv";
import { decodePaymentResponseHeader, wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const apiUrl = process.env.ATLAS_API_URL ?? "http://127.0.0.1:4030";
const privateKey = process.env.ATLAS_PAYER_PRIVATE_KEY ?? process.env.WAYFARE_AGENT_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Set ATLAS_PAYER_PRIVATE_KEY (or explicitly supply the existing test payer environment) before authorizing a paid probe.");
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
