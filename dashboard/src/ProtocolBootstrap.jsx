import { useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, keccak256, toBytes } from "viem";
import { PORTALDOT_V3 } from "./contract-deployments.js";
import { campaignRegistryAbi } from "./campaign-registry-artifact.js";
import { gemLedgerAbi } from "./gem-ledger-artifact.js";

const EVM_ACCOUNT = "0x91ee4Cf394123153eB19ED7053A9FE9C4b7099A2";
const CHAIN = {
  id: PORTALDOT_V3.chainId,
  name: PORTALDOT_V3.name,
  nativeCurrency: { name: "POT", symbol: "POT", decimals: 18 },
  rpcUrls: { default: { http: [PORTALDOT_V3.rpcUrl] } },
};
const CAMPAIGN_ID = keccak256(toBytes("atlas-season-0"));
const RULES_HASH = keccak256(toBytes("atlas-season-0-rules-v1"));
// Portaldot V3 currently overestimates these compact Yul writes on eth_estimateGas.
// An explicit limit keeps the wallet from rejecting a valid transaction before signing.
const INTERNAL_TX_GAS = 2_000_000n;

function short(value) { return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "—"; }

export function ProtocolBootstrap() {
  const [wallet, setWallet] = useState(null);
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState(null);
  const [campaignCreated, setCampaignCreated] = useState(false);
  const [seasonConfigured, setSeasonConfigured] = useState(false);
  const [campaignPublished, setCampaignPublished] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [transactions, setTransactions] = useState([]);
  const publicClient = useMemo(() => createPublicClient({ chain: CHAIN, transport: http(PORTALDOT_V3.rpcUrl) }), []);

  async function connect() {
    try {
      const injected = window.rabby || window.ethereum;
      if (!injected) throw new Error("No detecté Rabby en este navegador.");
      const nextWallet = createWalletClient({ chain: CHAIN, transport: custom(injected) });
      const [connected] = await nextWallet.requestAddresses();
      const detectedChain = await nextWallet.getChainId();
      if (connected.toLowerCase() !== EVM_ACCOUNT.toLowerCase()) throw new Error(`Cuenta incorrecta. Esperaba ${short(EVM_ACCOUNT)}.`);
      if (detectedChain !== PORTALDOT_V3.chainId) throw new Error(`Rabby está en Chain ID ${detectedChain}. Cambia a ${PORTALDOT_V3.chainId}.`);
      setWallet(nextWallet); setAddress(connected); setChainId(detectedChain); setStatus("ready");
      setMessage("Wallet correcta. La inicialización de Season 0 está lista.");
    } catch (error) { setStatus("error"); setMessage(error?.shortMessage || error?.message || "No se pudo conectar la wallet."); }
  }

  async function send(label, request) {
    if (!wallet || !address) return;
    try {
      setStatus("awaiting-signature"); setMessage(`Rabby abrirá la firma para ${label}. Revisa red, contrato y método.`);
      const hash = await request();
      setTransactions((current) => [...current, { label, hash }]);
      setMessage(`${label} enviada. Esperando confirmación…`);
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("ready"); setMessage(`${label} confirmada en Portaldot V3.`);
      return hash;
    } catch (error) { setStatus("error"); setMessage(error?.shortMessage || error?.message || `Rabby rechazó ${label}.`); }
  }

  async function configureSeason() {
    const hash = await send("configuración de Season 0", () => wallet.writeContract({ account: address, address: PORTALDOT_V3.contracts.gemLedger, abi: gemLedgerAbi, functionName: "configureSeason", args: [0n, 1000n], gas: INTERNAL_TX_GAS }));
    if (hash) setSeasonConfigured(true);
  }

  async function createCampaign() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const hash = await send("creación de la campaña Season 0", () => wallet.writeContract({ account: address, address: PORTALDOT_V3.contracts.campaignRegistry, abi: campaignRegistryAbi, functionName: "create", args: [CAMPAIGN_ID, RULES_HASH, 1000n, 100n, 86400n, now, now + 30n * 86400n], gas: INTERNAL_TX_GAS }));
    if (hash) setCampaignCreated(true);
  }

  async function publishCampaign() {
    const hash = await send("publicación de la campaña Season 0", () => wallet.writeContract({ account: address, address: PORTALDOT_V3.contracts.campaignRegistry, abi: campaignRegistryAbi, functionName: "publish", args: [CAMPAIGN_ID], gas: INTERNAL_TX_GAS }));
    if (hash) setCampaignPublished(true);
  }

  return (
    <main className="evm-page">
      <section className="evm-card">
        <p className="evm-eyebrow">ATLAS · OPERACIONES INTERNAS · SEASON 0</p>
        <h1>Preparar la primera campaña en cadena</h1>
        <p className="evm-lede">Herramienta de configuración para el equipo de Atlas. Aquí se inicializan Gems y se publica Season 0; no forma parte del recorrido de los participantes y nunca solicita ni almacena la seed phrase.</p>
        <div className="evm-grid">
          <div><span>Red</span><strong>{PORTALDOT_V3.name} · {PORTALDOT_V3.chainId}</strong></div>
          <div><span>Wallet</span><code>{short(address || EVM_ACCOUNT)}</code></div>
          <div><span>Campaign Registry</span><code>{PORTALDOT_V3.contracts.campaignRegistry}</code></div>
          <div><span>Gem Ledger</span><code>{PORTALDOT_V3.contracts.gemLedger}</code></div>
          <div><span>Campaign ID</span><code>{short(CAMPAIGN_ID)}</code></div>
          <div><span>Season</span><strong>0 · 1,000 Gems</strong></div>
        </div>
        <div className="evm-actions">
          <button className="evm-primary" onClick={connect}>{address ? "Volver a comprobar wallet" : "Conectar Rabby"}</button>
          <button className="evm-secondary" onClick={configureSeason} disabled={!wallet || seasonConfigured}>1. Inicializar Gems</button>
          <button className="evm-secondary" onClick={createCampaign} disabled={!wallet || campaignCreated}>2. Registrar campaña</button>
          <button className="evm-danger" onClick={publishCampaign} disabled={!wallet || !campaignCreated || campaignPublished}>3. Publicar en el board</button>
        </div>
        <div className={`evm-status evm-status-${status}`} role="status">
          <b>{status === "ready" ? "Lista" : status === "error" ? "Error" : "Estado"}</b>
          <p>{message || "Conecta Rabby para comenzar."}</p>
          {address && <small>Cuenta: {address} · Chain ID: {chainId}</small>}
          {transactions.map((tx) => <small key={tx.hash}>{tx.label}: {tx.hash}</small>)}
        </div>
        <a className="evm-back" href="/">Volver a Atlas</a>
      </section>
    </main>
  );
}
