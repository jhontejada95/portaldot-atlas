# Atlas contracts

`atlas-epoch-credits` is the first executable on-chain component of Atlas.
It stores immutable epoch roots and awards non-transferable contribution
credits once per sentinel and epoch. It contains no exchange, transfer,
redemption, price, or promise of value.

The current source targets ink! 5 because it is the supported contract toolchain
available locally. Its build and unit tests are real compiler/test executions;
public Portaldot V3 deployment remains blocked until the organizers publish a
testnet RPC, faucet and explorer. The existing Portaldot v2 developer runtime
is known to expose a legacy `seal0` ABI, so this modern ink! bundle must not be
misrepresented as deployable there without an actual compatibility run.
