import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "./database.js";

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
  const database = await getDatabase();
  if (database) {
    const existing = await database.query(
      `SELECT public_key_jwk, registered_at FROM atlas_sentinels WHERE sentinel_id = $1`,
      [sentinelId],
    );
    if (existing.rowCount) {
      if (JSON.stringify(existing.rows[0].public_key_jwk) !== JSON.stringify(publicKeyJwk)) {
        throw new Error("sentinel_identity_conflict");
      }
      return { publicKeyJwk: existing.rows[0].public_key_jwk, registeredAt: new Date(existing.rows[0].registered_at).toISOString() };
    }
    const registeredAt = new Date().toISOString();
    await database.query(
      `INSERT INTO atlas_sentinels (sentinel_id, public_key_jwk, registered_at) VALUES ($1, $2::jsonb, $3)`,
      [sentinelId, JSON.stringify(publicKeyJwk), registeredAt],
    );
    return { publicKeyJwk, registeredAt };
  }

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
  const database = await getDatabase();
  if (database) {
    const result = await database.query(`SELECT public_key_jwk FROM atlas_sentinels WHERE sentinel_id = $1`, [sentinelId]);
    return result.rows[0]?.public_key_jwk ?? null;
  }
  const registry = await readRegistry();
  return registry[sentinelId]?.publicKeyJwk ?? null;
}
