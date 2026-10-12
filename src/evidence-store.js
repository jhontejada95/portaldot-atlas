import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const runtimeDirectory = path.resolve(process.env.ATLAS_RUNTIME_DIRECTORY ?? ".runtime");
const journalPath = path.join(runtimeDirectory, "evidence.jsonl");

async function ensureJournal() {
  await mkdir(runtimeDirectory, { recursive: true });
}

/** Persists only observations produced by an actual Atlas probe at request time. */
export async function appendLiveEvidence(kind, payload) {
  await ensureJournal();
  const record = {
    schema: "atlas.evidence-record.v1",
    id: crypto.randomUUID(),
    kind,
    recordedAt: new Date().toISOString(),
    payload,
  };
  await appendFile(journalPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export async function recentLiveEvidence(limit = 25) {
  try {
    const raw = await readFile(journalPath, "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .slice(-Math.max(1, Math.min(limit, 100)))
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
