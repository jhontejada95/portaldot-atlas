import { useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, encodeDeployData, formatEther, http } from "viem";
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

async function findAlternateEvmProvider() {
  return new Promise((resolve) => {
    const candidates = [];
    const addCandidate = (provider, label) => {
      if (provider && !provider.isSubWallet && !candidates.some((item) => item.provider === provider)) {
        candidates.push({ provider, label: label || "wallet EVM compatible" });
      }
    };
    const injectedProviders = Array.isArray(window.ethereum?.providers) ? window.ethereum.providers : [];
    injectedProviders.forEach((provider) => addCandidate(provider, provider.isRabby ? "Rabby Wallet" : "wallet EVM compatible"));
    addCandidate(window.rabby, "Rabby Wallet");
    addCandidate(window.ethereum?.isRabby ? window.ethereum : null, "Rabby Wallet");
    const onAnnouncement = (event) => {
      const provider = event?.detail?.provider;
      const info = event?.detail?.info;
      addCandidate(provider, info?.name || info?.rdns);
    };
    window.addEventListener("eip6963:announceProvider", onAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnouncement);
      addCandidate(window.ethereum, window.ethereum?.isRabby ? "Rabby Wallet" : "wallet EVM compatible");
      resolve(candidates[0] || null);
    }, 700);
  });
}

