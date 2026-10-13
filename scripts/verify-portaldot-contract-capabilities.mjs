import dotenv from "dotenv";
import { inspectPortaldotContractCapabilities } from "../src/portaldot-probe.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const endpoint = process.env.ATLAS_PORTALDOT_ENDPOINT ?? "wss://mainnet.portaldot.io";
const capabilities = await inspectPortaldotContractCapabilities(endpoint);

if (!capabilities.contractsCall || !capabilities.contractsInstantiate) {
  throw new Error("Portaldot endpoint does not expose the required contracts runtime APIs.");
}

console.log(JSON.stringify({
  ...capabilities,
  safety: "Read-only preflight only. No Wasm was uploaded, no contract was instantiated, and no transaction was submitted.",
}, null, 2));
