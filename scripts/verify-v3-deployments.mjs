import { readFile } from "node:fs/promises";
import { createPublicClient, http } from "viem";

const manifest = JSON.parse(await readFile(new URL("../deployments/portaldot-v3.json", import.meta.url), "utf8"));
const client = createPublicClient({ transport: http(manifest.rpc) });

for (const [name, deployment] of Object.entries(manifest.contracts)) {
  const receipt = await client.getTransactionReceipt({ hash: deployment.transaction });
  const bytecode = await client.getBytecode({ address: deployment.address });
  if (receipt.status !== "success") throw new Error(`${name}: deployment receipt is not successful`);
  if (!bytecode || bytecode === "0x") throw new Error(`${name}: no runtime code at ${deployment.address}`);
  if (receipt.contractAddress?.toLowerCase() !== deployment.address.toLowerCase()) {
    throw new Error(`${name}: manifest address does not match the deployment receipt`);
  }
  console.log(`${name}: OK ${deployment.address} block=${receipt.blockNumber} runtimeBytes=${(bytecode.length - 2) / 2}`);
}
