import "dotenv/config";
import { assertUsableProbe, samplePortaldot } from "./portaldot-probe.js";

const endpoint = process.env.ATLAS_PORTALDOT_ENDPOINT ?? "wss://mainnet.portaldot.io";
const probe = await samplePortaldot(endpoint, {
  expectedGenesis: process.env.ATLAS_EXPECTED_GENESIS,
});
assertUsableProbe(probe, process.env.ATLAS_EXPECTED_GENESIS);
console.log(JSON.stringify(probe, null, 2));
