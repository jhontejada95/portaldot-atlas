// Generated from contracts/atlas-gem-ledger-evm/GemLedger.yul.
export const gemLedgerAbi = [
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "season", type: "uint64" }, { name: "budget", type: "uint256" }], name: "configureSeason", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "season", type: "uint64" }], name: "closeSeason", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "season", type: "uint64" }, { name: "wallet", type: "address" }, { name: "amount", type: "uint256" }], name: "grant", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "season", type: "uint64" }, { name: "wallet", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "season", type: "uint64" }, { name: "amount", type: "uint256" }, { name: "sinkId", type: "bytes32" }], name: "spend", outputs: [], stateMutability: "nonpayable", type: "function" },
];

export const gemLedgerBytecode = "0x336000556101836100146000396101836000f3fe60003560e01c80638da5cb5b14610177578063d9c5e43a14610144578063f6d99ee0146101245780633e7e965e146100c5578063b2a33b451461009d5763a682cf071461004b57600080fd5b600435602435903381600052602052600260405260606000209182549181831061009857600052600160205260406000209260038401541561009857816002930390558183015401910155005b600080fd5b60043560009081526024356001600160a01b0316602090815260026040526060822054825290f35b60005433036100985760043560018060a01b036024351660443591806000526001602052604060002060038101541561009857836001820154019080548211610098576001015560005260205260026040526060600020908154019055005b600054330361009857600435600052600160205260006003604082200155005b60005433036100985760043560005260016020526001600360406000206024358155600083820155600060028201550155005b60005460005260206000f3";
