import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rpcUrl = process.env.ATLAS_V3_EVM_RPC;
const expectedChainId = Number(process.env.ATLAS_V3_EXPECTED_CHAIN_ID);
const privateKey = process.env.ATLAS_EVM_PRIVATE_KEY;
const artifactDir = path.resolve(root, "contracts/atlas-evidence-anchor-evm/target/evm");

if (rpcUrl !== "https://test-evm-rpc-v3.portaldot.dev") {
  throw new Error("Refusing to deploy: ATLAS_V3_EVM_RPC must be the explicit official V3 EVM endpoint.");
}
if (expectedChainId !== 420420777) {
  throw new Error("Refusing to deploy: ATLAS_V3_EXPECTED_CHAIN_ID must be 420420777.");
}
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey ?? "")) {
  throw new Error("Refusing to deploy: provide ATLAS_EVM_PRIVATE_KEY in an uncommitted environment only.");
}

const abi = JSON.parse(await readFile(path.join(artifactDir, "EvidenceAnchor.abi"), "utf8"));
const bytecode = `0x${(await readFile(path.join(artifactDir, "EvidenceAnchor.bin"), "utf8")).trim()}`;
const account = privateKeyToAccount(privateKey);
const chain = defineChain({
  id: expectedChainId,
  name: "PortaldotV3 Test",
  nativeCurrency: { name: "POT", symbol: "POT", decimals: 14 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const transport = http(rpcUrl);
const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

const chainId = await publicClient.getChainId();
if (chainId !== expectedChainId) throw new Error(`Refusing to deploy on chain ${chainId}.`);

const balance = await publicClient.getBalance({ address: account.address });
console.log(JSON.stringify({ stage: "preflight", chainId, signer: account.address, balance: balance.toString() }));

const hash = await walletClient.deployContract({ abi, bytecode, args: [account.address] });
const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
const evidence = {
  schema: "atlas.evm-evidence-anchor-deployment.v1",
  endpoint: rpcUrl,
  chainId,
  signer: account.address,
  contractAddress: receipt.contractAddress,
  transactionHash: receipt.transactionHash,
  blockHash: receipt.blockHash,
  blockNumber: receipt.blockNumber?.toString(),
  status: receipt.status,
  gasUsed: receipt.gasUsed?.toString(),
  recordedAt: new Date().toISOString(),
};
const evidencePath = path.resolve(root, "contracts/atlas-evidence-anchor-evm/deployment-evidence.json");
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(JSON.stringify(evidence, null, 2));
