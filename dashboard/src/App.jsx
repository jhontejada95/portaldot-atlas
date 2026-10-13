import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { web3Accounts, web3AccountsSubscribe, web3Enable, web3FromSource } from "@polkadot/extension-dapp";
import { stringToHex } from "@polkadot/util";
import { verifyEvidenceRecord } from "./verify-evidence.js";
import { atlasApi } from "./api.js";

const navigation = [
  ["overview", "Overview", "fa-table-columns"],
  ["sentinel", "My Sentinel", "fa-satellite-dish"],
  ["evidence", "Evidence", "fa-fingerprint"],
  ["credits", "Contribution Progress", "fa-route"],
  ["alerts", "Alerts", "fa-bell"],
  ["download", "Download Sentinel", "fa-download"],
  ["settings", "Settings", "fa-sliders"],
];
const WALLET_SESSION_KEY = "atlas-wallet-session";

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function shortHash(value, width = 10) {
  if (!value || typeof value !== "string") return "—";
  return value.length > width * 2 ? `${value.slice(0, width)}…${value.slice(-6)}` : value;
}

function statusTone(mode) {
  if (mode === "live") return "is-live";
  if (mode === "error") return "is-error";
  return "is-pending";
}

function avatarVariant(value) {
  const palette = ["orbit", "signal", "horizon", "relay"];
  const hash = [...String(value ?? "atlas-explorer")].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
  return palette[hash % palette.length];
}

function Field({ label, value, mono = false }) {
  return <div className="field"><span>{label}</span><strong className={mono ? "mono" : ""}>{value ?? "—"}</strong></div>;
}

function EmptyState({ icon, title, children }) {
  return <div className="empty-state"><i className={`fa-solid ${icon}`} aria-hidden="true" /><h3>{title}</h3><p>{children}</p></div>;
}

