import { access, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const configPath = ".env.local";
try {
  await access(configPath, constants.F_OK);
  console.log(`${configPath} already exists; refusing to overwrite its receiver configuration.`);
  process.exit(0);
} catch {
  // It is safe to create a fresh, local-only test receiver configuration.
}

const privateKey = generatePrivateKey();
const sentinelPrivateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
const config = [
  "# Atlas local Base Sepolia receiver. Never commit this file.",
  `ATLAS_PAY_TO=${account.address}`,
  `ATLAS_RECEIVER_PRIVATE_KEY=${privateKey}`,
  `ATLAS_SENTINEL_PRIVATE_KEY=${sentinelPrivateKey}`,
  "ATLAS_NETWORK=base-sepolia",
  "ATLAS_PORT=4030",
  "ATLAS_PORTALDOT_ENDPOINT=wss://mainnet.portaldot.io",
  "ATLAS_EXPECTED_GENESIS=0x83b5212c69f85f3996f8696bb35bf913af51b176a5f53d0a74fd3a83dc0b8a54",
  "",
].join("\n");

await writeFile(configPath, config, { encoding: "utf8", flag: "wx", mode: 0o600 });
console.log(`Created a dedicated Atlas receiver at ${account.address}. Its private key remains only in ${configPath}.`);
