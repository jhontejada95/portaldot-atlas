import dotenv from "dotenv";
import { samplePortaldot } from "../src/portaldot-probe.js";
import { canonicalSentinelPayload } from "../src/sentinel-attestation.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const apiUrl = process.env.ATLAS_API_URL ?? "http://127.0.0.1:4030";
const endpoint = process.env.ATLAS_PORTALDOT_ENDPOINT ?? "wss://mainnet.portaldot.io";
const expectedGenesis = process.env.ATLAS_EXPECTED_GENESIS;
const sentinelId = `test-${crypto.randomUUID().replaceAll("-", "")}`;
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publicKeyJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

async function post(path, body) {
  const response = await fetch(new URL(path, apiUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseBody = await response.json();
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(responseBody)}`);
  return responseBody;
}

const registration = await post("/v1/sentinels/register", { sentinelId, publicKeyJwk });
const probe = await samplePortaldot(endpoint, { expectedGenesis });
const observedAt = new Date().toISOString();
const signatureBuffer = await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" },
  pair.privateKey,
  new TextEncoder().encode(canonicalSentinelPayload({ sentinelId, observedAt, probe })),
);
const signature = Buffer.from(signatureBuffer).toString("base64url");
const accepted = await post("/v1/sentinel-observations", { sentinelId, observedAt, probe, signature });

console.log(JSON.stringify({
  registration,
  accepted,
  endpoint: probe.endpoint,
  finalizedBlock: probe.finalizedHeader.number,
  latencyMs: probe.latencyMs,
  signatureScheme: "webcrypto-p256-sha256-v1",
}, null, 2));
