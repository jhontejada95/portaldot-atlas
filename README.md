# Portaldot Atlas

Atlas is a live, read-only Portaldot reliability probe and the first component
of a contribution protocol. It does not fabricate endpoint health, historical
blocks, locations, rewards, or network measurements.

## Current implementation

- `src/portaldot-probe.js` samples a WebSocket endpoint directly and returns
  chain identity, finality evidence, runtime identity, health and latency.
- `GET /v1/independent-probe` is an x402-paid resource. Once publicly hosted,
  another Atlas agent can pay for a fresh independent measurement only when its
  incident policy requires corroboration.
- The route is deliberately read-only. It neither signs nor submits a
  Portaldot transaction.
- Every paid response includes an EIP-191 attestation over its exact live
  probe payload. The server refuses to start without its distinct signing key.
- `GET /v1/network-status` generates a fresh, signed Portaldot observation on
  demand for the public dashboard. `GET /v1/evidence/recent` returns the
  append-only local journal of live observations created by Atlas; unsigned
  failures are not exposed as evidence and it never ships prefilled telemetry.
- `dashboard/` is the Atlas web workspace. Its overview, evidence, inbox, and
  Sentinel views call the API at runtime and explicitly show unavailable
  states where an on-chain epoch or personal device relationship does not yet
  exist.

## Durable deployment storage

Atlas supports two explicitly different modes:

- **Local proof mode:** with no `DATABASE_URL`, it writes live evidence and a
  linked-Sentinel registry under `.runtime/`. This is useful only for a local
  developer session and remains excluded from Git.
- **Hosted MVP mode:** when `DATABASE_URL` is present, the API initializes its
  Postgres schema on startup and stores evidence, Sentinel public keys,
  wallet–Sentinel links, short-lived wallet challenges and sessions there.
  `/health` reports `storage: "postgres"`; do not treat a deployed API that
  reports `local-runtime` as durable.

For the hosted MVP, Render runs the API and Neon runs the durable Postgres
database. Set Neon's pooled `DATABASE_URL` in Render, set
`ATLAS_DATABASE_SSL=true`, and let Render provide `PORT` automatically. Do
not set `ATLAS_PORT` in that service. The server already prefers platform
`PORT` when present. Keep `ATLAS_SENTINEL_PRIVATE_KEY` and `ATLAS_PAY_TO` only
in Render's encrypted environment variables.

`render.yaml` declares the free Render Web Service without committing any
secret. Creating the Blueprint prompts for the Neon connection string, the
Base Sepolia receiver address, and the server signing key. This is deliberate:
do not put those values in Git, a dashboard build, or the Sentinel package.

Wallet challenges are issued only to the known Atlas dashboard origins (or a
loopback Vite origin during local development). Add a deliberate extra
dashboard host through `ATLAS_WALLET_AUTH_ORIGINS`; the API refuses to act as a
generic wallet-signing oracle for an arbitrary `Origin` header.

After the Render service has a URL, set it as `VITE_ATLAS_API_ORIGIN` in
Vercel (Production and Preview) before building the dashboard. This is public
configuration, not a secret: it tells the browser where Atlas's API lives.
Leave it unset locally so Vite keeps proxying `/v1` to `localhost:4030`.
The deploy is not considered durable until this real post-deploy check passes:

```powershell
$env:ATLAS_API_URL = "https://your-render-service.onrender.com"
npm run verify:hosted-postgres
```

It demands `/health` report `postgres`, makes a fresh live Portaldot
observation, verifies its EIP-191 signature, and confirms the exact record was
persisted in the public evidence feed.

## Verified x402 evidence

