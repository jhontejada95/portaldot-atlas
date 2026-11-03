import { useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, http } from "viem";
import { evidenceAnchorAbi, evidenceAnchorBytecode } from "./evm-deploy-artifact.js";

const RPC_URL = "https://test-evm-rpc-v3.portaldot.dev";
const CHAIN_ID = 420420777;
const EXPECTED_EVM = "0xd3f0056a2c4e3332aaee66047851034806adfdc0";
const CHAIN = {
  id: CHAIN_ID,
  name: "Portaldot V3 Test",
  nativeCurrency: { name: "POT", symbol: "POT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

function short(value) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "—";
}

export function EvmDeploy() {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [deployment, setDeployment] = useState("");
  const publicClient = useMemo(() => createPublicClient({ chain: CHAIN, transport: http(RPC_URL) }), []);

  async function connect() {
    const injected = window.ethereum;
    if (!injected) {
      setStatus("error");
      setMessage("No detecté una wallet EVM en este navegador. Abre esta página con SubWallet/MetaMask habilitada.");
      return;
    }
    try {
      setStatus("checking");
      setMessage("Solicitando conexión a la wallet…");
      const wallet = createWalletClient({ chain: CHAIN, transport: custom(injected) });
      const [connected] = await wallet.requestAddresses();
      const currentChain = await wallet.getChainId();
      const currentBalance = await publicClient.getBalance({ address: connected });
      setProvider(wallet);
      setAddress(connected);
      setChainId(currentChain);
      setBalance(currentBalance);
      if (currentChain !== CHAIN_ID) {
        setStatus("wrong-chain");
        setMessage(`La wallet está en Chain ID ${currentChain}. Cambia a Portaldot V3 (${CHAIN_ID}) desde la wallet.`);
      } else if (connected.toLowerCase() !== EXPECTED_EVM) {
        setStatus("wrong-address");
        setMessage(`La cuenta conectada no es la representación EVM de la cuenta financiada. Esperaba ${short(EXPECTED_EVM)}.`);
      } else {
        setStatus("ready");
        setMessage("Wallet correcta y red correcta. El despliegue está listo para preparar, sin firmar todavía.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error?.shortMessage || error?.message || "La wallet canceló o rechazó la conexión.");
    }
  }

  async function prepare() {
    if (!provider || !address || status !== "ready") return;
    setStatus("prepared");
    setMessage("Solicitud preparada. No se ha enviado ninguna transacción. Antes de firmar, revisa la wallet y confirma aquí.");
  }

  async function deploy() {
    if (!provider || !address || status !== "prepared") return;
    setStatus("awaiting-signature");
    setMessage("La siguiente acción abrirá la confirmación de la wallet. Revisa red, cuenta y coste antes de aprobar.");
    try {
      const hash = await provider.deployContract({
        account: address,
        abi: evidenceAnchorAbi,
        bytecode: evidenceAnchorBytecode,
        args: [address],
      });
      setDeployment(hash);
      setStatus("submitted");
      setMessage("Transacción enviada. Esperando confirmación del bloque…");
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("confirmed");
      setMessage("Contrato confirmado en Portaldot V3.");
    } catch (error) {
      setStatus("error");
      setMessage(error?.shortMessage || error?.message || "La wallet rechazó la firma o el nodo rechazó la transacción.");
    }
  }

  return (
    <main className="evm-page">
      <section className="evm-card">
        <p className="evm-eyebrow">ATLAS · EVM EVIDENCE ANCHOR</p>
        <h1>Preparar despliegue en Portaldot V3</h1>
        <p className="evm-lede">Conecta la wallet desde el navegador para comprobar la cuenta EVM mapeada y preparar el contrato de evidencia. La seed phrase y las claves privadas no se solicitan ni se almacenan.</p>
        <div className="evm-grid">
          <div><span>Red</span><strong>Portaldot V3 · {CHAIN_ID}</strong></div>
          <div><span>Cuenta esperada</span><code>{short(EXPECTED_EVM)}</code></div>
          <div><span>Contrato</span><strong>EvidenceAnchor · v0.1</strong></div>
          <div><span>Saldo leído</span><strong>{balance == null ? "—" : `${formatEther(balance)} POT`}</strong></div>
        </div>
        <div className="evm-actions">
          <button className="evm-primary" onClick={connect}>{address ? "Volver a comprobar wallet" : "Conectar wallet EVM"}</button>
          <button className="evm-secondary" onClick={prepare} disabled={status !== "ready"}>Preparar transacción</button>
          <button className="evm-danger" onClick={deploy} disabled={status !== "prepared"}>Abrir confirmación de firma</button>
        </div>
        <div className={`evm-status evm-status-${status}`} role="status">
          <b>{status === "ready" ? "Lista" : status === "prepared" ? "Preparada" : status === "confirmed" ? "Confirmada" : "Estado"}</b>
          <p>{message || "Conecta la wallet para empezar."}</p>
          {address && <small>Cuenta: {address} · Chain ID detectado: {chainId ?? "—"}</small>}
          {deployment && <small>Tx: {deployment}</small>}
        </div>
        <a className="evm-back" href="/">Volver a Atlas</a>
      </section>
    </main>
  );
}