export function EvmDeploy() {
  const [provider, setProvider] = useState(null);
  const [providerLabel, setProviderLabel] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [deployment, setDeployment] = useState("");
  const [showAlternate, setShowAlternate] = useState(false);
  const publicClient = useMemo(() => createPublicClient({ chain: CHAIN, transport: http(RPC_URL) }), []);

  async function connectWith(injected, label) {
    if (!injected) {
      setStatus("error");
      setMessage("No detecté una wallet EVM compatible en este navegador.");
      return;
    }
    try {
      setStatus("checking");
      setMessage(`Solicitando conexión a ${label}…`);
      const wallet = createWalletClient({ chain: CHAIN, transport: custom(injected) });
      const [connected] = await wallet.requestAddresses();
      const currentChain = await wallet.getChainId();
      const currentBalance = await publicClient.getBalance({ address: connected });
      setProvider(wallet);
      setProviderLabel(label);
      setAddress(connected);
      setChainId(currentChain);
      setBalance(currentBalance);
      if (currentChain !== CHAIN_ID) {
        setStatus("wrong-chain");
        if (label === "SubWallet") {
          setShowAlternate(true);
          setMessage(`SubWallet conectó la cuenta y leyó ${formatEther(currentBalance)} POT, pero no puede cambiar a Portaldot V3. Usa una wallet EVM compatible para esta cuenta.`);
        } else {
          setMessage(`La wallet está en Chain ID ${currentChain}. Cambia a Portaldot V3 (${CHAIN_ID}) desde la wallet.`);
        }
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

  async function connect() {
    const alternate = await findAlternateEvmProvider();
    if (alternate) {
      await connectWith(alternate.provider, alternate.label);
      return;
    }
    const injected = await findSubWalletProvider();
    if (!injected) {
      setStatus("error");
      setMessage("No detecté SubWallet en este navegador. Puedes conectar una wallet EVM compatible como Rabby para el despliegue.");
      setShowAlternate(true);
      return;
    }
    await connectWith(injected, "SubWallet");
  }

  async function connectAlternate() {
    const candidate = await findAlternateEvmProvider();
    await connectWith(candidate?.provider, candidate?.label || "wallet EVM compatible");
  }

  async function refreshConnected() {
    if (!provider || !address) return connect();
    try {
      setStatus("checking");
      const currentChain = await provider.getChainId();
      const currentBalance = await publicClient.getBalance({ address });
      setChainId(currentChain);
      setBalance(currentBalance);
      if (currentChain !== CHAIN_ID) {
        setStatus("wrong-chain");
        setMessage(`${providerLabel || "La wallet"} está en Chain ID ${currentChain}. Selecciona Portaldot V3 (${CHAIN_ID}) desde esa misma wallet.`);
      } else if (address.toLowerCase() !== CONTROLLED_EVM.toLowerCase()) {
        setStatus("wrong-address");
        setMessage(`La cuenta conectada no coincide con tu cuenta EVM controlada. Esperaba ${short(CONTROLLED_EVM)}.`);
      } else {
        setStatus("ready");
        setMessage("Wallet correcta y red correcta. El despliegue está listo para preparar, sin firmar todavía.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error?.shortMessage || error?.message || "No se pudo volver a comprobar la wallet.");
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
        if (providerLabel === "SubWallet") {
          setShowAlternate(true);
          setStatus("error");
          setMessage("SubWallet no admite esta red EVM V3 como red personalizada. Usa una wallet EVM compatible, como Rabby, con la misma cuenta 0x91ee…09A2.");
          return;
        }
        await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: `0x${CHAIN_ID.toString(16)}`, chainName: CHAIN.name, nativeCurrency: CHAIN.nativeCurrency, rpcUrls: [RPC_URL], blockExplorerUrls: ["https://scanner-testnet-v3.portaldot.dev/"] }] });
        setMessage(`Red añadida a ${providerLabel || "la wallet"}. Vuelve a comprobar para leer el saldo de Portaldot V3.`);
        setStatus("idle");
      } else {
        if (error?.code === 4200 || /not supported|unsupported|cannot connect|invalid parameter|internal error/i.test(error?.message || "")) {
          setShowAlternate(true);
          setStatus("error");
          setMessage(`${providerLabel || "Este proveedor"} conectó la cuenta, pero rechazó el cambio automático a Portaldot V3. Añade la red manualmente en la wallet y vuelve a comprobar, manteniendo la cuenta 0x91ee…09A2.`);
          return;
        }
        setStatus("error");
        setMessage(error?.shortMessage || error?.message || "No se pudo cambiar la red desde la wallet.");
      }
    }
  }

  async function prepare() {
    if (!provider || !address || status !== "ready") return;
    try {
      setStatus("checking");
      setMessage("Simulando el despliegue en Portaldot V3…");
      const data = encodeDeployData({ abi: evidenceAnchorAbi, bytecode: evidenceAnchorBytecode, args: [address] });
      const gas = await publicClient.estimateGas({ account: address, data });
      setStatus("prepared");
      setMessage(`Solicitud preparada con una estimación de ${gas.toString()} gas. No se ha enviado ninguna transacción. Antes de firmar, revisa la wallet y confirma aquí.`);
    } catch (error) {
      setStatus("error");
      setMessage(`El RPC V3 rechazó la simulación del despliegue. No se ha firmado ni enviado nada. ${error?.shortMessage || error?.message || "Revisa el contrato y vuelve a intentarlo cuando el nodo acepte la simulación."}`);
    }
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
          <button className="evm-primary" onClick={address ? refreshConnected : connect}>{address ? "Volver a comprobar wallet" : "Conectar wallet EVM"}</button>
          {showAlternate && <button className="evm-secondary" onClick={connectAlternate}>Conectar wallet EVM compatible</button>}
          <button className="evm-secondary" onClick={switchNetwork} disabled={!provider || status !== "wrong-chain"}>Cambiar a Portaldot V3</button>
          <button className="evm-secondary" onClick={prepare} disabled={status !== "ready"}>Preparar transacción</button>
          <button className="evm-danger" onClick={deploy} disabled={status !== "prepared"}>Abrir confirmación de firma</button>
        </div>
        <div className={`evm-status evm-status-${status}`} role="status">
          <b>{status === "ready" ? "Lista" : status === "prepared" ? "Preparada" : status === "confirmed" ? "Confirmada" : "Estado"}</b>
          <p>{message || "Conecta la wallet para empezar."}</p>
          {address && <small>Proveedor: {providerLabel || "—"} · Cuenta: {address} · Chain ID detectado: {chainId ?? "—"}</small>}
          {deployment && <small>Tx: {deployment}</small>}
        </div>
        <a className="evm-back" href="/">Volver a Atlas</a>
      </section>
    </main>
  );
}
