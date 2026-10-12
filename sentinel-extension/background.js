const DEFAULTS = {
  enabled: false,
  intervalMinutes: 15,
  endpoint: "wss://mainnet.portaldot.io",
  backendUrl: "https://portaldot-atlas-api.onrender.com",
  linkCode: "",
  expectedGenesis: "0x83b5212c69f85f3996f8696bb35bf913af51b176a5f53d0a74fd3a83dc0b8a54",
};
const ALARM_NAME = "atlas-sentinel-check";

function base64Url(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function canonicalEnvelope({ sentinelId, observedAt, probe }) {
  return JSON.stringify({ sentinelId, observedAt, probe });
}

async function configuration() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) };
}

async function identity() {
  const stored = await chrome.storage.local.get(["sentinelId", "sentinelPublicJwk", "sentinelPrivateJwk"]);
  if (stored.sentinelId && stored.sentinelPublicJwk && stored.sentinelPrivateJwk) return stored;
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const created = {
    sentinelId: crypto.randomUUID().replaceAll("-", ""),
    sentinelPublicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
    sentinelPrivateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
  await chrome.storage.local.set(created);
  return created;
}

function conflictError() {
  const error = new Error("This Sentinel ID is already registered with a different device key.");
  error.code = "sentinel_identity_conflict";
  return error;
}

async function registerDevice(config, device) {
  const response = await fetch(new URL("/v1/sentinels/register", config.backendUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sentinelId: device.sentinelId, publicKeyJwk: device.sentinelPublicJwk }),
  });
  if (response.status === 409) throw conflictError();
  if (!response.ok) throw new Error(`Sentinel registration failed: ${response.status}`);
}

async function repairIdentity() {
  await chrome.storage.local.remove(["sentinelId", "sentinelPublicJwk", "sentinelPrivateJwk", "linkedWallet", "linkCode", "lastCheck", "lastError", "lastErrorCode"]);
  await chrome.storage.local.set({ enabled: false });
  await chrome.alarms.clear(ALARM_NAME);
  const device = await identity();
  return { ok: true, sentinelId: device.sentinelId };
}

function responseError(error) {
  return { error: error.message ?? "Unexpected Sentinel error", code: error.code ?? "unknown_error" };
}

function openRpc(endpoint) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(endpoint);
    const pending = new Map();
    let sequence = 0;
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Portaldot WebSocket connection timed out"));
    }, 12_000);
    socket.onopen = () => {
      clearTimeout(timeout);
      resolve({
        call(method, params = []) {
          return new Promise((resolveCall, rejectCall) => {
            const id = ++sequence;
            pending.set(id, { resolve: resolveCall, reject: rejectCall });
            socket.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
          });
        },
        close() { socket.close(); },
      });
    };
    socket.onerror = () => reject(new Error("Portaldot WebSocket connection failed"));
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      const callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result);
    };
  });
}

async function samplePortaldot(endpoint, expectedGenesis) {
  const started = performance.now();
  const rpc = await openRpc(endpoint);
  try {
    const [chain, nodeName, nodeVersion, health, genesisHash, finalizedHash, runtime] = await Promise.all([
      rpc.call("system_chain"), rpc.call("system_name"), rpc.call("system_version"),
      rpc.call("system_health"), rpc.call("chain_getBlockHash", [0]),
      rpc.call("chain_getFinalizedHead"), rpc.call("state_getRuntimeVersion"),
    ]);
    const finalizedHeader = await rpc.call("chain_getHeader", [finalizedHash]);
    if (genesisHash !== expectedGenesis || runtime?.specName !== "portaldot") {
      throw new Error("The extension refused an unexpected Portaldot network identity");
    }
    return {
      schema: "atlas.portaldot.probe.v1",
      endpoint,
      observedAt: new Date().toISOString(),
      latencyMs: Number((performance.now() - started).toFixed(2)),
      identityMatches: true,
      chain,
      nodeName,
      nodeVersion,
      health,
      genesisHash,
      finalizedHash,
      finalizedHeader,
      runtime: {
        specName: runtime.specName,
        specVersion: runtime.specVersion,
        transactionVersion: runtime.transactionVersion,
      },
    };
  } finally {
    rpc.close();
  }
}

async function registerAndSubmit() {
  const config = await configuration();
  if (!config.enabled) return { skipped: "sentinel_paused" };
  const device = await identity();
  await registerDevice(config, device);
  const probe = await samplePortaldot(config.endpoint, config.expectedGenesis);
  const observedAt = new Date().toISOString();
  const privateKey = await crypto.subtle.importKey(
    "jwk", device.sentinelPrivateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
  );
  const signature = base64Url(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, privateKey,
    new TextEncoder().encode(canonicalEnvelope({ sentinelId: device.sentinelId, observedAt, probe })),
  ));
  const submit = await fetch(new URL("/v1/sentinel-observations", config.backendUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sentinelId: device.sentinelId, observedAt, probe, signature }),
  });
  if (!submit.ok) throw new Error(`Sentinel evidence rejected: ${submit.status}`);
  const accepted = await submit.json();
  await chrome.storage.local.set({ lastCheck: { ...accepted, observedAt, latencyMs: probe.latencyMs } });
  return accepted;
}

async function linkWallet(linkCode) {
  const config = await configuration();
  const device = await identity();
  await registerDevice(config, device);
  const response = await fetch(new URL("/v1/sentinels/link", config.backendUrl), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ sentinelId: device.sentinelId, linkCode }),
  });
  if (!response.ok) throw new Error("Atlas link code was unavailable or expired");
  await chrome.storage.local.set({ linkCode, linkedWallet: (await response.json()).wallet });
  return { linked: true };
}

async function schedule() {
  const config = await configuration();
  await chrome.alarms.clear(ALARM_NAME);
  if (config.enabled) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: Math.max(1, config.intervalMinutes) });
  }
}

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) registerAndSubmit().catch((error) => chrome.storage.local.set({ lastError: error.message, lastErrorCode: error.code ?? "unknown_error" }));
});
chrome.action.onClicked.addListener(() => registerAndSubmit().catch((error) => chrome.storage.local.set({ lastError: error.message, lastErrorCode: error.code ?? "unknown_error" })));
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "atlas.configure") {
    chrome.storage.local.set(message.config).then(schedule).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "atlas.run-now") {
    registerAndSubmit().then(async (result) => {
      await chrome.storage.local.remove(["lastError", "lastErrorCode"]);
      sendResponse(result);
    }).catch(async (error) => {
      const result = responseError(error);
      await chrome.storage.local.set({ lastError: result.error, lastErrorCode: result.code });
      sendResponse(result);
    });
    return true;
  }
  if (message?.type === "atlas.link-wallet") {
    linkWallet(message.linkCode).then(async (result) => {
      await chrome.storage.local.remove(["lastError", "lastErrorCode"]);
      sendResponse(result);
    }).catch(async (error) => {
      const result = responseError(error);
      await chrome.storage.local.set({ lastError: result.error, lastErrorCode: result.code });
      sendResponse(result);
    });
    return true;
  }
  if (message?.type === "atlas.repair-identity") {
    repairIdentity().then(sendResponse).catch((error) => sendResponse(responseError(error)));
    return true;
  }
  if (message?.type === "atlas.status") {
    chrome.storage.local.get(["lastCheck", "lastError", "lastErrorCode", "enabled", "intervalMinutes", "backendUrl", "sentinelId", "linkCode", "linkedWallet", "theme"]).then(sendResponse);
    return true;
  }
});
