// Generated from contracts/atlas-evidence-anchor-evm/EvidenceAnchor.yul.
// Compiler profile: solc 0.8.28, Yul optimizer runs=1, EVM Paris, no metadata.
// The V3 runtime supports this compact EVM/revive artifact; the old Solidity
// artifact is intentionally not used for V3 deployment.
export const evidenceAnchorAbi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "evidenceId", type: "bytes32" },
      { internalType: "bytes32", name: "commitment", type: "bytes32" },
      { internalType: "uint64", name: "season", type: "uint64" },
    ],
    name: "anchor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "evidenceId", type: "bytes32" }],
    name: "getRecord",
    outputs: [
      {
        components: [
          { internalType: "address", name: "submitter", type: "address" },
          { internalType: "uint64", name: "season", type: "uint64" },
          { internalType: "uint64", name: "createdAt", type: "uint64" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "bytes32", name: "commitment", type: "bytes32" },
        ],
        internalType: "struct EvidenceAnchor.Record",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "evidenceId", type: "bytes32" },
      { internalType: "uint8", name: "status", type: "uint8" },
    ],
    name: "review",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "evidenceId", type: "bytes32" },
      { indexed: true, internalType: "bytes32", name: "commitment", type: "bytes32" },
      { indexed: true, internalType: "address", name: "submitter", type: "address" },
      { indexed: false, internalType: "uint64", name: "season", type: "uint64" },
    ],
    name: "EvidenceAnchored",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "evidenceId", type: "bytes32" },
      { indexed: false, internalType: "uint8", name: "status", type: "uint8" },
    ],
    name: "EvidenceReviewed",
    type: "event",
  },
];

export const evidenceAnchorBytecode =
  "0x336000556101536100146000396101536000f3fe60003560e01c80638da5cb5b1461014757806315954b2c146100da5780637302d051146100785763213681cd1461003557600080fd5b6004356000526001602052604060002060ff600282015460018301546000528060c01c60205260018060601b038160a01c16604052166060525460805260a06000f35b60005433036100d5576004356000818152600160205260409020600281015460243560ff1681156100d55760029160ff1916179101557f083de80fafb45b8b45494a0680dc06f033f4c2c96b8a64e9fcc454b2dfc85e06600080a2005b600080fd5b60005433036100d557600435602435604435826000526001602052604060002060028101546100d55782815533600182015560024260a01b8360c01b1791015560005233917f6c0340cd26b3d793ac9d4ada320ae9330dc6b0d2b356bdc70aaeedd9ccf5461c60206000a4005b60005460005260206000f3";