export function App() {
  const [active, setActive] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("view");
    return navigation.some(([id]) => id === requested) ? requested : "overview";
  });
  const [network, setNetwork] = useState(null);
  const [records, setRecords] = useState([]);
  const [agentStatus, setAgentStatus] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem("atlas-auto-refresh") === "true");
  const [walletSession, setWalletSession] = useState(null);
  const walletSessionRef = useRef(null);
  const walletSubscriptionRef = useRef(null);
  const [walletError, setWalletError] = useState("");
  const [walletAccessOpen, setWalletAccessOpen] = useState(false);
  const [personalEvidence, setPersonalEvidence] = useState([]);
  const [linkedSentinels, setLinkedSentinels] = useState([]);
  const [sentinelRuntime, setSentinelRuntime] = useState({ state: "unknown" });
  const [sentinelLink, setSentinelLink] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("atlas-theme") ?? "system");
  const [profileOpen, setProfileOpen] = useState(false);
  const [verification, setVerification] = useState({});

  const refresh = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const response = await fetch(atlasApi("/v1/network-status"), { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Live Portaldot check was unavailable (${response.status}).`);
      const observation = await response.json();
      const evidenceResponse = await fetch(atlasApi("/v1/evidence/recent?limit=25"), { headers: { accept: "application/json" } });
      if (!evidenceResponse.ok) throw new Error(`Evidence journal was unavailable (${evidenceResponse.status}).`);
      const evidence = await evidenceResponse.json();
      const agentResponse = await fetch(atlasApi("/v1/agent/status"), { headers: { accept: "application/json" } });
      setNetwork(observation);
      setRecords(Array.isArray(evidence.records) ? evidence.records : []);
      setAgentStatus(agentResponse.ok ? await agentResponse.json() : null);
      setUpdatedAt(new Date().toISOString());
      setState("live");
    } catch (requestError) {
      setState("error");
      setError(requestError instanceof Error ? requestError.message : "The live check could not be completed.");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  const clearWalletSession = useCallback(async (session, { revoke = true, prompt = false, message = "" } = {}) => {
    const unsubscribe = walletSubscriptionRef.current;
    walletSubscriptionRef.current = null;
    unsubscribe?.();
    sessionStorage.removeItem(WALLET_SESSION_KEY);
    walletSessionRef.current = null;
    setWalletSession(null);
    setPersonalEvidence([]);
    setLinkedSentinels([]);
    setSentinelLink(null);
    setProfileOpen(false);
    if (prompt) {
      setWalletError(message);
      setWalletAccessOpen(true);
    }
    if (revoke && session?.accessToken) {
      try {
        await fetch(atlasApi("/v1/auth/logout"), { method: "POST", headers: { authorization: `Bearer ${session.accessToken}` } });
      } catch {
        // Local data has already been cleared. A failed network revocation never preserves private UI state.
      }
    }
  }, []);
  const watchWalletAccess = useCallback(async (session) => {
    const previous = walletSubscriptionRef.current;
    walletSubscriptionRef.current = null;
    previous?.();
    try {
      walletSubscriptionRef.current = await web3AccountsSubscribe((accounts) => {
        if (accounts.some((account) => account.address === session.address)) return;
        clearWalletSession(session, {
          prompt: true,
          message: "SubWallet stopped sharing this wallet with Atlas. Reconnect before viewing your private Sentinel information.",
        });
      });
    } catch {
      // Account subscriptions are optional across compatible wallets. The current session remains usable until the page reloads or the API rejects it.
    }
  }, [clearWalletSession]);
  const performWalletConnection = useCallback(async () => {
    setWalletError("");
    try {
      const extensions = await web3Enable("Portaldot Atlas");
      if (!extensions.length) throw new Error("Approve Atlas in SubWallet, then try again.");
      const [account] = await web3Accounts();
      if (!account) throw new Error("No Substrate account was shared with Atlas.");
      const challengeResponse = await fetch(atlasApi("/v1/auth/challenge"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: account.address }) });
      if (!challengeResponse.ok) throw new Error("Atlas could not create a wallet challenge.");
      const challenge = await challengeResponse.json();
      const injector = await web3FromSource(account.meta.source);
      if (!injector.signer.signRaw) throw new Error("This wallet cannot sign the Atlas login message.");
      const { signature } = await injector.signer.signRaw({ address: account.address, data: stringToHex(challenge.message), type: "bytes" });
      const verifyResponse = await fetch(atlasApi("/v1/auth/verify"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challengeId: challenge.challengeId, address: account.address, signature }) });
      if (!verifyResponse.ok) throw new Error("Atlas could not verify the wallet signature.");
      const session = await verifyResponse.json();
      sessionStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(session));
      walletSessionRef.current = session;
      setWalletSession(session);
      setWalletAccessOpen(false);
      await watchWalletAccess(session);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }, [watchWalletAccess]);
  const connectWallet = () => {
    setWalletError("");
    setWalletAccessOpen(true);
  };
  const authFetch = useCallback(async (path, options = {}) => {
    const response = await fetch(atlasApi(path), { ...options, headers: { ...(options.headers ?? {}), authorization: `Bearer ${walletSession?.accessToken}` } });
    if (response.status === 401) {
      await clearWalletSession(walletSession, {
        revoke: false,
        prompt: true,
        message: "Your Atlas wallet session ended. Reconnect your wallet before viewing private Sentinel information.",
      });
    }
    return response;
  }, [clearWalletSession, walletSession]);
  const refreshPersonal = useCallback(async () => {
    if (!walletSession?.accessToken) {
      setPersonalEvidence([]);
      setLinkedSentinels([]);
      return;
    }
    const [evidenceResponse, sentinelsResponse] = await Promise.all([authFetch("/v1/me/evidence"), authFetch("/v1/me/sentinels")]);
    if (walletSessionRef.current?.accessToken !== walletSession.accessToken) return;
    if (evidenceResponse.ok) setPersonalEvidence((await evidenceResponse.json()).records ?? []);
    if (sentinelsResponse.ok) {
      const sentinelIds = (await sentinelsResponse.json()).sentinelIds ?? [];
      setLinkedSentinels(sentinelIds);
      if (sentinelIds.length) setSentinelLink(null);
    }
  }, [authFetch, walletSession]);
  useEffect(() => { refreshPersonal().catch(() => setPersonalEvidence([])); }, [refreshPersonal]);
  const requestSentinelRuntime = useCallback((walletAddress) => new Promise((resolve) => {
    if (!walletAddress) return resolve({ state: "unknown" });
    const requestId = crypto.randomUUID();
    let settled = false;
    const finish = (nextState) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.removeEventListener("atlas-sentinel-status-response", receiveStatus);
      resolve(nextState);
    };
    const receiveStatus = (event) => {
      const detail = event.detail;
      if (detail?.source !== "portaldot-atlas-sentinel" || detail?.requestId !== requestId) return;
      finish({ state: "detected", linkedToWallet: Boolean(detail.linkedToWallet), enabled: Boolean(detail.enabled), version: detail.version ?? "unknown" });
    };
    window.addEventListener("atlas-sentinel-status-response", receiveStatus);
    const timeout = window.setTimeout(() => finish({ state: "not_detected" }), 900);
    window.dispatchEvent(new CustomEvent("atlas-sentinel-status-request", { detail: { requestId, walletAddress } }));
  }), []);
  useEffect(() => {
    if (!walletSession?.address) {
      setSentinelRuntime({ state: "unknown" });
      return undefined;
    }
    let cancelled = false;
    const inspectSentinel = async () => {
      const nextState = await requestSentinelRuntime(walletSession.address);
      if (!cancelled) setSentinelRuntime(nextState);
    };
    inspectSentinel();
    const timer = window.setInterval(inspectSentinel, 10_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [requestSentinelRuntime, walletSession?.address]);
  useEffect(() => {
    let storedSession = null;
    try { storedSession = JSON.parse(sessionStorage.getItem(WALLET_SESSION_KEY) ?? "null"); } catch { storedSession = null; }
    if (!storedSession?.accessToken || !storedSession?.address) return undefined;
    let cancelled = false;
    // The Polkadot wallet API requires web3Enable before it may list accounts.
    // Calling it here would re-open a permission request after the user has revoked Atlas.
    // A same-tab session therefore resumes without a wallet prompt; explicit disconnect,
    // expiry, an API 401, and the active-session account subscription still revoke it.
    if (!cancelled) {
      walletSessionRef.current = storedSession;
      setWalletSession(storedSession);
    }
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!walletSession?.accessToken) return undefined;
    const syncPersonalActivity = () => refreshPersonal().catch(() => setPersonalEvidence([]));
    const timer = window.setInterval(syncPersonalActivity, 15_000);
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") syncPersonalActivity();
    };
    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [refreshPersonal, walletSession?.accessToken]);
  useEffect(() => {
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = theme === "system" ? (darkQuery.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      localStorage.setItem("atlas-theme", theme);
    };
    applyTheme();
    darkQuery.addEventListener("change", applyTheme);
    return () => darkQuery.removeEventListener("change", applyTheme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("atlas-auto-refresh", String(autoRefresh));
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refresh]);

  const probe = network?.payload?.probe;
  const attestation = network?.payload?.attestation;
  const agentHolding = agentStatus?.decision?.action === "hold";
  const clientEvidence = personalEvidence;
  const contributionDays = useMemo(() => new Set(clientEvidence.map((record) => (record.payload?.observedAt ?? record.recordedAt ?? "").slice(0, 10)).filter(Boolean)).size, [clientEvidence]);
  const alerts = useMemo(() => {
    const items = [];
    if (state === "error") items.push({ icon: "fa-tower-broadcast", title: "Live Portaldot check is unavailable", detail: error || "Atlas could not complete the latest live reading.", action: "Try the live check again", view: "overview" });
    if (!walletSession) return items;
    if (!linkedSentinels.length) items.push({ icon: "fa-plug-circle-plus", title: "Link a Sentinel to this wallet", detail: "This wallet has no linked device proof yet, so it cannot receive private Sentinel receipts.", action: "Open My Sentinel", view: "sentinel" });
    else if (!clientEvidence.length) items.push({ icon: "fa-satellite-dish", title: "Awaiting the first accepted Sentinel check", detail: "A Sentinel is linked, but Atlas has not received an accepted observation for this wallet.", action: "Open My Sentinel", view: "sentinel" });
    return items;
  }, [clientEvidence.length, error, linkedSentinels.length, state, walletSession]);
  const evidenceKinds = {
    public_network_status: "Public live check",
    paid_independent_probe: "Paid x402 corroboration",
    client_sentinel_observation: "Sentinel contribution",
    agent_observation: "Reliability policy observation",
  };
  const verifyRecord = useCallback(async (record) => {
    setVerification((current) => ({ ...current, [record.id]: { state: "checking" } }));
    try {
      const result = await verifyEvidenceRecord(record);
      setVerification((current) => ({ ...current, [record.id]: { state: result.valid ? "valid" : "invalid", detail: result.reason } }));
    } catch (verificationError) {
      setVerification((current) => ({ ...current, [record.id]: { state: "invalid", detail: verificationError instanceof Error ? verificationError.message : "This evidence could not be verified in the browser." } }));
    }
  }, []);

  const renderOverview = () => <>
    <section className="intro-row">
      <div>
        <p className="eyebrow">PORTALDOT RELIABILITY PROTOCOL</p>
        <h1>Make network evidence useful.</h1>
        <p className="lede">Atlas turns user-authorized Sentinel checks into signed, inspectable Portaldot reliability evidence.</p>
      </div>
      <button className="primary-button" onClick={refresh} disabled={state === "loading"}><i className="fa-solid fa-rotate" aria-hidden="true" /> {state === "loading" ? "Checking live network" : "Run live check"}</button>
    </section>

    {state === "error" ? <section className="error-panel" role="alert"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /><div><strong>Live data is unavailable</strong><p>{error}</p><button className="text-button" onClick={refresh}>Try again</button></div></section> : null}

    <section className="metric-grid" aria-label="Live Portaldot state">
      <article className="metric-card emphasis"><div className="card-head"><span>Current network state</span><span className={`status-pill ${statusTone(state)}`}><i className="fa-solid fa-circle" aria-hidden="true" /> {state === "live" ? "Live" : state === "error" ? "Unavailable" : "Checking"}</span></div><strong className="metric-value">{probe?.chain ?? "—"}</strong><p>{probe?.nodeName ? `${probe.nodeName} · ${probe.nodeVersion ?? "version unavailable"}` : "A verified node identity will appear after a successful live check."}</p></article>
      <article className="metric-card"><div className="card-head"><span>Finalized block</span><i className="fa-solid fa-cube" aria-hidden="true" /></div><strong className="metric-value mono">{probe?.finalizedHeader?.number ?? "—"}</strong><p>{probe?.finalizedHash ? shortHash(probe.finalizedHash) : "No finalized head has been observed yet."}</p></article>
      <article className="metric-card"><div className="card-head"><span>Observation latency</span><i className="fa-solid fa-gauge-high" aria-hidden="true" /></div><strong className="metric-value">{Number.isFinite(probe?.latencyMs) ? `${probe.latencyMs} ms` : "—"}</strong><p>{network?.recordedAt ? `Recorded ${formatTime(network.recordedAt)}` : "Latency is measured only during a live probe."}</p></article>
      <article className="metric-card"><div className="card-head"><span>Epoch credits</span><i className="fa-solid fa-award" aria-hidden="true" /></div><strong className="metric-value">—</strong><p>No epoch root has been published on Portaldot yet. Atlas will not display a balance until that is true.</p></article>
    </section>

    <section className="content-grid">
      <article className="panel network-panel"><div className="panel-heading"><div><p className="eyebrow">NOW OBSERVING</p><h2>Portaldot endpoint evidence</h2></div><button className="icon-button" onClick={refresh} aria-label="Refresh network evidence"><i className="fa-solid fa-rotate" aria-hidden="true" /></button></div><div className="field-grid"><Field label="Endpoint" value={probe?.endpoint ? new URL(probe.endpoint).host : "—"} /><Field label="Runtime" value={probe?.runtime?.specName ? `${probe.runtime.specName} v${probe.runtime.specVersion}` : "—"} /><Field label="Genesis" value={shortHash(probe?.genesisHash)} mono /><Field label="Signature scheme" value={attestation?.scheme ?? "—"} /></div><div className="evidence-footer"><span><i className="fa-solid fa-shield-halved" aria-hidden="true" /> {attestation ? "Signed server attestation recorded" : "No signed attestation yet"}</span><button className="text-button" onClick={() => setActive("evidence")}>Inspect evidence <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button></div></article>
      <article className="panel sentinel-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR DEVICE</p><h2>My Sentinel</h2></div><i className="fa-solid fa-satellite-dish large-icon" aria-hidden="true" /></div>{clientEvidence.length ? <><strong className="sentinel-number">{clientEvidence.length}</strong><p>signed Sentinel observations are in this local Atlas evidence journal.</p><button className="secondary-button" onClick={() => setActive("evidence")}>View contributions</button></> : <EmptyState icon="fa-plug-circle-xmark" title="No Sentinel connected">Install and enable the Atlas Sentinel extension to create your first signed observation. Atlas never reports browsing activity or shares bandwidth.</EmptyState>}</article>
    </section>

    {agentStatus ? <section className="panel agent-panel"><div className="panel-heading"><div><p className="eyebrow">RELIABILITY AGENT</p><h2>{agentHolding ? "Monitoring within policy" : "Independent corroboration requires review"}</h2></div><span className={`status-pill ${agentHolding ? "is-live" : "is-pending"}`}><i className="fa-solid fa-shield-halved" aria-hidden="true" /> {agentHolding ? "Hold" : "Policy gate"}</span></div><p className="panel-lede">The agent evaluates signed observations against a public policy. It cannot choose a wallet or settle a payment from this dashboard.</p><div className="field-grid"><Field label="Latest signed check" value={agentStatus.latestObservation ? formatTime(agentStatus.latestObservation.observedAt) : "No agent check recorded"} /><Field label="Verified observations" value={String(agentStatus.verifiedObservationCount ?? 0)} /><Field label="Policy commitment" value={shortHash(agentStatus.policyHash)} mono /><Field label="Decision" value={agentStatus.decision?.reason?.replaceAll("_", " ") ?? "—"} /></div><div className="evidence-footer"><span><i className="fa-solid fa-lock" aria-hidden="true" /> {agentStatus.note}</span></div></section> : null}

    <section className="panel evidence-strip"><div className="panel-heading"><div><p className="eyebrow">RECENTLY RECORDED</p><h2>Evidence activity</h2></div><button className="text-button" onClick={() => setActive("evidence")}>View all <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button></div>{records.length ? <div className="activity-list">{records.slice(0, 4).map((record) => <div className="activity-item" key={record.id}><span className="activity-icon"><i className="fa-solid fa-file-shield" aria-hidden="true" /></span><div><strong>{evidenceKinds[record.kind] ?? record.kind}</strong><p>{formatTime(record.recordedAt)} · {record.payload?.probe?.finalizedHeader?.number ? `block ${record.payload.probe.finalizedHeader.number}` : "recorded live"}</p></div><code>{shortHash(record.id, 8)}</code></div>)}</div> : <EmptyState icon="fa-folder-open" title="No retained evidence yet">Run a live check to create a signed evidence record.</EmptyState>}</section>
  </>;

  const renderEvidence = () => <section className="page-section"><div className="intro-row compact"><div><p className="eyebrow">SIGNED RECORDS</p><h1>Evidence journal</h1><p className="lede">Every row comes from the local journal after a live Portaldot probe. Verify a displayed signature directly in this browser; no value is taken from a seeded fixture.</p></div><button className="primary-button" onClick={refresh} disabled={state === "loading"}><i className="fa-solid fa-rotate" aria-hidden="true" /> Refresh</button></div>{records.length ? <div className="evidence-table" role="table"><div className="table-row table-head" role="row"><span>Record</span><span>Observed network</span><span>Recorded</span><span>Proof</span></div>{records.map((record) => { const status = verification[record.id]; return <div className="table-row" role="row" key={record.id}><div><strong>{evidenceKinds[record.kind] ?? record.kind}</strong><code>{record.id}</code></div><div>{record.payload?.probe?.chain ?? "—"}<small>{record.payload?.probe?.finalizedHeader?.number ? `Block ${record.payload.probe.finalizedHeader.number}` : "No block data"}</small></div><div>{formatTime(record.recordedAt)}</div><div className="proof-actions"><span className="proof-chip"><i className="fa-solid fa-signature" aria-hidden="true" /> {record.payload?.attestation?.scheme ?? "unavailable"}</span><button className={status?.state === "valid" ? "verify-button verified" : status?.state === "invalid" ? "verify-button failed" : "verify-button"} onClick={() => verifyRecord(record)} disabled={status?.state === "checking"} title={status?.detail}>{status?.state === "checking" ? "Checking…" : status?.state === "valid" ? "Verified locally" : status?.state === "invalid" ? "Verification failed" : "Verify locally"}</button></div></div>; })}</div> : <EmptyState icon="fa-folder-open" title="The evidence journal is empty">When the server completes a real probe, its signed record will be available here.</EmptyState>}</section>;

  const createSentinelLink = async () => {
    const response = await authFetch("/v1/sentinel-links", { method: "POST" });
    if (response.ok) setSentinelLink(await response.json());
    else setWalletError("Atlas could not create a Sentinel link code. Reconnect your wallet.");
  };
  const renderSentinel = () => (
    <section className="page-section">
      <p className="eyebrow">BROWSER EXTENSION</p>
      <h1>My Sentinel</h1>
      <p className="lede narrow">The extension performs user-authorized, scheduled checks directly against Portaldot and signs each accepted observation with a device-local P-256 key.</p>
      {!walletSession ? <section className="panel wallet-panel"><h2>Connect your wallet first</h2><p>Atlas needs a wallet signature to show only your linked Sentinel evidence. This is a login message, not a transaction.</p><button className="primary-button" onClick={connectWallet}>Connect SubWallet</button>{walletError ? <p className="wallet-error">{walletError}</p> : null}</section> : <>
        <section className="panel wallet-panel">
          <p className="eyebrow">CONNECTED WALLET</p>
          <h2 className="mono">{shortHash(walletSession.address, 12)}</h2>
          <p>First install Atlas Sentinel. In this MVP it downloads as a package for Chrome’s <strong>Load unpacked</strong> flow; when Atlas is published, this button will open Chrome Web Store instead.</p>
          <a className="primary-button download-sentinel" href="/downloads/atlas-sentinel-mvp.zip" download><i className="fa-solid fa-download" aria-hidden="true" /> Download Sentinel</a>
          {linkedSentinels.length ? <div className="sentinel-linked-status"><span><i className="fa-solid fa-link" aria-hidden="true" /> Registered Sentinel identities</span><p>{linkedSentinels.length === 1 ? `Device ${shortHash(linkedSentinels[0], 9)} remains associated with this wallet.` : `${linkedSentinels.length} Sentinel identities remain associated with this wallet.`} This is durable server history, not a claim that an extension is installed right now.</p><p className={`sentinel-runtime ${sentinelRuntime.state === "detected" && sentinelRuntime.linkedToWallet ? "confirmed" : ""}`}><i className={`fa-solid ${sentinelRuntime.state === "detected" && sentinelRuntime.linkedToWallet ? "fa-circle-check" : sentinelRuntime.state === "not_detected" ? "fa-puzzle-piece" : "fa-circle-notch fa-spin"}`} aria-hidden="true" /> {sentinelRuntime.state === "detected" ? sentinelRuntime.linkedToWallet ? `This browser: Sentinel ${sentinelRuntime.version} is linked to this wallet and checks are ${sentinelRuntime.enabled ? "enabled" : "paused"}.` : `This browser: Sentinel ${sentinelRuntime.version} is installed but linked to a different wallet.` : sentinelRuntime.state === "not_detected" ? "Sentinel is not detected in this dashboard tab. Load it, then refresh this page to verify the current browser." : "Checking this browser for Sentinel…"}</p><button className="secondary-button compact-button" onClick={() => { refreshPersonal(); requestSentinelRuntime(walletSession.address).then(setSentinelRuntime); }}><i className="fa-solid fa-rotate" aria-hidden="true" /> Refresh activity</button></div> : sentinelLink ? <><p>Paste this one-time code into Sentinel, then choose <strong>Link wallet</strong>. It expires {formatTime(sentinelLink.expiresAt)}.</p><code className="link-code">{sentinelLink.linkCode}</code><div className="link-code-actions"><button className="code-refresh-button" onClick={createSentinelLink}><i className="fa-solid fa-rotate" aria-hidden="true" /> Generate a new code</button><small>Only use this after recreating a Sentinel identity. It replaces the unused code above.</small></div></> : <><p>After the extension is ready, create a one-time link code to bind this wallet to its device proof.</p><button className="secondary-button" onClick={createSentinelLink}>I installed Sentinel — create link code</button></>}
        </section>
        <div className="steps-grid"><article className="step-card"><span>01</span><h2>Download Sentinel</h2><p><a href="/downloads/atlas-sentinel-mvp.zip" download>Download the package</a>, unpack it, then use Chrome’s developer extensions page to load it.</p></article><article className="step-card"><span>02</span><h2>Link this wallet</h2><p>Paste the one-time code above into Sentinel and select Link wallet. If Sentinel asks for a new device identity, return here and select Generate a fresh code.</p></article><article className="step-card"><span>03</span><h2>Inspect your receipt</h2><p>Run a live check. Only records tied to this wallet will appear below.</p></article></div>
        {clientEvidence.length ? <section className="panel"><div className="panel-heading"><div><p className="eyebrow">YOUR CONTRIBUTIONS</p><h2>Accepted Sentinel records</h2></div><button className="icon-button" onClick={() => refreshPersonal()} aria-label="Refresh Sentinel activity"><i className="fa-solid fa-rotate" aria-hidden="true" /></button></div><div className="activity-list">{clientEvidence.map((record) => <div className="activity-item" key={record.id}><span className="activity-icon"><i className="fa-solid fa-satellite-dish" aria-hidden="true" /></span><div><strong>{shortHash(record.payload?.sentinelId, 9)}</strong><p>{formatTime(record.payload?.observedAt)} · {record.payload?.probe?.latencyMs ?? "—"} ms</p></div><code>{shortHash(record.id, 8)}</code></div>)}</div></section> : <EmptyState icon="fa-satellite" title="No linked Sentinel evidence yet">Link Sentinel with a one-time code, run a check, then use Refresh activity above.</EmptyState>}
      </>}
    </section>
  );

  const renderCredits = () => <section className="page-section"><p className="eyebrow">REAL CONTRIBUTION ACTIVITY</p><h1>Contribution progress</h1><p className="lede narrow">This is your accepted Sentinel activity, not a token balance. It becomes credit-eligible only after a public Portaldot epoch root exists.</p><section className="contribution-grid"><article className="metric-card emphasis"><div className="card-head"><span>Accepted observations</span><i className="fa-solid fa-satellite-dish" aria-hidden="true" /></div><strong className="metric-value">{walletSession ? clientEvidence.length : "—"}</strong><p>{walletSession ? "Receipts linked to this wallet." : "Connect your wallet to inspect your own receipts."}</p></article><article className="metric-card"><div className="card-head"><span>Contribution days</span><i className="fa-solid fa-calendar-day" aria-hidden="true" /></div><strong className="metric-value">{walletSession ? contributionDays : "—"}</strong><p>Calendar days with at least one accepted receipt.</p></article><article className="metric-card"><div className="card-head"><span>Latest accepted check</span><i className="fa-solid fa-circle-check" aria-hidden="true" /></div><strong className="metric-value contribution-time">{clientEvidence[0] ? formatTime(clientEvidence[0].payload?.observedAt ?? clientEvidence[0].recordedAt) : "—"}</strong><p>Only a validated live observation is counted here.</p></article></section><section className="credit-empty"><i className="fa-solid fa-lock" aria-hidden="true" /><h2>No on-chain epoch has been published yet</h2><p>Atlas will not display credits, a price, a tier or a claim action until a public Portaldot epoch root and a verifiable claim path exist.</p><div className="credit-rules"><span><i className="fa-solid fa-check" aria-hidden="true" /> Non-transferable design</span><span><i className="fa-solid fa-check" aria-hidden="true" /> One verified claim</span><span><i className="fa-solid fa-check" aria-hidden="true" /> No price claim</span></div></section></section>;

  const renderAlerts = () => <section className="page-section"><p className="eyebrow">ACTION REQUIRED ONLY</p><h1>Alerts</h1><p className="lede narrow">Accepted observations stay in your evidence history. This page only records an actionable state: a live-source failure, a device-link gap, or a linked Sentinel with no accepted receipt.</p>{alerts.length ? <section className="alert-list">{alerts.map((alert) => <article className="alert-card" key={alert.title}><span className="alert-icon"><i className={`fa-solid ${alert.icon}`} aria-hidden="true" /></span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div><button className="secondary-button" onClick={() => setActive(alert.view)}>{alert.action} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button></article>)}</section> : <EmptyState icon="fa-bell-slash" title="Nothing needs your attention">Your live source and linked Sentinel status do not require action. Normal observations never create an alert.</EmptyState>}</section>;

  const renderDownload = () => <section className="page-section"><p className="eyebrow">BROWSER EXTENSION</p><h1>Download Sentinel</h1><p className="lede narrow">Sentinel is the participant-side Atlas extension. It performs only the Portaldot checks that you enable; it does not inspect browsing history or share bandwidth.</p><section className="panel download-panel"><div><h2>Atlas Sentinel MVP</h2><p>Download the current package, unpack it, then use Chrome Extensions → Developer mode → Load unpacked. When Sentinel is published, this page will route to Chrome Web Store instead.</p></div><a className="primary-button download-sentinel" href="/downloads/atlas-sentinel-mvp.zip" download><i className="fa-solid fa-download" aria-hidden="true" /> Download package</a></section><div className="steps-grid"><article className="step-card"><span>01</span><h2>Load the extension</h2><p>Open Chrome’s extensions page, enable Developer mode and select the unpacked Sentinel folder.</p></article><article className="step-card"><span>02</span><h2>Link your wallet</h2><p>Connect SubWallet in My Sentinel, create a one-time code and paste it into Sentinel.</p></article><article className="step-card"><span>03</span><h2>Run a live check</h2><p>Enable checks and inspect the accepted receipt in your private contribution history.</p></article></div></section>;

  const renderSettings = () => <section className="page-section"><p className="eyebrow">LOCAL PREFERENCES</p><h1>Settings</h1><p className="lede narrow">These controls change this browser’s dashboard experience only. They do not simulate network activity or alter your Sentinel.</p><section className="settings-card"><div><h2>Appearance</h2><p>Choose how Atlas looks on this browser. Your preference is stored locally.</p></div><div className="theme-options" role="group" aria-label="Appearance"><button className={theme === "system" ? "theme-choice active" : "theme-choice"} onClick={() => setTheme("system")}>System</button><button className={theme === "light" ? "theme-choice active" : "theme-choice"} onClick={() => setTheme("light")}>Light</button><button className={theme === "dark" ? "theme-choice active" : "theme-choice"} onClick={() => setTheme("dark")}>Dark</button></div></section><section className="settings-card"><div><h2>Refresh live data automatically</h2><p>When enabled, the dashboard requests a fresh signed Portaldot observation every minute while this page is open.</p></div><label className="switch"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /><span aria-hidden="true" /><b>{autoRefresh ? "On" : "Off"}</b></label></section><section className="panel safety-panel"><i className="fa-solid fa-user-shield" aria-hidden="true" /><div><h2>Privacy boundary</h2><p>Sentinel keeps its device key in extension-local storage. Atlas displays only accepted evidence returned by its backend; it does not read browser history, browsing behavior or bandwidth.</p></div></section></section>;

  let content = renderOverview();
  if (active === "evidence") content = renderEvidence();
  if (active === "sentinel") content = renderSentinel();
  if (active === "credits") content = renderCredits();
  if (active === "alerts") content = renderAlerts();
  if (active === "download") content = renderDownload();
  if (active === "settings") content = renderSettings();
  if (walletAccessOpen) content = <section className="wallet-access-dialog" role="dialog" aria-modal="true" aria-labelledby="wallet-access-title"><div className="wallet-access-card"><span className="wallet-access-icon"><i className="fa-solid fa-wallet" aria-hidden="true" /></span><p className="eyebrow">PRIVATE ATLAS ACCESS</p><h1 id="wallet-access-title">Connect your wallet</h1><p>Connect SubWallet only when you want to view your private Sentinel evidence. Atlas public network information stays available without a wallet.</p>{walletError ? <p className="wallet-error">{walletError}</p> : null}<button className="primary-button" onClick={performWalletConnection}>Connect SubWallet <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button><button className="text-button" onClick={() => setWalletAccessOpen(false)}>Browse public Atlas</button></div></section>;

  const disconnectWallet = () => { clearWalletSession(walletSession); };
  const resolvedTheme = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  const isDarkTheme = resolvedTheme === "dark";
  const toggleQuickTheme = () => setTheme(isDarkTheme ? "light" : "dark");
  const identityLabel = walletSession ? "Connected wallet" : "Connect wallet";
  const identityDetail = walletSession ? shortHash(walletSession.address, 4) : "Unlock private activity";
  const identityAvatar = avatarVariant(walletSession?.address);

  return <MotionConfig reducedMotion="user"><div className="app-shell"><aside className="sidebar"><a className="brand" href="/"><span className="brand-mark"><i className="fa-solid fa-compass" aria-hidden="true" /></span><span>atlas</span></a><nav aria-label="Atlas sections">{navigation.map(([id, label, icon]) => <button className={active === id ? "nav-item active" : "nav-item"} key={id} onClick={() => setActive(id)}><i className={`fa-solid ${icon}`} aria-hidden="true" /><span>{label}</span></button>)}</nav><div className="sidebar-footer"><span className={`connection-dot ${statusTone(state)}`} /><div><strong>{state === "live" ? "Live source" : state === "error" ? "Source unavailable" : "Checking source"}</strong><small>{updatedAt ? `Updated ${formatTime(updatedAt)}` : "Awaiting live response"}</small></div></div></aside><main className="main-content"><header className="topbar"><button className="crumb" onClick={() => setActive("overview")}><i className="fa-solid fa-grid-2" aria-hidden="true" /> Atlas workspace</button><div className="topbar-status"><span className={`status-pill ${statusTone(state)}`}><i className="fa-solid fa-circle" aria-hidden="true" /> {state === "live" ? "Portaldot connected" : state === "error" ? "Portaldot unavailable" : "Contacting Portaldot"}</span><button className="quick-theme-toggle" type="button" onClick={toggleQuickTheme} aria-label={isDarkTheme ? "Switch dashboard to light mode" : "Switch dashboard to dark mode"} title={isDarkTheme ? "Light mode" : "Dark mode"}><i className={`fa-solid ${isDarkTheme ? "fa-sun" : "fa-moon"}`} aria-hidden="true" /><span>{isDarkTheme ? "Light" : "Dark"}</span></button><div className="profile-wrap"><button className="profile-trigger" onClick={() => walletSession ? setProfileOpen((value) => !value) : connectWallet()} aria-expanded={walletSession ? profileOpen : undefined} aria-label={walletSession ? "Open wallet profile" : "Connect wallet"}><span className={`identity-avatar ${identityAvatar}`} aria-hidden="true"><i className={`fa-solid ${walletSession ? "fa-wallet" : "fa-user-astronaut"}`} /></span><span className="identity-copy"><strong>{identityLabel}</strong><small>{identityDetail}</small></span><i className="fa-solid fa-chevron-down profile-chevron" aria-hidden="true" /></button>{profileOpen ? <motion.section className="profile-menu" initial={{ opacity: 0, y: -8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .18 }}><p className="eyebrow">CONNECTED WALLET</p><strong className="mono">{shortHash(walletSession.address, 8)}</strong><p>{clientEvidence.length} accepted Sentinel receipt{clientEvidence.length === 1 ? "" : "s"} visible in this browser.</p><button className="text-button" onClick={() => { setActive("sentinel"); setProfileOpen(false); }}>My Sentinel <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button><button className="text-button" onClick={() => { setActive("settings"); setProfileOpen(false); }}>Appearance & settings <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button><button className="profile-disconnect" onClick={disconnectWallet}>Disconnect this browser</button></motion.section> : null}</div></div></header><AnimatePresence mode="wait"><motion.div key={active} className="page-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .24, ease: "easeOut" }}>{content}</motion.div></AnimatePresence></main></div></MotionConfig>;
}
