import { access, readFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { assertUsableProbe, inspectPortaldotContractCapabilities, samplePortaldot } from "../src/portaldot-probe.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const endpoint = process.env.ATLAS_LOCAL_PORTALDOT_ENDPOINT ?? "ws://127.0.0.1:9944";
const artifacts = [
  { name: "atlas-epoch-credits", path: path.resolve("contracts/atlas-epoch-credits/target/ink/atlas_epoch_credits.contract") },
  { name: "atlas-sentinel-registry", path: path.resolve("contracts/atlas-sentinel-registry/target/ink/atlas_sentinel_registry.contract") },
];

const contractArtifacts = await Promise.all(artifacts.map(async (expected) => {
  await access(expected.path);
  const artifact = JSON.parse(await readFile(expected.path, "utf8"));
  if (artifact?.contract?.name !== expected.name || !artifact?.source?.hash) {
    throw new Error(`${expected.name} artifact is missing canonical metadata.`);
  }
  return { name: artifact.contract.name, sourceHash: artifact.source.hash };
}));

let probe;
let capabilities;
try {
  [probe, capabilities] = await Promise.all([
    samplePortaldot(endpoint),
    inspectPortaldotContractCapabilities(endpoint),
  ]);
} catch (error) {
  if (error?.code === "ECONNREFUSED") {
    throw new Error(`No local Portaldot node is reachable at ${endpoint}. Start the official WSL development node first.`);
  }
  throw error;
}
assertUsableProbe(probe);
if (!capabilities.contractsCall || !capabilities.contractsInstantiate) {
  throw new Error("The local Portaldot node does not expose the required contracts runtime APIs.");
}

console.log(JSON.stringify({
  verified: true,
  schema: "atlas.local-contract-runtime-readiness.v1",
  endpoint,
  chain: probe.chain,
  genesisHash: probe.genesisHash,
  finalizedBlock: probe.finalizedHeader.number,
  runtime: probe.runtime,
  artifacts: contractArtifacts,
  capabilities,
  safety: "Readiness only. No account, signing key, Wasm upload, contract instantiation, or transaction was used.",
}, null, 2));
