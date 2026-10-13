import assert from "node:assert/strict";
import { u8aToHex } from "@polkadot/util";
import { claimLeaf, pairHash } from "../src/epoch-builder.js";

// Alice is the public Substrate development account only. This is a fixed
// encoding vector, not a recipient, a test claim, or evidence.
const wallet = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const commitment = `0x${"11".repeat(32)}`;
const leaf = u8aToHex(claimLeaf(wallet, "42", commitment));
const pair = u8aToHex(pairHash(
  Uint8Array.from(Buffer.from("10".repeat(32), "hex")),
  Uint8Array.from(Buffer.from("20".repeat(32), "hex")),
));

assert.equal(
  leaf,
  "0x32b80e3353b994a8972a1f5a92ac9a297daa8a16e2795557a5fc4beb8343a953",
  "JavaScript claim leaf must match AtlasEpochCredits::leaf",
);
assert.equal(
  pair,
  "0xa1668027a6f919e32f620e77ea0eae8f178438dafa93fa2fd496b6fbb8ce10d2",
  "JavaScript Merkle pair must match AtlasEpochCredits::pair_hash",
);

console.log(JSON.stringify({
  verified: true,
  schema: "atlas.epoch-contract-compatibility.v1",
  leaf,
  pair,
}, null, 2));
