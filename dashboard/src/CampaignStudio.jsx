import { useEffect, useMemo, useState } from "react";
import { createPublicClient, encodeFunctionData, http, keccak256, toBytes } from "viem";
import { PORTALDOT_V3 } from "./contract-deployments.js";
import { campaignRegistryAbi } from "./campaign-registry-artifact.js";

const ATLAS_OPERATOR = "0x91ee4Cf394123153eB19ED7053A9FE9C4b7099A2";
const CHAIN = {
  id: PORTALDOT_V3.chainId,
  name: PORTALDOT_V3.name,
  nativeCurrency: { name: "POT", symbol: "POT", decimals: 18 },
  rpcUrls: { default: { http: [PORTALDOT_V3.rpcUrl] } },
};
const PUBLIC_CLIENT = createPublicClient({ chain: CHAIN, transport: http(PORTALDOT_V3.rpcUrl) });

const initialForm = {
  title: "Echo Week · First Signals",
  slug: "echo-week-season-0",
  description: "A clear first route for community signals, reviewable proof and visible campaign progress.",
  proofMode: "Social review",
  budget: "1000",
  reward: "100",
  cooldownHours: "24",
  durationDays: "30",
};
const DRAFT_STORAGE_KEY = "atlas-b2b-campaign-draft";

function readStoredDraft() {
  try {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return stored ? { ...initialForm, ...JSON.parse(stored) } : initialForm;
  } catch {
    return initialForm;
  }
}

function short(value) { return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "—"; }

