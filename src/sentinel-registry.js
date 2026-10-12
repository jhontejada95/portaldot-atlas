import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const runtimeDirectory = path.resolve(process.env.ATLAS_RUNTIME_DIRECTORY ?? ".runtime");
const registryPath = path.join(runtimeDirectory, "sentinel-registry.json");

async function readRegistry() {
  try {
    return JSON.parse(await readFile(registryPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

export async function registerSentinel(sentinelId, publicKeyJwk) {
  await mkdir(runtimeDirectory, { recursive: true });
  const registry = await readRegistry();
  const existing = registry[sentinelId];
  const encodedKey = JSON.stringify(publicKeyJwk);
  if (existing && JSON.stringify(existing.publicKeyJwk) !== encodedKey) {
    throw new Error("sentinel_identity_conflict");
  }
  if (!existing) {
    registry[sentinelId] = {
      publicKeyJwk,
      registeredAt: new Date().toISOString(),
    };
    await writeFile(registryPath, JSON.stringify(registry, null, 2), "utf8");
  }
  return registry[sentinelId];
}

export async function publicKeyForSentinel(sentinelId) {
  const registry = await readRegistry();
  return registry[sentinelId]?.publicKeyJwk ?? null;
}
