const $ = (selector) => document.querySelector(selector);
const defaults = { backendUrl: "https://portaldot-atlas-api.onrender.com", intervalMinutes: 15, enabled: false, theme: "system" };

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function setMessage(message, tone = "") {
  const target = $("#message");
  target.textContent = message;
  target.className = `message ${tone}`;
}

function setBusy(busy) {
  $("#save").disabled = busy;
  $("#link").disabled = busy;
  $("#run").disabled = busy;
  $("#repairIdentity").disabled = busy;
}

function avatarVariant(sentinelId = "atlas") {
  return [...sentinelId].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7) % 5;
}

function shortWallet(address) {
  if (typeof address !== "string" || !address) return "";
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-6)}` : address;
}

function applyTheme(preference = "system") {
  const resolved = preference === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = resolved;
  const next = resolved === "dark" ? "light" : "dark";
  $("#themeIcon").textContent = resolved === "dark" ? "☀" : "☾";
  $("#themeToggle").setAttribute("aria-label", `Switch to ${next} mode`);
  $("#themeToggle").setAttribute("title", `Switch to ${next} mode`);
  return resolved;
}

function showIdentityRepair(show) {
  $("#repairIdentity").hidden = !show;
}

function resultMessage(result, fallback) {
  if (result?.code === "sentinel_identity_conflict") {
    showIdentityRepair(true);
    return "This device ID is already registered with another local key. Create a new device identity, then link your wallet again.";
  }
  return result?.error ?? fallback;
}

async function render() {
  const status = await send({ type: "atlas.status" });
  $("#backendUrl").value = status.backendUrl ?? defaults.backendUrl;
  $("#backendState").textContent = (status.backendUrl ?? defaults.backendUrl) === defaults.backendUrl ? "Official endpoint" : "Custom endpoint";
  $("#intervalMinutes").value = String(status.intervalMinutes ?? defaults.intervalMinutes);
  $("#enabled").checked = Boolean(status.enabled);
  $("#linkCode").value = status.linkCode ?? "";
  const recovering = Boolean(status.needsFreshLink);
  $("#recovery").hidden = !recovering;
  $("#profileAvatar").dataset.variant = String(avatarVariant(status.sentinelId));
  $("#profileAvatar").setAttribute("aria-label", "A stable local avatar generated from this Sentinel's device identity");
  $("#identityTitle").textContent = recovering ? "Reconnect Sentinel" : status.linkedWallet ? "Hello, explorer" : "Your Sentinel";
  $("#connectionState").textContent = recovering ? "New code needed" : status.linkedWallet ? "Connected" : "Not linked";
  $("#connectionState").className = `connection-state ${status.linkedWallet && !recovering ? "connected" : ""}`;
  $("#linkedWallet").hidden = !status.linkedWallet;
  $("#linkedWallet").textContent = status.linkedWallet ? `Wallet ${shortWallet(status.linkedWallet)}` : "";
  applyTheme(status.theme ?? defaults.theme);
  const live = Boolean(status.enabled && status.lastCheck && !status.lastError);
  $("#state").textContent = live ? "Active" : status.enabled ? "Needs attention" : "Paused";
  $("#state").className = `state ${live ? "live" : status.enabled ? "attention" : ""}`;
  if (status.lastCheck) {
    $("#latest").textContent = `Accepted ${formatTime(status.lastCheck.observedAt)}`;
    $("#detail").textContent = `Evidence ${status.lastCheck.evidenceId ?? "—"} · ${status.lastCheck.latencyMs ?? "—"} ms`;
  } else {
    $("#latest").textContent = "No evidence accepted yet";
    $("#detail").textContent = status.lastError ? `Last error: ${status.lastError}` : "Enable checks, then run a first live observation.";
  }
  showIdentityRepair(status.lastErrorCode === "sentinel_identity_conflict");
}

$("#save").addEventListener("click", async () => {
  const backendUrl = $("#backendUrl").value.trim();
  if (!/^https?:\/\//.test(backendUrl)) return setMessage("Enter a valid HTTP or HTTPS backend URL.", "error");
  setBusy(true);
  const result = await send({ type: "atlas.configure", config: { backendUrl, intervalMinutes: Number($("#intervalMinutes").value), linkCode: $("#linkCode").value.trim(), enabled: $("#enabled").checked } });
  setBusy(false);
  setMessage(result?.ok ? "Settings saved locally." : "Settings could not be saved.", result?.ok ? "success" : "error");
  await render();
});

$("#link").addEventListener("click", async () => {
  const linkCode = $("#linkCode").value.trim();
  if (!/^atlas-[a-z0-9]{12}$/i.test(linkCode)) return setMessage("Generate a valid Atlas link code in the dashboard first.", "error");
  setBusy(true);
  const result = await send({ type: "atlas.link-wallet", linkCode });
  setBusy(false);
  setMessage(result?.linked ? "Wallet linked to this Sentinel." : resultMessage(result, "The wallet link could not be completed."), result?.linked ? "success" : "error");
  await render();
});

$("#run").addEventListener("click", async () => {
  if (!$("#enabled").checked) return setMessage("Enable scheduled checks and save before running a live observation.", "error");
  setBusy(true);
  setMessage("Contacting Portaldot and submitting signed evidence…");
  const result = await send({ type: "atlas.run-now" });
  setBusy(false);
  if (result?.accepted) setMessage(`Evidence accepted: ${result.evidenceId}`, "success");
  else setMessage(resultMessage(result, result?.skipped ?? "The live check did not produce an accepted observation."), "error");
  await render();
});

$("#repairIdentity").addEventListener("click", async () => {
  setBusy(true);
  const result = await send({ type: "atlas.repair-identity" });
  setBusy(false);
  if (result?.ok) setMessage("New device identity ready. Generate a fresh code in Atlas Dashboard, paste it here, then link your wallet.", "success");
  else setMessage(resultMessage(result, "The device identity could not be repaired."), "error");
  await render();
});

$("#themeToggle").addEventListener("click", async () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const theme = current === "dark" ? "light" : "dark";
  applyTheme(theme);
  await send({ type: "atlas.configure", config: { theme } });
});

render();
