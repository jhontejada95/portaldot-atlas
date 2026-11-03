import { useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, http } from "viem";
import { evidenceAnchorAbi, evidenceAnchorBytecode } from "./evm-deploy-artifact.js";

const RPC_URL = "https://test-evm-rpc-v3.portaldot.dev";
const CHAIN_ID = 420420777;
const CONTROLLED_EVM = "0x91ee4Cf394123153eB19ED7053A9FE9C4b7099A2";
const CONTROLLED_NATIVE = "5FN3bCiDjDvTvF29nGS5ct8RA55nFKLTcqJgRau3mSC3bMb4";
const CHAIN = {
  id: CHAIN_ID,
  name: "Portaldot V3 Test",
  nativeCurrency: { name: "POT", symbol: "POT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

function short(value) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "—";
}

async function findSubWalletProvider() {
  if (window.SubWallet?.isSubWallet) return window.SubWallet;
  if (window.ethereum?.isSubWallet) return window.ethereum;
  return new Promise((resolve) => {
    let settled = false;
    const onAnnouncement = (event) => {
      const provider = event?.detail?.provider;
      if (provider?.isSubWallet) {
        settled = true;
        window.removeEventListener("eip6963:announceProvider", onAnnouncement);
        resolve(provider);
      }
    };
    window.addEventListener("eip6963:announceProvider", onAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.setTimeout(() => {
      if (!settled) {
        window.removeEventListener("eip6963:announceProvider", onAnnouncement);
        resolve(null);
      }
    }, 700);
  });
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
    const injected = await findSubWalletProvider();
    if (!injected) {
      setStatus("error");
      setMessage("No detecté SubWallet en este navegador. Abre la página en el perfil donde está instalada y habilita el acceso del sitio.");
      return;
    }
    try {
      setStatus("checking");
      setMessage("Solicitando conexión a SubWallet…");
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
      } else if (connected.toLowerCase() !== CONTROLLED_EVM.toLowerCase()) {
        setStatus("wrong-address");
        setMessage(`La cuenta conectada no coincide con tu cuenta EVM controlada. Esperaba ${short(CONTROLLED_EVM)}.`);
      } else if (currentBalance === 0n) {
        setStatus("needs-funding");
        setMessage(`La cuenta es correcta, pero todavía no tiene POT en V3. Su cuenta nativa mapeada es ${short(CONTROLLED_NATIVE)}.`);
      } else {
        setStatus("ready");
        setMessage("Wallet correcta y red correcta. El despliegue está listo para preparar, sin firmar todavía.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error?.shortMessage || error?.message || "La wallet canceló o rechazó la conexión.");
    }
  }

  async function switchNetwork() {
    if (!provider) return;
    try {
      setStatus("checking");
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }] });
      setMessage("Red cambiada. Vuelve a comprobar la wallet para leer el saldo de Portaldot V3.");
      setStatus("idle");
    } catch (error) {
      if (error?.code === 4902) {
        await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: `0x${CHAIN_ID.toString(16)}`, chainName: CHAIN.name, nativeCurrency: CHAIN.nativeCurrency, rpcUrls: [RPC_URL], blockExplorerUrls: ["https://scanner-testnet-v3.portaldot.dev/"] }] });
        setMessage("Red añadida a SubWallet. Vuelve a comprobar la wallet para leer el saldo de Portaldot V3.");
        setStatus("idle");
      } else {
        setStatus("error");
        setMessage(error?.shortMessage || error?.message || "No se pudo cambiar la red desde la wallet.");
      }
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
          <div><span>Cuenta EVM controlada</span><code>{short(CONTROLLED_EVM)}</code></div>
          <div><span>Mapeo nativo para fondeo</span><code>{short(CONTROLLED_NATIVE)}</code></div>
          <div><span>Contrato</span><strong>EvidenceAnchor · v0.1</strong></div>
          <div><span>Saldo leído</span><strong>{balance == null ? "—" : `${formatEther(balance)} POT`}</strong></div>
        </div>
        <div className="evm-actions">
          <button className="evm-primary" onClick={connect}>{address ? "Volver a comprobar wallet" : "Conectar wallet EVM"}</button>
          <button className="evm-secondary" onClick={switchNetwork} disabled={!provider || status !== "wrong-chain"}>Cambiar a Portaldot V3</button>
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
