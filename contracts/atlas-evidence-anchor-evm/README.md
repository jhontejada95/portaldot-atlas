# Atlas Evidence Anchor — EVM/revive PoC

This is the minimal contract candidate for the Portal V3 EVM path. It stores
only a commitment and review state; the evidence payload remains off-chain.

The contract is intentionally small so the team can test the V3 EVM route
without making the six ink! modules a prerequisite for the check-in.

## Compile

Use Solidity 0.8.24 with the `paris` EVM target and optimizer enabled. The
`paris` target avoids newer opcodes until Portal confirms the supported EVM
semantics.

```powershell
New-Item -ItemType Directory -Force target/evm | Out-Null
npx --yes solc@0.8.24 --optimize --optimize-runs 200 --evm-version paris `
  --bin --abi --metadata -o target/evm EvidenceAnchor.sol
```

## Deploy (only after explicit signer approval)

Set these environment variables in an uncommitted shell:

```powershell
$env:ATLAS_V3_EVM_RPC = "https://test-evm-rpc-v3.portaldot.dev"
$env:ATLAS_V3_EXPECTED_CHAIN_ID = "420420777"
$env:ATLAS_EVM_PRIVATE_KEY = "0x..." # never commit or paste in chat
node scripts/deploy-evm-evidence-anchor.mjs
```

The script refuses to run without the expected V3 chain ID and writes only
public deployment evidence (address, transaction hash, block number and
receipt status). It does not print or persist the private key.

This PoC is not yet a Portal V3 deployment. A real deployment must be backed
by a signed receipt, final block, explorer lookup and the exact account that
paid gas/storage.