On 2026-10-10, a Base Sepolia test payer bought a live Portaldot probe for
`$0.001` USDC. The returned measurement was signed by Atlas and its signature
was independently verified. The public settlement transaction is
[0x2a3f…bac1](https://sepolia.basescan.org/tx/0x2a3f66ede55ba8bccad3ef3bf2f5fdf066f63b5f67a60b6a456fe869c588bac1).

## Run a real probe

```powershell
npm install
npm run verify:live
```

The default endpoint is the official Portaldot mainnet WebSocket endpoint.
Provide `ATLAS_EXPECTED_GENESIS` only after independently recording the
network identity to make a wrong-network connection fail closed.

## Start the paid corroboration service

1. Run `npm run init:receiver` to create dedicated local receiver and signer
   keys, or set their values in an uncommitted `.env.local`.
3. Run `npm start`.
4. An unpaid request to `/v1/independent-probe` must return an x402 `402`.

For a real monitoring check, request `GET /v1/network-status`; then inspect
`GET /v1/evidence/recent`. Both endpoints operate against the configured live
Portaldot endpoint at request time. The journal is intentionally local until a
public Atlas deployment and a second independent sentinel exist.

With the server running, `npm run verify:monitor` performs an end-to-end live
check: it requests fresh monitoring data, validates the Portaldot identity,
and independently verifies every displayed EIP-191 evidence signature.

## Dashboard

Start the live API first with `npm start`. In another terminal, run the
following from `dashboard/`:

```powershell
npm install
npm run dev
```

The dashboard uses relative `/v1/*` calls. Vite proxies those calls to the
local Atlas API during development; a production deployment must provide the
same-origin API route. The user-facing interface never seeds blocks, latency,
credits, rewards, or activity: it renders loading, live, empty, and error
states from the API response itself.

## Sentinel extension runtime

`sentinel-extension/` is a Manifest V3 Chrome runtime for the participant
side of Atlas. Once enabled by the user, it performs short real WebSocket
checks, signs each one with a device-specific P-256 key, and sends it to Atlas
for signature and network-identity validation. It is not a proxy, bandwidth
sharing client, or browser-history collector. Its popup is functional: the
participant selects a backend and schedule, enables checks, can request one
immediate live check, and sees only the latest locally recorded acceptance
receipt or error.

With the Atlas server running, `npm run verify:sentinel` creates an ephemeral
device identity, registers it, and submits a newly collected live Portaldot
observation. This is an integration proof, not a user reward or fabricated
telemetry.

Settlement is not claimed until a separate payer wallet makes an actual,
authorized x402 request and the resulting transaction is recorded publicly.

`npm run probe:paid` is deliberately blocked by default. It first atomically
claims a still-reserved, deterministic `ATLAS_AGENT_INCIDENT_ID` in durable
storage, re-reads the unpaid `402` offer, and refuses to pay unless network,
exact amount and reviewed receiver match the hard gates. It additionally
requires the one-time confirmation value
`ATLAS_PAID_PROBE_CONFIRMATION=approve-atlas-x402-once`. Supplying a private
key alone is never enough. A transport failure after initiating payment leaves
the incident `payment_pending` for manual reconciliation and blocks an
automatic retry. Do not set those values or run the command without explicit
human authorization for a real testnet payment.

## Agent boundary

`npm run agent:observe` performs one real read-only Portaldot observation and
records an EIP-191 signature over the exact observation. It then evaluates the
versioned, deterministic reliability policy; no language model, wallet choice,
or private key is part of that decision.

The policy hash, a five-minute expiry, Base Sepolia/exact-payment constraint,
and an incident hash derived from the three signed failures are recorded with
each decision. A paid corroboration must first reserve that incident in the
durable database; the unique incident id makes a second reservation fail even
after a process restart. The command never calls the paid endpoint and cannot
move funds. A separately authorized worker would still have to validate every
x402 requirement and record the actual payment outcome.

The latest live run returned a `hold` decision because the public endpoint was
healthy. Atlas does not manufacture failures to demonstrate the escalation
path.

`GET /v1/agent/status` re-verifies the retained agent signatures and exposes
the current policy hash, most recent signed observation, and deterministic
gate to the dashboard. It is status-only: it does not reserve an incident or
contact the paid x402 resource.

## On-chain contribution record

`contracts/atlas-sentinel-registry` is an executable ink! contract that records
only a 32-byte commitment to a Sentinel device key, its owner wallet and its
active/revoked state. The public key itself, browser identity and observations
stay off-chain. Its owner-only revocation keeps retired device keys auditable
without allowing their silent reassignment.
The API returns the deterministic `keyCommitment` at Sentinel registration;
it is Blake2x256 over the P-256 public material only and is the exact value
that will be registered if a public testnet deployment is approved.
The locally built package contains a 16,614-byte Wasm and its `.contract`
bundle SHA-256 is:

```text
ae27646e6a1facfcf2ef0a3c171d6a0f3b4247c1113dacab8bed55cf8cb598d9
```

`contracts/atlas-epoch-credits` is an executable ink! contract for immutable
epoch roots and one-time, non-transferable Atlas Credit claims. Each epoch
also commits its public policy hash and accepted-record count; each claim
binds the wallet, amount and a hash of the exact accepted receipt set. This
prevents a later change to the off-chain receipt set from silently preserving
the same on-chain balance. Its five invariant tests passed, and its release bundle was built locally with
`cargo-contract 5.0.1`. The resulting Wasm is 23,124 bytes with SHA-256:

```text
81ee8f6c55965b44fff7f294cbddcc31037fba9cf34eadfbd6c318722a9abe47
```

This proves a real compile/package only. The current public Portaldot endpoint
does not expose a V3 testnet deployment path, so this artifact is not claimed
as deployed until that path is available and exercised.

The public Mainnet RPC can be checked read-only with:

```powershell
npm run verify:contract-capabilities
```

This confirms whether its Contracts runtime APIs are exposed; it never uploads
Wasm, instantiates a contract, signs, or submits a transaction. A visible
testnet path with faucet and explorer remains the required deployment gate;
the presence of Mainnet APIs is not permission to deploy there.

When organizers publish a testnet endpoint, its genesis hash and a public
explorer, place those three values in the separate `ATLAS_CONTRACT_*`
variables and run:

```powershell
npm run verify:contract-deployment-preflight
```

The preflight refuses any value other than `testnet`, rejects Mainnet's
genesis hash, and requires metadata for both the Credits and Sentinel Registry
bundles. Passing it is still not deployment: a human must explicitly authorize
the later signing and testnet transaction.

### Local Portaldot contract readiness

Portaldot's official Windows guidance uses a manually started development node
inside WSL. Once the user has obtained and started that node, verify only its
live chain identity, contract APIs and Atlas bundles with:

```powershell
npm run verify:local-contract-runtime
```

It defaults to `ws://127.0.0.1:9944` and does not need an account, test POT,
upload, instantiation or transaction. It is a readiness gate, not a deployment
command.

## Deterministic epoch plans

`src/epoch-builder.js` produces an epoch plan only from accepted Sentinel
receipts already present in Atlas storage. It re-verifies every P-256 client
signature, checks the expected Portaldot genesis, applies the public 15-minute
per-Sentinel interval and wallet cap, then creates a Merkle root and each
claim proof. It does not publish a root, mint a credit, or create evidence.

Run the live-data verifier with:

```powershell
npm run verify:epoch-plan
npm run verify:epoch-contract-compat
npm run verify:sentinel-registry-contract
```

`verify:epoch-contract-compat` checks fixed SCALE/Blake2x256 vectors in the
JavaScript builder against identical vectors asserted by the ink! contract.
It creates no receipt, epoch, transaction, or claim.

To inspect a closed window without publishing it, call the script directly:

```powershell
node scripts/build-epoch-plan.mjs --epoch 1 --from 2026-10-11T00:00:00.000Z --to 2026-10-12T00:00:00.000Z
```
