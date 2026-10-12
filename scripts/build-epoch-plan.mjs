import dotenv from "dotenv";
import { writeFile } from "node:fs/promises";
import { buildEpochPlan } from "../src/epoch-builder.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

function value(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const epoch = Number(value("epoch"));
const startsAt = value("from");
const endsAt = value("to");
const output = value("output");
if (!Number.isSafeInteger(epoch) || !startsAt || !endsAt) {
  throw new Error("Usage: node scripts/build-epoch-plan.mjs --epoch <integer> --from <ISO-8601> --to <ISO-8601> [--output <path>]");
}

const plan = await buildEpochPlan({
  epoch,
  startsAt,
  endsAt,
  expectedGenesis: process.env.ATLAS_EXPECTED_GENESIS,
});
if (output) {
  await writeFile(output, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ epoch: plan.epoch, root: plan.root, claims: plan.claims.length, evidenceCount: plan.evidenceCount, output }, null, 2));
} else {
  console.log(JSON.stringify(plan, null, 2));
}
