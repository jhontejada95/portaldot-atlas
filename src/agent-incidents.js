import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "./database.js";

const runtimeDirectory = path.resolve(process.env.ATLAS_RUNTIME_DIRECTORY ?? ".runtime");
const journalPath = path.join(runtimeDirectory, "agent-incidents.jsonl");

function assertDecision(decision) {
  if (!decision || decision.action !== "request_independent_paid_probe") throw new Error("only_paid_probe_decisions_can_be_reserved");
  if (!/^atlas-[a-f0-9]{64}$/.test(decision.incidentId ?? "")) throw new Error("invalid_agent_incident_id");
  if (!/^0x[a-f0-9]{64}$/.test(decision.policyHash ?? "")) throw new Error("invalid_agent_policy_hash");
  if (Date.parse(decision.expiresAt) <= Date.now()) throw new Error("agent_incident_already_expired");
}

async function localEntries() {
  try {
    const raw = await readFile(journalPath, "utf8");
    return raw.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

/** Reserves the one permitted paid corroboration; policy evaluation never moves funds. */
export async function reserveAgentIncident(decision) {
  assertDecision(decision);
  const database = await getDatabase();
  if (database) {
    const result = await database.query(
      `INSERT INTO atlas_agent_incidents (incident_id, policy_hash, action, status, decision, expires_at)
       VALUES ($1, $2, $3, 'reserved', $4::jsonb, $5)
       ON CONFLICT (incident_id) DO NOTHING
       RETURNING incident_id, status, created_at, expires_at`,
      [decision.incidentId, decision.policyHash, decision.action, JSON.stringify(decision), decision.expiresAt],
    );
    if (result.rowCount === 1) return { reserved: true, incident: result.rows[0] };
    return { reserved: false, reason: "incident_already_reserved_or_resolved" };
  }

  const entries = await localEntries();
  if (entries.some((entry) => entry.incidentId === decision.incidentId)) return { reserved: false, reason: "incident_already_reserved_or_resolved" };
  await mkdir(runtimeDirectory, { recursive: true });
  const incident = { incidentId: decision.incidentId, policyHash: decision.policyHash, action: decision.action, status: "reserved", decision, createdAt: new Date().toISOString(), expiresAt: decision.expiresAt };
  await appendFile(journalPath, `${JSON.stringify(incident)}\n`, "utf8");
  return { reserved: true, incident };
}

export async function recordAgentIncidentOutcome(incidentId, status, outcome) {
  if (!/^atlas-[a-f0-9]{64}$/.test(incidentId ?? "")) throw new Error("invalid_agent_incident_id");
  if (!["verified", "rejected", "expired"].includes(status)) throw new Error("invalid_agent_incident_status");
  const database = await getDatabase();
  if (!database) throw new Error("durable_database_required_to_record_payment_outcome");
  const result = await database.query(
    `UPDATE atlas_agent_incidents SET status = $2, outcome = $3::jsonb, resolved_at = NOW()
     WHERE incident_id = $1 AND status = 'reserved' RETURNING incident_id, status, resolved_at`,
    [incidentId, status, JSON.stringify(outcome ?? {})],
  );
  if (result.rowCount !== 1) throw new Error("agent_incident_not_reservable");
  return result.rows[0];
}
