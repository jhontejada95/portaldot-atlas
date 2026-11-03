// Generated from contracts/atlas-campaign-registry-evm/CampaignRegistry.yul.
export const campaignRegistryAbi = [
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [
    { name: "campaignId", type: "bytes32" }, { name: "rulesHash", type: "bytes32" },
    { name: "budget", type: "uint256" }, { name: "maxPerWallet", type: "uint256" },
    { name: "cooldown", type: "uint64" }, { name: "startsAt", type: "uint64" }, { name: "endsAt", type: "uint64" },
  ], name: "create", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "campaignId", type: "bytes32" }], name: "publish", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "campaignId", type: "bytes32" }], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "campaignId", type: "bytes32" }], name: "close", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "campaignId", type: "bytes32" }], name: "exists", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "campaignId", type: "bytes32" }], name: "campaign", outputs: [
    { type: "address" }, { type: "bytes32" }, { type: "uint256" }, { type: "uint256" },
    { type: "uint64" }, { type: "uint64" }, { type: "uint64" }, { type: "uint8" },
  ], stateMutability: "view", type: "function" },
];

export const campaignRegistryBytecode = "0x336000556101676100146000396101676000f3fe60003560e01c80638da5cb5b1461014057806345dd6499146100e35780638b2e6dcf146100d9578063ed56531a146100cf57806339c79e0c146100c557806338a699a4146100a957636a8b4a321461005657600080fd5b60043560005260016020526007604060002080546000526001810154602052600281015460405260038101546060526004810154608052600581015460a052600681015460c052015460e0526101006000f35b6004356000526001602052604060002054151560005260206000f35b600360043561014c565b600260043561014c565b600160043561014c565b602435600435801561013b57811561013b576000526001602052604060002090815461013b57338255600182015560443560028201556064356003820155608435600482015560a4356005820155600660c435910155005b600080fd5b60005460005260206000f35b600052600160205260406000203381540361013b576007015500";
