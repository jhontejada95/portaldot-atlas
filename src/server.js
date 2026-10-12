import dotenv from "dotenv";
import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { assertUsableProbe, samplePortaldot } from "./portaldot-probe.js";
import { signProbeEvidence, verifyProbeEvidence } from "./signed-evidence.js";
import { appendLiveEvidence, recentLiveEvidence } from "./evidence-store.js";
import { assessIncident, reliabilityPolicyHash } from "./reliability-policy.js";
import { publicKeyForSentinel, registerSentinel } from "./sentinel-registry.js";
import { verifySentinelAttestation } from "./sentinel-attestation.js";
import { claimSentinelLink, createSentinelLink, createWalletChallenge, initializeWalletAuth, sentinelsForWallet, verifyWalletChallenge, walletForRequest, walletForSentinel } from "./wallet-auth.js";
import { databaseEnabled } from "./database.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const port = Number(process.env.PORT ?? process.env.ATLAS_PORT ?? 4030);
const payTo = process.env.ATLAS_PAY_TO;
const endpoint = process.env.ATLAS_PORTALDOT_ENDPOINT ?? "wss://mainnet.portaldot.io";
const expectedGenesis = process.env.ATLAS_EXPECTED_GENESIS;
const sentinelPrivateKey = process.env.ATLAS_SENTINEL_PRIVATE_KEY;
const network = process.env.ATLAS_NETWORK ?? "base-sepolia";
const networkId = network === "base-sepolia" ? "eip155:84532" : network;

if (!payTo || !/^0x[a-fA-F0-9]{40}$/.test(payTo) || /^0x0{40}$/i.test(payTo)) {
  throw new Error("ATLAS_PAY_TO must be a dedicated, non-zero EVM receiver. Refusing to start a fake x402 service.");
}
if (networkId !== "eip155:84532") {
  throw new Error("Atlas independent probes are pinned to Base Sepolia until a launch rail is explicitly authorized.");
}
if (!sentinelPrivateKey) {
  throw new Error("ATLAS_SENTINEL_PRIVATE_KEY is required; Atlas refuses to publish unsigned evidence.");
}

const app = express();
await initializeWalletAuth();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use((_request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.options(/.*/, (_request, response) => response.sendStatus(204));
const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const resourceServer = new x402ResourceServer(facilitator).register(networkId, new ExactEvmScheme());

app.get("/health", (_request, response) => {
  response.status(200).json({
    service: "portaldot-atlas",
    status: "ok",
    storage: databaseEnabled() ? "postgres" : "local-runtime",
    paidResource: "atlas.independent-probe.v1",
    endpoint,
    paymentNetwork: networkId,
    now: new Date().toISOString(),
  });
});

async function freshSignedObservation(kind) {
  const probe = assertUsableProbe(
    await samplePortaldot(endpoint, { expectedGenesis }),
    expectedGenesis,
  );
  const attestation = await signProbeEvidence(probe, sentinelPrivateKey);
  const signatureValid = await verifyProbeEvidence(probe, attestation);
  if (!signatureValid) throw new Error("Atlas refused an internally invalid evidence attestation.");
  return appendLiveEvidence(kind, { probe, attestation });
}

// Public monitoring data: always generated at request time from Portaldot.
app.get("/v1/network-status", async (_request, response, next) => {
  try {
    const record = await freshSignedObservation("public_network_status");
    response.status(200).json(record);
  } catch (error) {
    next(error);
  }
});

// The dashboard reads this journal; it contains only evidence created by live probes.
app.get("/v1/evidence/recent", async (request, response, next) => {
  try {
    const requested = Number(request.query.limit ?? 25);
    const records = (await recentLiveEvidence(100))
      .filter((record) => record.kind !== "client_sentinel_observation")
      .filter((record) => record.payload?.probe && record.payload?.attestation)
      .slice(0, Number.isFinite(requested) ? Math.max(1, Math.min(requested, 100)) : 25);
    response.status(200).json({ schema: "atlas.evidence-feed.v1", records });
  } catch (error) {
    next(error);
  }
});

// Exposes the current deterministic gate, not a claimed incident or a payment.
// Agent observations must re-verify before they can influence this response.
app.get("/v1/agent/status", async (_request, response, next) => {
  try {
    const records = await recentLiveEvidence(100);
    const verified = [];
    for (const record of records) {
      if (record.kind !== "agent_observation") continue;
      const observation = record.payload?.observation;
      const attestation = record.payload?.attestation;
      if (!observation || !attestation || !await verifyProbeEvidence(observation, attestation)) continue;
      verified.push({ ...observation, evidenceId: record.id, attestationDigest: attestation.digest, recordedAt: record.recordedAt });
    }
    const latest = verified.sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt))[0] ?? null;
    response.status(200).json({
      schema: "atlas.agent-status.v1",
      policyHash: reliabilityPolicyHash(),
      verifiedObservationCount: verified.length,
      latestObservation: latest ? {
        evidenceId: latest.evidenceId,
        observedAt: latest.observedAt,
        usable: latest.usable,
        signatureVerified: true,
      } : null,
      decision: assessIncident(verified),
      note: "This endpoint reports a deterministic gate. It does not initiate or settle an x402 payment.",
    });
  } catch (error) {
    next(error);
  }
});

