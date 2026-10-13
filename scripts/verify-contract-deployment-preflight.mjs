import { access, readFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { inspectPortaldotContractCapabilities, samplePortaldot } from "../src/portaldot-probe.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const MAINNET_GENESIS = "0x83b5212c69f85f3996f8696bb35bf913af51b176a5f53d0a74fd3a83dc0b8a54";
const network = process.env.ATLAS_CONTRACT_DEPLOYMENT_NETWORK;
const endpoint = process.env.ATLAS_CONTRACT_ENDPOINT;
const expectedGenesis = process.env.ATLAS_CONTRACT_EXPECTED_GENESIS;
const explorer = process.env.ATLAS_CONTRACT_EXPLORER_URL;
const artifacts = [
  {
    name: "atlas-epoch-credits",
    path: path.resolve("contracts/atlas-epoch-credits/target/ink/atlas_epoch_credits.contract"),
  },
  {
    name: "atlas-sentinel-registry",
    path: path.resolve("contracts/atlas-sentinel-registry/target/ink/atlas_sentinel_registry.contract"),
  },
];

if (network !== "testnet") {
  throw new Error("ATLAS_CONTRACT_DEPLOYMENT_NETWORK must be exactly 'testnet'; Mainnet deployment is intentionally refused.");
}
if (!endpoint?.startsWith("wss://") && !endpoint?.startsWith("ws://")) {
  throw new Error("ATLAS_CONTRACT_ENDPOINT must be an explicit testnet ws:// or wss:// endpoint.");
}
if (!/^0x[0-9a-f]{64}$/i.test(expectedGenesis ?? "") || expectedGenesis.toLowerCase() === MAINNET_GENESIS) {
  throw new Error("ATLAS_CONTRACT_EXPECTED_GENESIS must be a non-Mainnet testnet genesis hash.");
}
if (!/^https:\/\//.test(explorer ?? "")) {
  throw new Error("ATLAS_CONTRACT_EXPLORER_URL must be a public HTTPS explorer URL.");
}

const contractArtifacts = await Promise.all(artifacts.map(async (expected) => {
  await access(expected.path);
  const artifact = JSON.parse(await readFile(expected.path, "utf8"));
  if (artifact?.contract?.name !== expected.name || !artifact?.source?.hash) {
    throw new Error(`${expected.name} artifact is missing its canonical contract metadata.`);
  }
  return {
    name: artifact.contract.name,
    sourceHash: artifact.source.hash,
    language: artifact.source.language,
  };
}));

const [probe, capabilities] = await Promise.all([
  samplePortaldot(endpoint, { expectedGenesis }),
  inspectPortaldotContractCapabilities(endpoint),
]);
if (!capabilities.contractsCall || !capabilities.contractsInstantiate) {
  throw new Error("Testnet endpoint does not expose the required contracts runtime APIs.");
}

console.log(JSON.stringify({
  verified: true,
  schema: "atlas.contract-deployment-preflight.v1",
  network,
  endpoint,
  explorer,
  chain: probe.chain,
  genesisHash: probe.genesisHash,
  runtime: probe.runtime,
  artifacts: contractArtifacts,
  capabilities,
  safety: "Preflight only. No account, signer, Wasm upload, instantiation, or transaction was used.",
}, null, 2));
