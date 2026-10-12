import { appendFile, readFile } from "node:fs/promises";
import { generatePrivateKey } from "viem/accounts";

const configPath = ".env.local";
const config = await readFile(configPath, "utf8");
if (/^ATLAS_SENTINEL_PRIVATE_KEY=/m.test(config)) {
  console.log("Atlas sentinel signer already configured; refusing to replace it.");
  process.exit(0);
}

await appendFile(configPath, `ATLAS_SENTINEL_PRIVATE_KEY=${generatePrivateKey()}\n`, "utf8");
console.log("Created a distinct local Atlas sentinel signing key without exposing it.");
