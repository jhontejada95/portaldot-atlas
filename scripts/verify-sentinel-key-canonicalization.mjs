import assert from "node:assert/strict";
import { sameSentinelPublicKey } from "../src/sentinel-registry.js";

const originalOrder = { kty: "EC", crv: "P-256", x: "example-x", y: "example-y", ext: true, key_ops: ["verify"] };
const postgresOrder = { crv: "P-256", ext: true, key_ops: ["verify"], kty: "EC", x: "example-x", y: "example-y" };

assert.equal(sameSentinelPublicKey(originalOrder, postgresOrder), true, "the same JWK must survive JSONB key ordering");
assert.equal(sameSentinelPublicKey(originalOrder, { ...postgresOrder, y: "different-y" }), false, "a different device key must still conflict");
console.log("Sentinel JWK canonicalization passed.");
