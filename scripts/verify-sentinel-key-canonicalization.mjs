import assert from "node:assert/strict";
import { sameSentinelPublicKey, sentinelKeyCommitment } from "../src/sentinel-registry.js";
import { assertWalletAuthOrigin } from "../src/wallet-auth.js";

const originalOrder = { kty: "EC", crv: "P-256", x: "example-x", y: "example-y", ext: true, key_ops: ["verify"] };
const postgresOrder = { crv: "P-256", ext: true, key_ops: ["verify"], kty: "EC", x: "example-x", y: "example-y" };

assert.equal(sameSentinelPublicKey(originalOrder, postgresOrder), true, "the same JWK must survive JSONB key ordering");
assert.equal(sameSentinelPublicKey(originalOrder, { ...postgresOrder, y: "different-y" }), false, "a different device key must still conflict");
assert.equal(
  sentinelKeyCommitment(originalOrder),
  sentinelKeyCommitment(postgresOrder),
  "the on-chain commitment must ignore JWK metadata/property order",
);
assert.notEqual(
  sentinelKeyCommitment(originalOrder),
  sentinelKeyCommitment({ ...postgresOrder, y: "different-y" }),
  "different P-256 material must have a different commitment",
);
assert.throws(
  () => sentinelKeyCommitment({ kty: "EC", crv: "P-384", x: "example-x", y: "example-y" }),
  /invalid_sentinel_public_key/,
  "unsupported key material must never yield a commitment",
);
assert.equal(assertWalletAuthOrigin("https://portaldot-atlas.vercel.app"), "https://portaldot-atlas.vercel.app");
assert.equal(assertWalletAuthOrigin("http://127.0.0.1:5174"), "http://127.0.0.1:5174");
assert.throws(() => assertWalletAuthOrigin("https://unexpected.example"), /wallet_auth_origin_not_allowed/);
console.log("Sentinel key canonicalization, commitment and wallet-origin guard passed.");
