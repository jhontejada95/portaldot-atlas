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

## Agent boundary

Atlas needs a durable agent runtime for its incident loop. Eve is the chosen
runtime, but Eve currently requires Node 24 while this workspace has Node 22.
The protocol, live probe and paid resource remain usable without pretending a
language model is making safety-critical decisions. The agent may only request
an independent probe under the policy documented in `PROTOCOL_BRIEF.md`.

## On-chain contribution record

`contracts/atlas-epoch-credits` is an executable ink! contract for immutable
epoch roots and one-time, non-transferable Atlas Credit claims. Its two
invariant tests passed, and its release bundle was built locally with
`cargo-contract 5.0.1`. The resulting Wasm is 9,420 bytes with SHA-256:

```text
c278778937ce5521bf5e95afddfc15aaa7c1deddec6be2aca7c0cdc6753e5641
```

This proves a real compile/package only. The current public Portaldot endpoint
does not expose a V3 testnet deployment path, so this artifact is not claimed
as deployed until that path is available and exercised.
