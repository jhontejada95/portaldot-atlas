const $ = (selector) => document.querySelector(selector);
const defaults = { backendUrl: "https://portaldot-atlas-api.onrender.com", intervalMinutes: 15, enabled: false };

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
}

async function render() {
  const status = await send({ type: "atlas.status" });
  $("#backendUrl").value = status.backendUrl ?? defaults.backendUrl;
  $("#intervalMinutes").value = String(status.intervalMinutes ?? defaults.intervalMinutes);
  $("#enabled").checked = Boolean(status.enabled);
  $("#linkCode").value = status.linkCode ?? "";
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
  setMessage(result?.linked ? "Wallet linked to this Sentinel." : result?.error ?? "The wallet link could not be completed.", result?.linked ? "success" : "error");
  await render();
});

$("#run").addEventListener("click", async () => {
  if (!$("#enabled").checked) return setMessage("Enable scheduled checks and save before running a live observation.", "error");
  setBusy(true);
  setMessage("Contacting Portaldot and submitting signed evidence…");
  const result = await send({ type: "atlas.run-now" });
  setBusy(false);
  if (result?.accepted) setMessage(`Evidence accepted: ${result.evidenceId}`, "success");
  else setMessage(result?.error ?? result?.skipped ?? "The live check did not produce an accepted observation.", "error");
  await render();
});

render();
