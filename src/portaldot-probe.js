import { performance } from "node:perf_hooks";
import WebSocket from "ws";

const DEFAULT_TIMEOUT_MS = 12_000;

function rpcError(method, message) {
  return new Error(`Portaldot RPC ${method}: ${message}`);
}

function request(socket, counter, method, params = [], timeoutMs = DEFAULT_TIMEOUT_MS) {
  const id = counter.next++;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(rpcError(method, "timed out")), timeoutMs);
    const onMessage = (raw) => {
      let response;
      try {
        response = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (response.id !== id) return;
      clearTimeout(timeout);
      socket.off("message", onMessage);
      if (response.error) {
        reject(rpcError(method, JSON.stringify(response.error)));
      } else {
        resolve(response.result);
      }
    };
    socket.on("message", onMessage);
    socket.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
  });
}

async function connect(endpoint, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!endpoint.startsWith("wss://") && !endpoint.startsWith("ws://")) {
    throw new Error("Portaldot endpoint must use ws:// or wss://");
  }
  const socket = new WebSocket(endpoint, { handshakeTimeout: timeoutMs });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Portaldot WebSocket connection timed out")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return socket;
}

/**
 * Read public chain state only. No fixture, cache, signer, or transaction is
 * involved; every field comes from the endpoint sampled for this request.
 */
export async function samplePortaldot(endpoint, { expectedGenesis, timeoutMs } = {}) {
  const started = performance.now();
  const observedAt = new Date().toISOString();
  const socket = await connect(endpoint, timeoutMs);
  const counter = { next: 1 };
  try {
    const [chain, nodeName, nodeVersion, health, genesisHash, finalizedHash, runtime] = await Promise.all([
      request(socket, counter, "system_chain", [], timeoutMs),
      request(socket, counter, "system_name", [], timeoutMs),
      request(socket, counter, "system_version", [], timeoutMs),
      request(socket, counter, "system_health", [], timeoutMs),
      request(socket, counter, "chain_getBlockHash", [0], timeoutMs),
      request(socket, counter, "chain_getFinalizedHead", [], timeoutMs),
      request(socket, counter, "state_getRuntimeVersion", [], timeoutMs),
    ]);
    const finalizedHeader = await request(socket, counter, "chain_getHeader", [finalizedHash], timeoutMs);
    const latencyMs = Math.round((performance.now() - started) * 100) / 100;
    const identityMatches = !expectedGenesis || genesisHash === expectedGenesis;
    return {
      schema: "atlas.portaldot.probe.v1",
      endpoint,
      observedAt,
      latencyMs,
      identityMatches,
      chain,
      nodeName,
      nodeVersion,
      health,
      genesisHash,
      finalizedHash,
      finalizedHeader,
      runtime: {
        specName: runtime?.specName,
        specVersion: runtime?.specVersion,
        transactionVersion: runtime?.transactionVersion,
      },
    };
  } finally {
    socket.close();
  }
}

export function assertUsableProbe(probe, expectedGenesis) {
  if (probe.schema !== "atlas.portaldot.probe.v1") throw new Error("Unexpected probe schema");
  if (!probe.genesisHash || !probe.finalizedHash || !probe.finalizedHeader?.number) {
    throw new Error("Probe is missing live chain evidence");
  }
  if (expectedGenesis && probe.genesisHash !== expectedGenesis) {
    throw new Error("Probe genesis does not match the expected Portaldot network");
  }
  if (probe.runtime.specName !== "portaldot") {
    throw new Error(`Unexpected runtime: ${probe.runtime.specName ?? "missing"}`);
  }
  return probe;
}
