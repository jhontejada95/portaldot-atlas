# Atlas — Week 2 check-in package

## Project progress

Atlas is a campaign participation hub for Portaldot communities. The current
demo flow is implemented and publicly reachable:

1. Discover the active campaign.
2. Open the Campaign Board and inspect the quest rule.
3. Complete the social/observation action and submit its evidence.
4. Move through the visible review state.
5. Update Gems, Campaign Score and Rank.
6. Open the Reward Hub and preview the next reward route.

The public demo is available at <https://portaldot-atlas.vercel.app/>.

## Portaldot integration

The app connects to the official V3 identity in read-only mode and supports
SubWallet connection for the native account. The V3 proof records chain
identity, chain ID, runtime fingerprint, finalized block and wallet state. It
does not claim a contract deployment until a signed transaction, final block
and explorer record exist.

## Contract work

The repository contains six tested ink! modules and release bundles for:

- Evidence Anchor
- Campaign Registry
- Gem Ledger
- Module Station
- Booster Module
- Campaign Treasury

Because the current V3 Substrate endpoint does not expose the expected
`contracts_call`/`contracts_instantiate` methods, these are deployment-ready
artifacts rather than claimed V3 deployments.

We also prepared a minimal EVM/revive `EvidenceAnchor` candidate under
`contracts/atlas-evidence-anchor-evm`. It is compiled for Solidity 0.8.24,
optimizer enabled and `paris` EVM semantics. This is the fastest candidate to
test against `test-evm-rpc-v3`; deployment remains gated by an approved signer
and a real receipt.

## Remaining work before final submission

- Capture the final 60–120 second demo video.
- Add a signed transaction only if the official EVM deployment path is
  reproducible and the signer explicitly approves it.
- Complete the DoraHacks form with the public URL, repository and video.

## Evidence boundary

No contract address, transaction hash or mainnet deployment is claimed in this
package without a real receipt. Local and read-only evidence is labelled as
such so reviewers can reproduce the demonstrated path.
