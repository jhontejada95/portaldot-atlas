import dotenv from "dotenv";
import { buildEpochPlan, verifyClaimProof } from "../src/epoch-builder.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const end = new Date();
const start = new Date(end.getTime() - 72 * 60 * 60 * 1000);
const plan = await buildEpochPlan({
  epoch: 0,
  startsAt: start.toISOString(),
  endsAt: end.toISOString(),
  expectedGenesis: process.env.ATLAS_EXPECTED_GENESIS,
});

if (!plan.evidenceCount || !plan.claims.length) {
  throw new Error("No real, eligible Sentinel evidence exists in the last 72 hours. Refusing to verify a fabricated epoch.");
}
if (!plan.claims.every((claim) => verifyClaimProof(claim, plan.root))) {
  throw new Error("A derived claim does not reconstruct the epoch root.");
}

console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(),
  schema: plan.schema,
  evidenceCount: plan.evidenceCount,
  claimCount: plan.claims.length,
  root: plan.root,
  policyHash: plan.policyHash,
  proofsValid: true,
}, null, 2));
