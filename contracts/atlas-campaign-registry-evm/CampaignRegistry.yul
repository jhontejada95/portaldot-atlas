// Compact campaign registry for Portaldot V3 (pallet-revive).
// Storage is intentionally explicit so the artifact stays small and cheap.
object "CampaignRegistry" {
  code {
    sstore(0, caller())
    datacopy(0, dataoffset("runtime"), datasize("runtime"))
    return(0, datasize("runtime"))
  }

  object "runtime" {
    code {
      let sel := shr(224, calldataload(0))

      // owner() -> address
      switch sel
      case 0x8da5cb5b {
        mstore(0, sload(0))
        return(0, 0x20)
      }

      // create(bytes32 id, bytes32 rulesHash, uint256 budget,
      //        uint256 maxPerWallet, uint64 cooldown, uint64 startsAt,
      //        uint64 endsAt)
      case 0x45dd6499 {
        let id := calldataload(4)
        let rules := calldataload(36)
        if iszero(id) { revert(0, 0) }
        if iszero(rules) { revert(0, 0) }
        mstore(0, id)
        mstore(32, 1)
        let base := keccak256(0, 64)
        if sload(base) { revert(0, 0) }
        sstore(base, caller())
        sstore(add(base, 1), rules)
        sstore(add(base, 2), calldataload(68))
        sstore(add(base, 3), calldataload(100))
        sstore(add(base, 4), calldataload(132))
        sstore(add(base, 5), calldataload(164))
        sstore(add(base, 6), calldataload(196))
        // Draft = 0
        stop()
      }

      // publish(bytes32 id), pause(bytes32 id), close(bytes32 id)
      case 0x8b2e6dcf { changeState(calldataload(4), 1) }
      case 0xed56531a { changeState(calldataload(4), 2) }
      case 0x39c79e0c { changeState(calldataload(4), 3) }

      // exists(bytes32 id) -> bool
      case 0x38a699a4 {
        mstore(0, calldataload(4))
        mstore(32, 1)
        let base := keccak256(0, 64)
        mstore(0, iszero(iszero(sload(base))))
        return(0, 0x20)
      }

      // campaign(bytes32 id) -> (address,bytes32,uint256,uint256,uint64,uint64,uint64,uint8)
      case 0x6a8b4a32 {
        mstore(0, calldataload(4))
        mstore(32, 1)
        let base := keccak256(0, 64)
        mstore(0x00, sload(base))
        mstore(0x20, sload(add(base, 1)))
        mstore(0x40, sload(add(base, 2)))
        mstore(0x60, sload(add(base, 3)))
        mstore(0x80, sload(add(base, 4)))
        mstore(0xa0, sload(add(base, 5)))
        mstore(0xc0, sload(add(base, 6)))
        mstore(0xe0, sload(add(base, 7)))
        return(0, 0x100)
      }

      function changeState(id, next) {
        mstore(0, id)
        mstore(32, 1)
        let base := keccak256(0, 64)
        if iszero(eq(sload(base), caller())) { revert(0, 0) }
        sstore(add(base, 7), next)
        stop()
      }

      revert(0, 0)
    }
  }
}
