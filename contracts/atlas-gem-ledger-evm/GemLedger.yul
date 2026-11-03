// Compact seasonal Gems ledger for Portaldot V3 (pallet-revive).
// Gems are non-transferable balances with explicit owner-authorized grants
// and wallet-controlled spends to named sinks.
object "GemLedger" {
  code {
    sstore(0, caller())
    datacopy(0, dataoffset("runtime"), datasize("runtime"))
    return(0, datasize("runtime"))
  }

  object "runtime" {
    code {
      let sel := shr(224, calldataload(0))
      switch sel
      case 0x8da5cb5b {
        mstore(0, sload(0))
        return(0, 0x20)
      }

      // configureSeason(uint64 season, uint256 budget)
      case 0xd9c5e43a {
        if iszero(eq(caller(), sload(0))) { revert(0, 0) }
        let season := calldataload(4)
        mstore(0, season)
        mstore(32, 1)
        let base := keccak256(0, 64)
        sstore(base, calldataload(36))
        sstore(add(base, 1), 0)
        sstore(add(base, 2), 0)
        sstore(add(base, 3), 1)
        stop()
      }

      // closeSeason(uint64 season)
      case 0xf6d99ee0 {
        if iszero(eq(caller(), sload(0))) { revert(0, 0) }
        mstore(0, calldataload(4))
        mstore(32, 1)
        sstore(add(keccak256(0, 64), 3), 0)
        stop()
      }

      // grant(uint64 season, address wallet, uint256 amount)
      case 0x3e7e965e {
        if iszero(eq(caller(), sload(0))) { revert(0, 0) }
        let season := calldataload(4)
        let wallet := and(calldataload(36), 0xffffffffffffffffffffffffffffffffffffffff)
        let amount := calldataload(68)
        mstore(0, season)
        mstore(32, 1)
        let seasonBase := keccak256(0, 64)
        if iszero(sload(add(seasonBase, 3))) { revert(0, 0) }
        let next := add(sload(add(seasonBase, 1)), amount)
        if gt(next, sload(seasonBase)) { revert(0, 0) }
        sstore(add(seasonBase, 1), next)
        mstore(0, season)
        mstore(32, wallet)
        mstore(64, 2)
        let balanceBase := keccak256(0, 96)
        sstore(balanceBase, add(sload(balanceBase), amount))
        stop()
      }

      // balanceOf(uint64 season, address wallet) -> uint256
      case 0xb2a33b45 {
        mstore(0, calldataload(4))
        mstore(32, and(calldataload(36), 0xffffffffffffffffffffffffffffffffffffffff))
        mstore(64, 2)
        mstore(0, sload(keccak256(0, 96)))
        return(0, 0x20)
      }

      // spend(uint64 season, uint256 amount, bytes32 sinkId)
      case 0xa682cf07 {
        let season := calldataload(4)
        let amount := calldataload(36)
        let wallet := caller()
        mstore(0, season)
        mstore(32, wallet)
        mstore(64, 2)
        let balanceBase := keccak256(0, 96)
        let currentBalance := sload(balanceBase)
        if lt(currentBalance, amount) { revert(0, 0) }
        mstore(0, season)
        mstore(32, 1)
        let seasonBase := keccak256(0, 64)
        if iszero(sload(add(seasonBase, 3))) { revert(0, 0) }
        sstore(balanceBase, sub(currentBalance, amount))
        sstore(add(seasonBase, 2), add(sload(add(seasonBase, 2)), amount))
        stop()
      }

      revert(0, 0)
    }
  }
}
