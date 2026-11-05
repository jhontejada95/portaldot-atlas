import { randomUUID } from "node:crypto";
import { getDatabase } from "./database.js";

const localSubmissions = new Map();

function normalize(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id ?? row.campaignId,
    campaignTitle: row.campaign_title ?? row.campaignTitle,
    proofUrl: row.proof_url ?? row.proofUrl,
    participantWallet: row.participant_wallet ?? row.participantWallet,
    evidenceId: row.evidence_id ?? row.evidenceId ?? null,
    commitment: row.commitment ?? null,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : row.submittedAt,
    status: row.status,
    reward: Number(row.reward ?? 0),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : row.reviewedAt ?? null,
    anchorTxHash: row.anchor_tx_hash ?? row.anchorTxHash ?? null,
    reviewTxHash: row.review_tx_hash ?? row.reviewTxHash ?? null,
    grantTxHash: row.grant_tx_hash ?? row.grantTxHash ?? null,
    onChainBalance: row.on_chain_balance == null ? null : Number(row.on_chain_balance),
  };
}

export async function listCampaignSubmissions({ status } = {}) {
  const database = await getDatabase();
  if (database) {
    const result = status
      ? await database.query("SELECT * FROM atlas_campaign_submissions WHERE status = $1 ORDER BY submitted_at DESC", [status])
      : await database.query("SELECT * FROM atlas_campaign_submissions ORDER BY submitted_at DESC");
    return result.rows.map(normalize);
  }
  return [...localSubmissions.values()]
    .filter((item) => !status || item.status === status)
    .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt));
}

export async function createCampaignSubmission(input) {
  const submission = {
    id: input.id || randomUUID(),
    campaignId: input.campaignId,
    campaignTitle: input.campaignTitle,
    proofUrl: input.proofUrl,
    participantWallet: input.participantWallet,
    evidenceId: input.evidenceId ?? null,
    commitment: input.commitment ?? null,
    submittedAt: new Date().toISOString(),
    status: "pending",
    reward: Number(input.reward ?? 20),
    reviewedAt: null,
    anchorTxHash: null,
    reviewTxHash: null,
    grantTxHash: null,
    onChainBalance: null,
  };
  const database = await getDatabase();
  if (database) {
    await database.query(`
      INSERT INTO atlas_campaign_submissions
        (id, campaign_id, campaign_title, proof_url, participant_wallet, evidence_id, commitment, submitted_at, status, reward)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
      ON CONFLICT (id) DO NOTHING
    `, [submission.id, submission.campaignId, submission.campaignTitle, submission.proofUrl, submission.participantWallet, submission.evidenceId, submission.commitment, submission.submittedAt, submission.reward]);
    const result = await database.query("SELECT * FROM atlas_campaign_submissions WHERE id = $1", [submission.id]);
    return normalize(result.rows[0]);
  }
  localSubmissions.set(submission.id, submission);
  return submission;
}

export async function updateCampaignSubmission(id, patch) {
  const database = await getDatabase();
  if (database) {
    const result = await database.query(`
      UPDATE atlas_campaign_submissions
      SET status = COALESCE($2, status), reviewed_at = COALESCE($3, reviewed_at),
          anchor_tx_hash = COALESCE($4, anchor_tx_hash), review_tx_hash = COALESCE($5, review_tx_hash),
          grant_tx_hash = COALESCE($6, grant_tx_hash), on_chain_balance = COALESCE($7, on_chain_balance),
          participant_wallet = COALESCE($8, participant_wallet)
      WHERE id = $1
      RETURNING *
    `, [id, patch.status ?? null, patch.reviewedAt ?? null, patch.anchorTxHash ?? null, patch.reviewTxHash ?? null, patch.grantTxHash ?? null, patch.onChainBalance ?? null, patch.participantWallet ?? null]);
    return result.rows[0] ? normalize(result.rows[0]) : null;
  }
  const existing = localSubmissions.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  localSubmissions.set(id, updated);
  return updated;
}
