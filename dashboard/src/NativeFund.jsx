import { useEffect, useMemo, useState } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { web3Accounts, web3Enable, web3FromAddress } from "@polkadot/extension-dapp";

const WSS_URL = "wss://test-node-v3.portaldot.dev";
const DESTINATION = "5FN3bCiDjDvTvF29nGS5ct8RA55nFKLTcqJgRau3mSC3bMb4";
const SOURCE = "5CckzYq2DCUNRXdekaorov8JH9yrzPSWxA7fHszN2orNcTU4";
const DECIMALS = 14;
const AMOUNT = 5n * 10n ** BigInt(DECIMALS);

function formatPot(value) {
  if (value == null) return "—";
  const whole = value / 10n ** BigInt(DECIMALS);
  const fraction = (value % 10n ** BigInt(DECIMALS)).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction} POT` : `${whole} POT`;
}

export function NativeFund() {
  const [api, setApi] = useState(null);
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const expectedSource = useMemo(() => SOURCE, []);

  useEffect(() => () => { api?.disconnect(); }, [api]);

  async function connect() {
    try {
      setStatus("checking");
      setMessage("Abriendo SubWallet para compartir la cuenta nativa…");
      const extensions = await web3Enable("Atlas");
      if (!extensions.length) throw new Error("No detecté SubWallet. Instala o habilita la extensión en este perfil de Chrome.");
      const accounts = await web3Accounts();
      const selected = accounts.find((item) => item.address === SOURCE) || accounts.find((item) => item.address.startsWith("5"));
      if (!selected) throw new Error("SubWallet está conectada, pero no compartió la cuenta nativa 5Cck…NcTU4.");
      const nextApi = await ApiPromise.create({ provider: new WsProvider(WSS_URL) });
      const info = await nextApi.query.system.account(selected.address);
      setApi(nextApi);
      setAccount(selected.address);
      setBalance(BigInt(info.data.free.toString()));
      setStatus("ready");
      setMessage("Cuenta nativa conectada. La transferencia queda preparada, pero no se ha enviado.");
    } catch (error) {
      setStatus("error");
      setMessage(error?.message || "No se pudo conectar SubWallet al nodo V3.");
    }
  }

  async function transfer() {
    if (!api || !account || status !== "ready") return;
    try {
      setStatus("awaiting-signature");
      setMessage("SubWallet abrirá la confirmación. Comprueba red, cuenta, destinatario y 5 POT antes de aprobar.");
      const injector = await web3FromAddress(account);
      const tx = api.tx.balances.transferKeepAlive(DESTINATION, AMOUNT.toString());
      await tx.signAndSend(account, { signer: injector.signer }, ({ status: nextStatus, dispatchError, txHash: nextHash }) => {
        if (nextHash) setTxHash(nextHash.toHex());
        if (dispatchError) {
          setStatus("error");
          setMessage(dispatchError.isModule ? dispatchError.toString() : dispatchError.toString());
        } else if (nextStatus.isInBlock) {
          setStatus("in-block");
          setMessage(`Transferencia incluida en el bloque ${nextStatus.asInBlock.toHex()}.`);
        } else if (nextStatus.isFinalized) {
          setStatus("confirmed");
          setMessage("Transferencia finalizada en Portaldot V3.");
        }
      });
    } catch (error) {
      setStatus("error");
      setMessage(error?.message || "La firma fue cancelada o la transferencia fue rechazada.");
    }
  }

  return (
    <main className="evm-page">
      <section className="evm-card">
        <p className="evm-eyebrow">ATLAS · NATIVE FUNDING ROUTE</p>
        <h1>Fondear tu cuenta EVM desde SubWallet</h1>
        <p className="evm-lede">Esta ruta evita importar Portaldot V3 como red en SubWallet: Atlas consulta el WSS oficial y SubWallet solo firma la transferencia nativa. Nunca pide la seed ni la clave privada.</p>
        <div className="evm-grid">
          <div><span>Red nativa</span><strong>Portaldot V3 Test</strong></div>
          <div><span>WSS</span><code>{WSS_URL}</code></div>
          <div><span>Desde</span><code>{account || expectedSource}</code></div>
          <div><span>Saldo leído</span><strong>{formatPot(balance)}</strong></div>
          <div><span>Hacia</span><code>{DESTINATION}</code></div>
          <div><span>Transferencia preparada</span><strong>5 POT</strong></div>
        </div>
        <div className="evm-actions">
          <button className="evm-primary" onClick={connect}>{account ? "Volver a comprobar SubWallet" : "Conectar SubWallet nativa"}</button>
          <button className="evm-danger" onClick={transfer} disabled={status !== "ready"}>Abrir confirmación de 5 POT</button>
        </div>
        <div className={`evm-status evm-status-${status}`} role="status">
          <b>{status === "ready" ? "Lista" : status === "confirmed" ? "Confirmada" : "Estado"}</b>
          <p>{message || "Conecta SubWallet para leer el saldo nativo."}</p>
          {txHash && <small>Extrinsic: {txHash}</small>}
        </div>
        <a className="evm-back" href="/evm-deploy">Volver al preflight EVM</a>
      </section>
    </main>
  );
}
