# PortalDot Hacker House 2026 — submission copy

## Demo scene description (under 200 words)

Atlas is a SocialFi growth layer for protocols on Portaldot. The demo shows the complete campaign loop from both sides of the product.

First, a protocol operator uses Campaign Studio to define a campaign route, proof method, cooldown, reward budget and participant-facing rules. Next, a community member opens the Campaign Board, starts the route, completes the social quest and submits a public proof together with the wallet that should receive the reward. The submission enters Atlas's shared Review Queue, where an operator inspects the evidence and records an approval decision. After approval, the operator signs the controlled Gem grant on Portaldot V3. GemLedger records the reward on-chain, and the participant sees the accepted state and a visible Gems confirmation with an explorer link.

The video also explains the protocol-ready architecture: PortalDot is the first environment, while future adapters can extend analytics, boosters, collectible modules and network-specific reward paths without changing the core participant journey.

## Technical highlights (under 300 words)

Atlas separates campaign definition, evidence review and reward issuance into explicit stages. Campaign Studio publishes a readable campaign policy with a proof method, reward boundary, cooldown and budget. The participant flow never treats a submitted URL as an automatic reward; every proof enters a shared operator queue with a durable status and decision record.

The review queue is backed by a hosted API and PostgreSQL storage so a participant browser and an operator browser can observe the same submission. Approval is idempotent: a submission can receive only one grant, while a retry after a network interruption reconciles the queue with the confirmed transaction instead of creating a duplicate reward.

The final issuance crosses the Portaldot V3 EVM boundary through the deployed GemLedger contract. The operator signs the grant from the controlled wallet, the application waits for confirmation, then reads the participant balance back from chain. The UI exposes the resulting transaction reference and a public explorer link so the reward can be independently checked.

This design keeps the B2C journey simple while giving B2B protocol teams a reusable campaign and evidence layer. Future network adapters can reuse the same campaign state machine and replace only the chain-specific reward connector.
