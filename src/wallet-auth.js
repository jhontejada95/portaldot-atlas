import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cryptoWaitReady, signatureVerify } from "@polkadot/util-crypto";
import { databaseEnabled, getDatabase, pruneExpiredRows } from "./database.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LINK_TTL_MS = 10 * 60 * 1000;

const challenges = new Map();
const sessions = new Map();
const links = new Map();
const sentinelWallets = new Map();
const runtimeDirectory = path.resolve(process.env.ATLAS_RUNTIME_DIRECTORY ?? ".runtime");
const sentinelWalletPath = path.join(runtimeDirectory, "sentinel-wallet-links.json");

export async function initializeWalletAuth() {
  if (databaseEnabled()) {
    await getDatabase();
    await pruneExpiredRows();
    return;
  }
  try {
    const saved = JSON.parse(await readFile(sentinelWalletPath, "utf8"));
    for (const [sentinelId, wallet] of saved) {
      if (/^[a-zA-Z0-9_-]{16,128}$/.test(sentinelId) && isPlausibleSubstrateAddress(wallet)) sentinelWallets.set(sentinelId, wallet);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function persistSentinelWallets() {
  await mkdir(runtimeDirectory, { recursive: true });
  await writeFile(sentinelWalletPath, JSON.stringify([...sentinelWallets.entries()]), "utf8");
}

function cleanExpired(store) {
  const now = Date.now();
  for (const [key, value] of store) if (value.expiresAt <= now) store.delete(key);
}

function expiresIn(milliseconds) {
  return new Date(Date.now() + milliseconds);
}

export function isPlausibleSubstrateAddress(address) {
  return typeof address === "string" && /^[1-9A-HJ-NP-Za-km-z]{47,64}$/.test(address);
}

export async function createWalletChallenge(address, origin) {
  if (!isPlausibleSubstrateAddress(address)) throw new Error("invalid_wallet_address");
  const challengeId = randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = expiresIn(CHALLENGE_TTL_MS);
  const message = [
    "Portaldot Atlas wallet sign-in",
    `Wallet: ${address}`,
    `Origin: ${origin}`,
    `Nonce: ${challengeId}`,
    `Issued at: ${issuedAt}`,
    "This signature authenticates Atlas locally. It is not a transaction and does not move funds.",
  ].join("\n");

  const database = await getDatabase();
  if (database) {
    await pruneExpiredRows();
    await database.query(
      `INSERT INTO atlas_wallet_challenges (challenge_id, address, message, expires_at) VALUES ($1, $2, $3, $4)`,
      [challengeId, address, message, expiresAt.toISOString()],
    );
  } else {
    cleanExpired(challenges);
    challenges.set(challengeId, { address, message, expiresAt: expiresAt.getTime() });
  }

  return { challengeId, message, expiresAt: expiresAt.toISOString() };
}

export async function verifyWalletChallenge({ challengeId, address, signature }) {
  if (typeof signature !== "string") return null;
  const database = await getDatabase();
  let challenge;

  if (database) {
    await pruneExpiredRows();
    const result = await database.query(
      `DELETE FROM atlas_wallet_challenges WHERE challenge_id = $1 AND address = $2 AND expires_at > NOW()
       RETURNING address, message`,
      [challengeId, address],
    );
    challenge = result.rows[0] ?? null;
  } else {
    cleanExpired(challenges);
    challenge = challenges.get(challengeId);
    if (challenge?.address === address) challenges.delete(challengeId);
    else challenge = null;
  }

  if (!challenge) return null;
  await cryptoWaitReady();
  const verification = signatureVerify(challenge.message, signature, address);
  if (!verification.isValid) return null;

  const accessToken = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const expiresAt = expiresIn(SESSION_TTL_MS);
  if (database) {
    await database.query(
      `INSERT INTO atlas_wallet_sessions (access_token, address, expires_at) VALUES ($1, $2, $3)`,
      [accessToken, address, expiresAt.toISOString()],
    );
  } else {
    cleanExpired(sessions);
    sessions.set(accessToken, { address, expiresAt: expiresAt.getTime() });
  }
  return { accessToken, address, expiresAt: expiresAt.toISOString() };
}

export async function walletForRequest(request) {
  const token = request.get("authorization")?.match(/^Bearer ([a-zA-Z0-9_-]+)$/)?.[1];
  if (!token) return null;
  const database = await getDatabase();
  if (database) {
    const result = await database.query(
      `SELECT address FROM atlas_wallet_sessions WHERE access_token = $1 AND expires_at > NOW()`,
      [token],
    );
    return result.rows[0]?.address ?? null;
  }
  cleanExpired(sessions);
  return sessions.get(token)?.address ?? null;
}

export async function createSentinelLink(address) {
  const linkCode = `atlas-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const expiresAt = expiresIn(LINK_TTL_MS);
  const database = await getDatabase();
  if (database) {
    await pruneExpiredRows();
    await database.query(
      `INSERT INTO atlas_sentinel_links (link_code, address, expires_at) VALUES ($1, $2, $3)`,
      [linkCode, address, expiresAt.toISOString()],
    );
  } else {
    cleanExpired(links);
    links.set(linkCode, { address, expiresAt: expiresAt.getTime() });
  }
  return { linkCode, expiresAt: expiresAt.toISOString() };
}

export async function claimSentinelLink(sentinelId, linkCode) {
  const database = await getDatabase();
  if (database) {
    const result = await database.query(
      `DELETE FROM atlas_sentinel_links WHERE link_code = $1 AND expires_at > NOW() RETURNING address`,
      [linkCode],
    );
    const wallet = result.rows[0]?.address;
    if (!wallet) return null;
    await database.query(
      `INSERT INTO atlas_sentinel_wallets (sentinel_id, wallet, linked_at) VALUES ($1, $2, NOW())
       ON CONFLICT (sentinel_id) DO UPDATE SET wallet = EXCLUDED.wallet, linked_at = EXCLUDED.linked_at`,
      [sentinelId, wallet],
    );
    return wallet;
  }

  cleanExpired(links);
  const link = links.get(linkCode);
  if (!link) return null;
  links.delete(linkCode);
  sentinelWallets.set(sentinelId, link.address);
  await persistSentinelWallets();
  return link.address;
}

export async function walletForSentinel(sentinelId) {
  const database = await getDatabase();
  if (database) {
    const result = await database.query(`SELECT wallet FROM atlas_sentinel_wallets WHERE sentinel_id = $1`, [sentinelId]);
    return result.rows[0]?.wallet ?? null;
  }
  return sentinelWallets.get(sentinelId) ?? null;
}

export async function sentinelsForWallet(address) {
  const database = await getDatabase();
  if (database) {
    const result = await database.query(
      `SELECT sentinel_id FROM atlas_sentinel_wallets WHERE wallet = $1 ORDER BY linked_at DESC`,
      [address],
    );
    return result.rows.map((row) => row.sentinel_id);
  }
  return [...sentinelWallets.entries()].filter(([, wallet]) => wallet === address).map(([sentinelId]) => sentinelId);
}
