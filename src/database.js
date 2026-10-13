import pg from "pg";

let pool;
let initialization;

function sslConfiguration() {
  return process.env.ATLAS_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
}

/**
 * Atlas stays usable locally without a database. In a deployed environment,
 * DATABASE_URL makes Postgres the durable source of truth instead of .runtime.
 */
export function databaseEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

export async function getDatabase() {
  if (!databaseEnabled()) return null;

  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfiguration(),
      max: 8,
    });
  }

  if (!initialization) {
    initialization = initializeSchema(pool);
  }
  await initialization;
  return pool;
}

async function initializeSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS atlas_evidence (
      id UUID PRIMARY KEY,
      kind TEXT NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS atlas_evidence_recorded_at_idx
      ON atlas_evidence (recorded_at DESC);

    CREATE TABLE IF NOT EXISTS atlas_sentinels (
      sentinel_id TEXT PRIMARY KEY,
      public_key_jwk JSONB NOT NULL,
      registered_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS atlas_sentinel_wallets (
      sentinel_id TEXT PRIMARY KEY REFERENCES atlas_sentinels(sentinel_id) ON DELETE CASCADE,
      wallet TEXT NOT NULL,
      linked_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS atlas_sentinel_wallets_wallet_idx
      ON atlas_sentinel_wallets (wallet);

    CREATE TABLE IF NOT EXISTS atlas_wallet_challenges (
      challenge_id UUID PRIMARY KEY,
      address TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS atlas_wallet_sessions (
      access_token TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS atlas_wallet_sessions_expires_at_idx
      ON atlas_wallet_sessions (expires_at);

    CREATE TABLE IF NOT EXISTS atlas_sentinel_links (
      link_code TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS atlas_sentinel_links_expires_at_idx
      ON atlas_sentinel_links (expires_at);

    CREATE TABLE IF NOT EXISTS atlas_agent_incidents (
      incident_id TEXT PRIMARY KEY,
      policy_hash TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('reserved', 'verified', 'rejected', 'expired')),
      decision JSONB NOT NULL,
      outcome JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      resolved_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS atlas_agent_incidents_status_idx
      ON atlas_agent_incidents (status, expires_at);
  `);
  await client.query(`
    ALTER TABLE atlas_agent_incidents
      DROP CONSTRAINT IF EXISTS atlas_agent_incidents_status_check;
    ALTER TABLE atlas_agent_incidents
      ADD CONSTRAINT atlas_agent_incidents_status_check
      CHECK (status IN ('reserved', 'payment_pending', 'verified', 'rejected', 'expired'));
  `);
}

export async function pruneExpiredRows() {
  const database = await getDatabase();
  if (!database) return;
  await database.query(`
    DELETE FROM atlas_wallet_challenges WHERE expires_at <= NOW();
    DELETE FROM atlas_wallet_sessions WHERE expires_at <= NOW();
    DELETE FROM atlas_sentinel_links WHERE expires_at <= NOW();
  `);
}
