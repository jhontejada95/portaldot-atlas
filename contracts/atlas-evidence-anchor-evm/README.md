# Atlas Evidence Anchor — EVM/revive V3 artifact

This is the minimal contract candidate for the Portal V3 EVM path. It stores
only a commitment and review state; the evidence payload remains off-chain.

The contract is intentionally hand-written in Yul so the team can use the V3
EVM/revive route without making the six ink! modules a prerequisite for the
check-in. The deployer is the owner and the contract emits evidence/review
events; payloads remain off-chain.

## Compile

Use solc 0.8.28 with the Yul optimizer at `runs=1`, optimizer steps `u:` and
the `paris` EVM target. This matches the compact V3 pattern used by the
working PotKit deployment and avoids newer opcodes such as `PUSH0`.

```powershell
New-Item -ItemType Directory -Force target/evm | Out-Null
node -e "const solc=require('solc'),fs=require('fs'); const src=fs.readFileSync('EvidenceAnchor.yul','utf8'); const input={language:'Yul',sources:{'EvidenceAnchor.yul':{content:src}},settings:{optimizer:{enabled:true,runs:1,details:{yul:true,yulDetails:{optimizerSteps:'u:'}}},evmVersion:'paris',outputSelection:{'*':{'*':['evm.bytecode.object','evm.deployedBytecode.object']}}}}; const out=JSON.parse(solc.compile(JSON.stringify(input))); const c=out.contracts['EvidenceAnchor.yul'].EvidenceAnchor; fs.writeFileSync('target/evm/EvidenceAnchor.bytecode','0x'+c.evm.bytecode.object);"
```

## Deploy from Atlas (only after explicit signer approval)

Set these environment variables in an uncommitted shell:

```powershell
$env:ATLAS_V3_EVM_RPC = "https://test-evm-rpc-v3.portaldot.dev"
$env:ATLAS_V3_EXPECTED_CHAIN_ID = "420420777"
Open `/evm-deploy`, connect Rabby on chain `420420777`, run the read-only
simulation, and only then use the wallet confirmation button. The browser
wallet remains the only signer; no seed phrase or private key is required.
```

The script refuses to run without the expected V3 chain ID and writes only
public deployment evidence (address, transaction hash, block number and
receipt status). It does not print or persist the private key.

This is not yet a Portal V3 deployment. A real deployment must be backed by a
signed receipt, final block, explorer lookup and the exact account that paid
gas/storage. The mapped native account must be funded first; the EVM balance
alone is not enough to pay the V3 storage deposit.
