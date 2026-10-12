import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "./database.js";

const runtimeDirectory = path.resolve(process.env.ATLAS_RUNTIME_DIRECTORY ?? ".runtime");
const journalPath = path.join(runtimeDirectory, "evidence.jsonl");

async function ensureJournal() {
  await mkdir(runtimeDirectory, { recursive: true });
}

/** Persists only observations produced by an actual Atlas probe at request time. */
export async function appendLiveEvidence(kind, payload) {
  const record = {
    schema: "atlas.evidence-record.v1",
    id: crypto.randomUUID(),
    kind,
    recordedAt: new Date().toISOString(),
    payload,
  };

  const database = await getDatabase();
  if (database) {
    await database.query(
      `INSERT INTO atlas_evidence (id, kind, recorded_at, payload) VALUES ($1, $2, $3, $4::jsonb)`,
      [record.id, record.kind, record.recordedAt, JSON.stringify(record.payload)],
    );
    return record;
  }

  await ensureJournal();
  await appendFile(journalPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export async function recentLiveEvidence(limit = 25) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const database = await getDatabase();
  if (database) {
    const result = await database.query(
      `SELECT id, kind, recorded_at, payload FROM atlas_evidence ORDER BY recorded_at DESC LIMIT $1`,
      [safeLimit],
    );
    return result.rows.map((row) => ({
      schema: "atlas.evidence-record.v1",
      id: row.id,
      kind: row.kind,
      recordedAt: new Date(row.recorded_at).toISOString(),
      payload: row.payload,
    }));
  }

  try {
    const raw = await readFile(journalPath, "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .slice(-safeLimit)
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
