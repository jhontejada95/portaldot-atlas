import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cryptoWaitReady, signatureVerify } from "@polkadot/util-crypto";

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

export function isPlausibleSubstrateAddress(address) {
  return typeof address === "string" && /^[1-9A-HJ-NP-Za-km-z]{47,64}$/.test(address);
}

export function createWalletChallenge(address, origin) {
  if (!isPlausibleSubstrateAddress(address)) throw new Error("invalid_wallet_address");
  cleanExpired(challenges);
  const challengeId = randomUUID();
  const issuedAt = new Date().toISOString();
  const message = [
    "Portaldot Atlas wallet sign-in",
    `Wallet: ${address}`,
    `Origin: ${origin}`,
    `Nonce: ${challengeId}`,
    `Issued at: ${issuedAt}`,
    "This signature authenticates Atlas locally. It is not a transaction and does not move funds.",
  ].join("\n");
  challenges.set(challengeId, { address, message, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  return { challengeId, message, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString() };
}

export async function verifyWalletChallenge({ challengeId, address, signature }) {
  cleanExpired(challenges);
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.address !== address || typeof signature !== "string") return null;
  await cryptoWaitReady();
  const verification = signatureVerify(challenge.message, signature, address);
  challenges.delete(challengeId);
  if (!verification.isValid) return null;
  cleanExpired(sessions);
  const accessToken = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(accessToken, { address, expiresAt });
  return { accessToken, address, expiresAt: new Date(expiresAt).toISOString() };
}

export function walletForRequest(request) {
  cleanExpired(sessions);
  const token = request.get("authorization")?.match(/^Bearer ([a-zA-Z0-9_-]+)$/)?.[1];
  return token ? sessions.get(token)?.address ?? null : null;
}

export function createSentinelLink(address) {
  cleanExpired(links);
  const linkCode = `atlas-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const expiresAt = Date.now() + LINK_TTL_MS;
  links.set(linkCode, { address, expiresAt });
  return { linkCode, expiresAt: new Date(expiresAt).toISOString() };
}

export async function claimSentinelLink(sentinelId, linkCode) {
  cleanExpired(links);
  const link = links.get(linkCode);
  if (!link) return null;
  links.delete(linkCode);
  sentinelWallets.set(sentinelId, link.address);
  await persistSentinelWallets();
  return link.address;
}

export function walletForSentinel(sentinelId) {
  return sentinelWallets.get(sentinelId) ?? null;
}

export function sentinelsForWallet(address) {
  return [...sentinelWallets.entries()].filter(([, wallet]) => wallet === address).map(([sentinelId]) => sentinelId);
}