export function CampaignStudio({ onOpenBoard }) {
  const [form, setForm] = useState(readStoredDraft);
  const [wallet, setWallet] = useState("");
  const [walletProvider, setWalletProvider] = useState("");
  const [walletOptions, setWalletOptions] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [draftSaved, setDraftSaved] = useState(() => Boolean(window.localStorage.getItem(DRAFT_STORAGE_KEY)));
  const [registered, setRegistered] = useState(false);
  const [published, setPublished] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const discovered = new Map();
    const addProvider = (provider, info = {}) => {
      if (!provider || [...discovered.values()].some((entry) => entry.provider === provider)) return;
      const fallbackName = provider.isRabby ? "Rabby" : provider.isSubWallet ? "SubWallet EVM" : "EVM wallet";
      const name = info.name || provider.name || fallbackName;
      const id = info.rdns || info.uuid || name.toLowerCase().replace(/\s+/g, "-");
      discovered.set(id, { id, name, provider });
    };
    const announce = (event) => addProvider(event.detail?.provider, event.detail?.info);
    window.addEventListener("eip6963:announceProvider", announce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    addProvider(window.rabby, { name: "Rabby", rdns: "io.rabby" });
    if (Array.isArray(window.ethereum?.providers)) window.ethereum.providers.forEach((provider) => addProvider(provider));
    addProvider(window.ethereum);
    const sync = () => {
      const next = [...discovered.values()];
      setWalletOptions(next);
      setSelectedWalletId((current) => current || next[0]?.id || "");
    };
    sync();
    const timer = window.setTimeout(sync, 250);
    return () => { window.clearTimeout(timer); window.removeEventListener("eip6963:announceProvider", announce); };
  }, []);

  const campaignId = useMemo(() => keccak256(toBytes(form.slug.trim() || "atlas-campaign")), [form.slug]);
  const rulesHash = useMemo(() => keccak256(toBytes(JSON.stringify({ title: form.title, description: form.description, proofMode: form.proofMode, budget: form.budget, reward: form.reward, cooldownHours: form.cooldownHours }))), [form]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setDraftSaved(false);
  }

  async function connectWallet() {
    try {
      const selected = walletOptions.find((entry) => entry.id === selectedWalletId);
      const provider = selected?.provider || window.rabby || window.ethereum;
      if (!provider) throw new Error("No detecté una wallet EVM compatible.");
      const providerLabel = selected?.name || (provider.isRabby ? "Rabby" : provider.isSubWallet ? "SubWallet EVM" : "EVM wallet");
      const [account] = await provider.request({ method: "eth_requestAccounts" });
      const chainId = await provider.request({ method: "eth_chainId" });
      if (Number.parseInt(chainId, 16) !== PORTALDOT_V3.chainId) throw new Error(`Cambia la wallet a Portaldot V3 (${PORTALDOT_V3.chainId}).`);
      if (account.toLowerCase() !== ATLAS_OPERATOR.toLowerCase()) throw new Error(`Esta vista B2B usa la wallet operadora ${short(ATLAS_OPERATOR)}.`);
      setWallet(account);
      setWalletProvider(providerLabel);
      setStatus("ready");
      setMessage(`${providerLabel} ya tenía acceso autorizado. Wallet operadora conectada; el borrador está listo para publicar.`);
    } catch (error) {
      setStatus("error");
      setMessage(error?.shortMessage || error?.message || "No se pudo conectar la wallet.");
    }
  }

  async function send(label, data) {
    try {
      const provider = window.rabby || window.ethereum;
      const gasPrice = await PUBLIC_CLIENT.getGasPrice();
      setStatus("awaiting-signature");
      setMessage(`Portaldot está preparando ${label}. Puede tardar unos segundos; no pulses el botón otra vez. Revisa la firma cuando aparezca.`);
      const hash = await provider.request({ method: "eth_sendTransaction", params: [{ from: wallet, to: PORTALDOT_V3.contracts.campaignRegistry, data, value: "0x0", gasPrice: `0x${(gasPrice + gasPrice / 10n).toString(16)}` }] });
      setTransactions((current) => [...current, { label, hash }]);
      setMessage(`${label} enviada. Esperando confirmación…`);
      await PUBLIC_CLIENT.waitForTransactionReceipt({ hash });
      setStatus("ready");
      setMessage(`${label} confirmada en Portaldot V3.`);
      return hash;
    } catch (error) {
      setStatus("error");
      setMessage(error?.shortMessage || error?.message || `La wallet rechazó ${label}.`);
      return null;
    }
  }

  async function registerCampaign() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const duration = BigInt(Math.max(1, Number(form.durationDays) || 30) * 86400);
    const data = encodeFunctionData({ abi: campaignRegistryAbi, functionName: "create", args: [campaignId, rulesHash, BigInt(form.budget || 0), BigInt(form.reward || 0), BigInt(form.cooldownHours || 24) * 3600n, now, now + duration] });
    const hash = await send("registro de la campaña", data);
    if (hash) setRegistered(true);
  }

  async function publishCampaign() {
    const data = encodeFunctionData({ abi: campaignRegistryAbi, functionName: "publish", args: [campaignId] });
    const hash = await send("publicación de la campaña", data);
    if (hash) setPublished(true);
  }

  const statusLabel = status === "error" ? "Error" : status === "awaiting-signature" ? "Esperando firma" : status === "ready" ? "Lista" : "Estado";

  return <section className="page-section studio-page">
    <div className="intro-row compact"><div><p className="eyebrow">B2B · CAMPAIGN STUDIO</p><h1>Turn a protocol idea into a live campaign.</h1><p className="lede narrow">Draft the route, make its rules visible and publish it to the Campaign Board. This workspace uses the operator EVM wallet; the SubWallet connection in the dashboard is a separate participant session.</p></div><button className="secondary-button" onClick={onOpenBoard}><i className="fa-solid fa-arrow-right" aria-hidden="true" /> Open Campaign Board</button></div>
    <div className="studio-layout">
      <section className="panel studio-form-panel"><div className="panel-heading"><div><p className="eyebrow">01 · CAMPAIGN BRIEF</p><h2>Define the route</h2></div><span className="farm-count">B2B</span></div><div className="studio-form-grid"><label><span>Campaign title</span><input name="title" value={form.title} onChange={updateField} /></label><label><span>Campaign slug</span><input name="slug" value={form.slug} onChange={updateField} /></label><label className="studio-field-wide"><span>Description</span><textarea name="description" rows="3" value={form.description} onChange={updateField} /></label><label><span>Proof method</span><select name="proofMode" value={form.proofMode} onChange={updateField}><option>Social review</option><option>Community review</option><option>Sentinel receipt</option></select></label><label><span>Duration</span><input name="durationDays" type="number" min="1" value={form.durationDays} onChange={updateField} /><small>days</small></label><label><span>Gem budget</span><input name="budget" type="number" min="1" value={form.budget} onChange={updateField} /></label><label><span>Base reward</span><input name="reward" type="number" min="1" value={form.reward} onChange={updateField} /></label><label><span>Cooldown</span><input name="cooldownHours" type="number" min="1" value={form.cooldownHours} onChange={updateField} /><small>hours</small></label></div><div className="studio-form-actions"><button className="secondary-button" onClick={() => { window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form)); setDraftSaved(true); setMessage("Borrador guardado en este navegador. Revisa el preview antes de publicar."); }}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {draftSaved ? "Draft saved" : "Save draft"}</button>{walletOptions.length > 1 ? <label className="studio-wallet-select"><span>Wallet provider</span><select value={selectedWalletId} onChange={(event) => setSelectedWalletId(event.target.value)}>{walletOptions.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select></label> : null}<button className="primary-button" onClick={connectWallet}><i className="fa-solid fa-wallet" aria-hidden="true" /> {wallet ? `${walletProvider} connected` : "Connect operator EVM wallet"}</button></div></section>
      <aside className="panel studio-preview-panel"><div className="panel-heading"><div><p className="eyebrow">02 · LIVE PREVIEW</p><h2>What participants will see</h2></div><i className="fa-solid fa-eye large-icon" aria-hidden="true" /></div><article className="studio-preview-card"><div className="campaign-art campaign-art-community"><i className="fa-solid fa-bullseye" aria-hidden="true" /></div><div className="campaign-card-body"><div className="campaign-meta"><span>Protocol campaign</span><em>{published ? "Published" : registered ? "Registered" : "Draft"}</em></div><h3>{form.title || "Untitled campaign"}</h3><p>{form.description || "Add a short description for the route."}</p><div className="campaign-stats"><span><strong>{form.reward || 0}</strong> Gems</span><span><strong>{form.durationDays || 0}d</strong> live</span><span><strong>{form.proofMode}</strong></span></div></div></article><div className="studio-id-row"><span>Campaign ID</span><code>{short(campaignId)}</code></div><div className="studio-id-row"><span>Rules hash</span><code>{short(rulesHash)}</code></div></aside>
    </div>
    <section className="panel studio-publish-panel"><div className="panel-heading"><div><p className="eyebrow">03 · PUBLISH</p><h2>Move from draft to campaign board</h2></div><i className="fa-solid fa-rocket large-icon" aria-hidden="true" /></div><div className="studio-publish-steps"><div className={registered ? "is-done" : ""}><b>01</b><span><strong>Register campaign</strong><small>Store rules, budget and reward policy in Campaign Registry.</small></span><button className="secondary-button" onClick={registerCampaign} disabled={!wallet || !draftSaved || registered || status === "awaiting-signature"}>{registered ? "Registered" : status === "awaiting-signature" ? "Waiting…" : "Register"}</button></div><div className={published ? "is-done" : ""}><b>02</b><span><strong>Publish to board</strong><small>Make the campaign discoverable to B2C participants.</small></span><button className="primary-button" onClick={publishCampaign} disabled={!wallet || !registered || published || status === "awaiting-signature"}>{published ? "Published" : status === "awaiting-signature" ? "Waiting…" : "Publish"}</button></div></div><div className={`evm-status evm-status-${status}`} role="status"><b>{statusLabel}</b><p>{message || "Save a draft, connect the operator wallet and review each signature in the wallet."}</p>{wallet && <small>Operator: {wallet} · Chain ID: {PORTALDOT_V3.chainId}</small>}{transactions.map((tx) => <small key={tx.hash}>{tx.label}: {tx.hash}</small>)}</div></section>
  </section>;
}
