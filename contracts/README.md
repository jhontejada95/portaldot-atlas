# Atlas contracts

`atlas-epoch-credits` and `atlas-sentinel-registry` are the original executable
on-chain components of Atlas. The additional crates in this directory are the
post-pivot campaign/economy contracts: `atlas-evidence-anchor`,
`atlas-campaign-registry`, `atlas-gem-ledger`, `atlas-module-station`,
`atlas-booster-module` and `atlas-campaign-treasury`.

All of these are source code and locally tested ink! bundles. **None of the
contracts in this directory is currently deployed or instantiated on Portal
V3.** A deployed contract would require a public address, a deployment
transaction hash and a block/explorer record. We have none of those for Atlas.

`atlas-epoch-credits` is the first executable on-chain component of Atlas.
It stores immutable epoch roots and awards non-transferable contribution
credits once per sentinel and epoch. Each claim binds an account, amount and
a contribution commitment; each published epoch also binds a policy hash and
the number of accepted records. It contains no exchange, transfer, redemption,
price, or promise of value.

The off-chain epoch builder uses the same SCALE leaf encoding and Blake2x256
pairing rule as the contract. A plan is not a published epoch: `publish_epoch`
and `claim` remain explicit signed chain calls after a public Portaldot
deployment path is validated.

The current source targets ink! 5 because it is the supported contract toolchain
available locally. Their build and unit tests are real compiler/test executions;
public Portaldot V3 deployment remains gated on verified metadata/ABI and a
runtime that exposes contract call/instantiate capabilities. The 500 tPOT in
the wallet is sufficient to fund a later deployment attempt, but funding alone
does not prove that contract execution is enabled. The existing Portaldot v2
developer runtime is known to expose a legacy `seal0` ABI, so these modern
ink! bundles must not be misrepresented as deployable there without an actual
compatibility run.

## Contract responsibilities

- `atlas-sentinel-registry`: device-key commitments and revocation.
- `atlas-epoch-credits`: evidence-root claims and non-transferable credits.
- `atlas-evidence-anchor`: minimized evidence commitments and review state.
- `atlas-campaign-registry`: protocol campaigns, policy hashes, budgets and lifecycle.
- `atlas-gem-ledger`: seasonal Gems claims and explicit sinks/spending.
- `atlas-module-station`: non-transferable contribution Modules.
- `atlas-booster-module`: one active, fixed-rule seasonal Booster per wallet.
- `atlas-campaign-treasury`: optional native-token sponsor budget and releases.

The campaign registry and evidence anchor are the next core contracts for the
MVP. Modules, Boosters and Treasury are implemented as guarded contracts but
should only be deployed after the campaign/proof flow and V3 compatibility are
verified. No marketplace, random boxes or transferability are included.