app.post("/v1/auth/challenge", async (request, response) => {
  try {
    const origin = request.get("origin") ?? "atlas-local";
    response.status(201).json(await createWalletChallenge(request.body?.address, origin));
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/v1/auth/verify", async (request, response, next) => {
  try {
    const session = await verifyWalletChallenge(request.body ?? {});
    if (!session) return response.status(401).json({ error: "wallet_signature_invalid" });
    response.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/sentinel-links", async (request, response) => {
  const wallet = await walletForRequest(request);
  if (!wallet) return response.status(401).json({ error: "wallet_session_required" });
  response.status(201).json(await createSentinelLink(wallet));
});

app.post("/v1/sentinels/link", async (request, response) => {
  const { sentinelId, linkCode } = request.body ?? {};
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(sentinelId ?? "") || typeof linkCode !== "string") {
    return response.status(400).json({ error: "invalid_sentinel_link" });
  }
  const wallet = await claimSentinelLink(sentinelId, linkCode);
  if (!wallet) return response.status(410).json({ error: "sentinel_link_unavailable" });
  response.status(201).json({ sentinelId, wallet });
});

app.get("/v1/me/sentinels", async (request, response) => {
  const wallet = await walletForRequest(request);
  if (!wallet) return response.status(401).json({ error: "wallet_session_required" });
  response.status(200).json({ wallet, sentinelIds: await sentinelsForWallet(wallet) });
});

app.get("/v1/me/evidence", async (request, response, next) => {
  try {
    const wallet = await walletForRequest(request);
    if (!wallet) return response.status(401).json({ error: "wallet_session_required" });
    const records = (await recentLiveEvidence(100)).filter((record) => record.payload?.wallet === wallet);
    response.status(200).json({ wallet, records });
  } catch (error) {
    next(error);
  }
});

app.post("/v1/sentinels/register", async (request, response, next) => {
  try {
    const { sentinelId, publicKeyJwk } = request.body ?? {};
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(sentinelId ?? "") || !publicKeyJwk?.kty) {
      return response.status(400).json({ error: "invalid_sentinel_registration" });
    }
    const sentinel = await registerSentinel(sentinelId, publicKeyJwk);
    response.status(201).json({ sentinelId, registeredAt: sentinel.registeredAt });
  } catch (error) {
    if (error.message === "sentinel_identity_conflict") {
      return response.status(409).json({ error: error.message });
    }
    next(error);
  }
});

app.post("/v1/sentinel-observations", async (request, response, next) => {
  try {
    const envelope = request.body;
    const publicKeyJwk = await publicKeyForSentinel(envelope?.sentinelId);
    if (!publicKeyJwk) return response.status(404).json({ error: "unknown_sentinel" });
    const probe = assertUsableProbe(envelope.probe, expectedGenesis);
    const observedAt = Date.parse(envelope.observedAt);
    if (!Number.isFinite(observedAt) || Math.abs(Date.now() - observedAt) > 5 * 60 * 1000) {
      return response.status(400).json({ error: "stale_or_invalid_observation" });
    }
    if (!await verifySentinelAttestation(envelope, publicKeyJwk)) {
      return response.status(401).json({ error: "invalid_sentinel_signature" });
    }
    const record = await appendLiveEvidence("client_sentinel_observation", {
      sentinelId: envelope.sentinelId,
      wallet: await walletForSentinel(envelope.sentinelId),
      observedAt: envelope.observedAt,
      probe,
      attestation: {
        scheme: "webcrypto-p256-sha256-v1",
        signature: envelope.signature,
        publicKeyJwk,
      },
    });
    response.status(201).json({ accepted: true, evidenceId: record.id, recordedAt: record.recordedAt });
  } catch (error) {
    next(error);
  }
});

app.use(paymentMiddleware({
  "GET /v1/independent-probe": {
    accepts: [{
      scheme: "exact",
      price: "$0.001",
      network: networkId,
      payTo,
      maxTimeoutSeconds: 120,
    }],
    description: "A fresh, live, read-only Portaldot endpoint probe for independent incident corroboration.",
  },
}, resourceServer));

app.get("/v1/independent-probe", async (_request, response, next) => {
  try {
    const record = await freshSignedObservation("paid_independent_probe");
    response.status(200).json({
      resource: "atlas.independent-probe.v1",
      evidence: record,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(502).json({ error: "live_probe_unavailable", message: error.message });
});

app.listen(port, () => {
  console.log(`Atlas x402 independent-probe server listening on http://127.0.0.1:${port}`);
});
