// Atlas EvidenceAnchor for Portaldot V3 (pallet-revive).
//
// This is intentionally hand-written Yul. Portaldot V3 exposes the EVM/revive
// path, while its native Contracts RPC is not enabled on the V3 endpoint. The
// compact artifact also keeps the V3 storage deposit and deployment fee small.
// The deployer is the owner; evidence payloads remain off-chain and only their
// commitment, submitter, season, timestamp and review status are anchored.
object "EvidenceAnchor" {
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

      // anchor(bytes32 evidenceId, bytes32 commitment, uint64 season)
      case 0x15954b2c {
        if iszero(eq(caller(), sload(0))) { revert(0, 0) }
        let id := calldataload(4)
        let commitment := calldataload(36)
        let season := calldataload(68)
        mstore(0, id)
        mstore(32, 1)
        let base := keccak256(0, 64)
        if sload(add(base, 2)) { revert(0, 0) }
        sstore(base, commitment)
        sstore(add(base, 1), caller())
        sstore(add(base, 2), or(shl(192, season), shl(160, timestamp())))
        mstore(0, season)
        log4(0, 32, 0x6c0340cd26b3d793ac9d4ada320ae9330dc6b0d2b356bdc70aaeedd9ccf5461c, id, commitment, caller())
        stop()
      }

      // review(bytes32 evidenceId, uint8 status)
      case 0x7302d051 {
        if iszero(eq(caller(), sload(0))) { revert(0, 0) }
        let id := calldataload(4)
        let status := and(calldataload(36), 0xff)
        mstore(0, id)
        mstore(32, 1)
        let base := keccak256(0, 64)
        let packed := sload(add(base, 2))
        if iszero(packed) { revert(0, 0) }
        sstore(add(base, 2), or(and(packed, not(0xff)), status))
        log2(0, 0, 0x083de80fafb45b8b45494a0680dc06f033f4c2c96b8a64e9fcc454b2dfc85e06, id)
        stop()
      }

      // getRecord(bytes32) -> (address,uint64,uint64,uint8,bytes32)
      case 0x213681cd {
        let id := calldataload(4)
        mstore(0, id)
        mstore(32, 1)
        let base := keccak256(0, 64)
        let packed := sload(add(base, 2))
        mstore(0x00, sload(add(base, 1)))
        mstore(0x20, shr(192, packed))
        mstore(0x40, and(shr(160, packed), 0xffffffffffffffffffffffff))
        mstore(0x60, and(packed, 0xff))
        mstore(0x80, sload(base))
        return(0, 0xa0)
      }

      revert(0, 0)
    }
  }
}
