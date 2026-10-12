# Atlas contracts

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
available locally. Its build and unit tests are real compiler/test executions;
public Portaldot V3 deployment remains blocked until the organizers publish a
testnet RPC, faucet and explorer. The existing Portaldot v2 developer runtime
is known to expose a legacy `seal0` ABI, so this modern ink! bundle must not be
misrepresented as deployable there without an actual compatibility run.
