import dotenv from "dotenv";
import { assertUsableProbe, samplePortaldot } from "../src/portaldot-probe.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const endpoint = process.env.ATLAS_PORTALDOT_ENDPOINT ?? "wss://mainnet.portaldot.io";
const probe = assertUsableProbe(
  await samplePortaldot(endpoint, { expectedGenesis: process.env.ATLAS_EXPECTED_GENESIS }),
  process.env.ATLAS_EXPECTED_GENESIS,
);

console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(),
  endpoint: probe.endpoint,
  chain: probe.chain,
  genesisHash: probe.genesisHash,
  finalizedHash: probe.finalizedHash,
  finalizedBlock: probe.finalizedHeader.number,
  runtime: probe.runtime,
  latencyMs: probe.latencyMs,
}, null, 2));
