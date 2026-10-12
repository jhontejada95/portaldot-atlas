# Atlas — Product, Credits and Brand Brief

## 1. Product truth

**Atlas** is a Portaldot reliability-evidence protocol. A participant installs **Sentinel**, a browser extension that runs only user-authorized checks against Portaldot. Sentinel signs an accepted observation with a device-local P-256 key; Atlas validates it, preserves the signed receipt and shows it to the wallet that linked the device.

Atlas is **not** a proxy, VPN, bandwidth-sharing product, browsing-analytics product, token wallet, or financial-rewards program today.

### Product architecture

| Name | Role | What it does today |
| --- | --- | --- |
| Atlas | The protocol and public workspace | Validates and presents live Portaldot evidence. |
| Sentinel | Atlas browser extension | Runs opted-in checks, maintains a device-local key and submits signed observations. |
| Contribution record | The durable receipt | A live accepted Sentinel observation bound to a linked wallet. |
| Epoch Credits | Future non-transferable credits | Cannot show a balance or a claim until an epoch root is publicly deployed on Portaldot. |

## 2. Decisions: credits, inbox and profile

### 2.1 Credits must remain real

The empty **Epoch Credits** card is correct today. No public Portaldot credit contract, epoch root, merkle proof, or claim transaction exists yet. Showing a number, a dollar value, a claim button, a tier, or a reward store balance before those facts exist would violate Atlas's product-truth rule.

The right interim experience is **Contribution Progress**, not pretend credits. It may show only values computed from accepted Sentinel receipts:

- accepted observations in the current epoch;
- eligible observation time window;
- successful validation rate;
- current streak of scheduled successful checks;
- next real eligibility checkpoint;
- the exact condition blocking credits: no published on-chain epoch root.

When the credit system is actually deployed, the protocol must make this loop real:

1. A fixed epoch closes.
2. The backend derives eligible contribution units from accepted receipts using an auditable public rule.
3. It generates a Merkle root and publishes it to the Portaldot credit contract.
4. The dashboard fetches the public root and each wallet's proof.
5. The user signs a real claim transaction; the UI links the explorer receipt.

Credits remain non-transferable, have no price claim, and are not a promise of financial return. A shop can be introduced only after there is an actual, funded redemption policy. Before then, a `Future utility` explanation is acceptable; a usable-looking store balance is not.

### 2.2 Inbox becomes an alert center, not a log

Normal observations belong in **Evidence** / **My Sentinel**, never in Inbox. Inbox should contain only changes that a person needs to know about or act on:

- Sentinel has been linked, unlinked, paused, or has not checked in for a defined threshold;
- three consecutive scheduled checks were rejected or could not reach Portaldot;
- an observation was rejected for an identity, signature or policy reason;
- an epoch root is publicly published and a real claim is available;
- a security or consent action is needed.

Each alert needs a stable ID, severity, reason, timestamp, related receipt when relevant, read/dismissed state and a single meaningful action. Normal live checks create an entry in the activity history only. The Inbox badge counts unresolved alerts, not total records.

### 2.3 A real wallet-first profile

Atlas currently authenticates with a Substrate-wallet signature; it does **not** have email/password accounts. Therefore profile must not invent email, password reset, verification badges, balances, or a social username.

The profile panel may show:

- a locally chosen display name (optional, stored locally until a real profile service exists);
- truncated wallet address with copy and explorer actions;
- linked Sentinel count and latest real status;
- local session status and `Disconnect this browser`;
- theme preference;
- direct routes to privacy, linked device and Sentinel controls.

It must not show email, password, KYC, balance, country, referrals, or account deletion controls until those capabilities exist. Removing a wallet link is a real product action that should hide future association; it must not silently pretend historical signed receipts have been erased from an immutable evidence journal.

## 3. Information architecture and required screens

Every screen below needs loading, empty, error, disconnected-wallet and mobile states where applicable. All values must come from a live source or a clearly labelled roadmap state.

### Public site

1. **Landing / home** — Atlas explanation, real-now vs roadmap, privacy boundary, `Download Sentinel` and `Open dashboard`.
2. **How it works** — install → wallet signature → one-time link → live observation → signed receipt. No claim of a financial reward.
3. **Sentinel download** — package download, exact Load Unpacked instructions, permissions summary and extension screenshot; later swaps naturally to Chrome Web Store.
4. **Privacy and data boundary** — data sent, data never collected, local device key, pause, unlink and retention rules.
5. **Protocol / evidence explainer** — why a network check is useful, live proof anatomy and links to verifiable records.
6. **Roadmap** — current capabilities, publicly stated next capabilities, and what is explicitly not live.

### Dashboard

1. **Overview** — live network state, finalized block, observation latency (time from Atlas starting a probe to receiving/validating it), personal Sentinel status, recent public evidence and real alert summary.
2. **My Sentinel: disconnected** — connect wallet; explains signature-only login.
3. **My Sentinel: connected, not installed** — clear download CTA and setup checklist.
4. **My Sentinel: installed, not linked** — create one-time code; link instructions; detect no personal receipts yet.
5. **My Sentinel: active** — status, last accepted receipt, cadence, most recent latency, pause/manage action and personal contribution history.
6. **My Sentinel: paused / stale / rejected** — the actual reason, timestamp and only valid recovery action.
7. **Evidence: public journal** — signed server and independent records, type filters, record detail.
8. **Evidence: personal receipt detail** — Sentinel ID (shortened), observed timestamp, latency, Portaldot finalized block, signature scheme, verification outcome and inspectable receipt.
9. **Contribution Progress** — real accepted-observation metrics and an explicit `No on-chain credit epoch exists yet` state. This replaces fake gamified credits until deployment.
10. **Epoch Credits: unavailable** — contract/root prerequisite, the precise reason it is unavailable and no fabricated amount.
11. **Epoch Credits: claimable (post-deployment only)** — root ID, proof, eligible units, actual claim transaction and explorer link.
12. **Alerts** — only actionable events; filter unread/all; dismissal; links to relevant action. This replaces the current noisy Inbox.
13. **Download Sentinel** — dashboard-level install page, version, permissions, setup state and download link.
14. **Profile menu** — display name, wallet, Sentinel count, connection state, theme toggle, privacy and disconnect.
15. **Settings: appearance** — system/light/dark setting persisted locally.
16. **Settings: dashboard** — auto-refresh preference only.
17. **Settings: privacy and linked device** — explain boundary; open Sentinel controls; revoke future wallet association only when API support exists.
18. **Settings: about / protocol** — version, network endpoint, open-source/repository link when public.

### Sentinel extension

1. **Popup: first use** — Atlas/Sentinel identity, what it observes, what it never observes, backend configuration.
2. **Popup: wallet not linked** — one-time link-code entry and `Link wallet` action.
3. **Popup: active** — latest accepted evidence, timestamp, latency, endpoint, current cadence, scheduled-check toggle, run-now button.
4. **Popup: paused** — pause state, resume control and exact explanation that no checks are being run.
5. **Popup: failed/rejected** — actual failure reason, a retry action and privacy-safe diagnostic copy.
6. **Popup: privacy** — permissions, local key guarantee, data boundary and link to policy.

## 4. Functional build order

### Phase A — Correct the existing product model

1. Replace Inbox's journal-derived list with an `Alerts` model and zero-state; remove normal checks from it.
2. Rename the unavailable credit surface to `Contribution Progress` plus a clearly separate `Epoch Credits` availability state.
3. Add a real theme preference (system / light / dark) and wallet profile menu.
4. Add a `Download Sentinel` destination in the sidebar and dashboard setup states.
5. Add contextual help for observation latency and every piece of live network data.

### Phase B — Make the underlying states durable

1. Persist and expose alert events and read/dismissed state.
2. Persist contribution aggregates computed exclusively from accepted receipts.
3. Define the public epoch eligibility formula before showing progression milestones.
4. Implement on-chain epoch publication, Merkle proof generation and real claim transactions before presenting any credit balance.
5. Implement a wallet-unlink endpoint and precise receipt-retention policy before presenting that control.

### Phase C — Brand and visual system

1. Select a mark, wordmark, color system, icon family and illustration/shape language.
2. Apply the selected system consistently to landing, dashboard and Sentinel popup.
3. Produce dark and light system variants; never reduce evidence legibility for decoration.
4. Package favicon, browser-toolbar icons, social preview and transparent logo assets.

## 5. Brand asset checklist

### Required now

- primary wordmark: `atlas` and `Portaldot Atlas` lock-up;
- Atlas symbol in square, circular and horizontal lock-up forms;
- Sentinel companion mark, visibly related to Atlas but not identical;
- one-color / reversed versions of both marks;
- favicon: 16, 32 and 48px;
- browser extension icon: 16, 32, 48 and 128px PNG;
- app icon / avatar: 192 and 512px PNG;
- social preview: 1200 × 630px;
- landing hero visual; dashboard empty-state visual; Sentinel onboarding visual;
- color tokens for light and dark themes;
- typography pair and a small icon family;
- basic component tokens: surface, border, success, warning, error, focus, data/muted text;
- illustration rules for maps, signal paths, landmarks and evidence receipts.

### Nice to have after the core system

- README/repository banner;
- hackathon demo cover;
- sticker / badge sheets for milestones only after those milestones have real definitions;
- motion rules for live checking, success and paused states;
- documentation diagrams.

## 6. Creative direction

Atlas should feel like **a friendly field guide for shared network reliability**: observant, alive, communal and precise. It must not resemble a trading terminal, military surveillance console, data-mining product or a Grass clone.

Use a **warm cartographic / living-signal** vocabulary: soft map contours, waypoints, beacons, constellation dots, small signal paths and rounded evidence cards. Let the product be familiar and human, but keep proof elements calm and readable.

### Personality

- Must feel: **curious, trustworthy, participatory**.
- Must avoid: **predatory, overly technical, falsely financial**.
- User feeling after installation: **"I understand what I am contributing, I control it, and I can verify it."**

## 7. Master prompt for the visual-design AI

Copy this entire prompt and add the current Atlas screenshots plus the Grass screenshots only as loose interaction references — not as styling to clone.

```text
Design a complete, cohesive web and browser-extension design system for “Portaldot Atlas”, a friendly reliability-evidence protocol for the Portaldot network.

PRODUCT TRUTH — preserve exactly:
- Atlas validates signed, user-authorized Portaldot network observations.
- Sentinel is a browser extension. It runs scheduled or manual network checks only after user consent and signs accepted observations with a device-local P-256 key.
- Atlas is NOT a VPN, proxy, bandwidth-sharing, browsing-analytics, trading or yield product.
- Wallet login uses a Substrate-wallet signature only. There is no email/password account, user balance, referral system, location data or financial return today.
- Credits are non-transferable future contribution credits. No balance, price, tier, claim button or reward store balance may be shown until a real public Portaldot epoch root and credit contract exist.
- Normal network checks are activity history, not inbox messages. Alerts are only actionable: Sentinel paused/stale/rejected, wallet link issue, or a real claim epoch published.

AUDIENCE:
Curious non-technical contributors, Portaldot ecosystem builders and hackathon judges. A first-time contributor should understand the product in under one minute and feel fully in control.

BRAND DIRECTION:
Create a warm, living cartographic identity: friendly field guide, signal paths, waypoints, beacons, softly rounded map contours and small evidence receipts. It should be original — do not replicate Grass’s neon lime, black surfaces, illustration style, typography, layout or UI components. Avoid military/surveillance visual language, crypto trading terminals, stock-price charts and fake sci-fi holograms.

PERSONALITY:
Curious, trustworthy, participatory. Friendly and expressive but evidence-first. The user should feel: “I know what I contribute, I control it, and I can verify it.”

CREATE:
1. A logo system for Atlas and a related Sentinel companion mark: wordmark, icon, horizontal lock-up, one-color/reversed versions.
2. A compact light/dark token system: color, typography, spacing, radius, borders, icon treatment, status states and focus states. Ensure WCAG-friendly contrast.
3. Favicon, browser-extension icons (16/32/48/128), app icon, empty-state illustrations and a 1200×630 social card.
4. Desktop and mobile screens for every state in the attached screen inventory.

REQUIRED SCREENS:
- Landing home; How it works; Download Sentinel; Privacy & data boundary; Protocol/evidence explainer; Roadmap.
- Dashboard Overview; My Sentinel disconnected; My Sentinel installed-but-unlinked; My Sentinel active; My Sentinel paused/stale/rejected; public Evidence journal; personal receipt detail; Contribution Progress; Epoch Credits unavailable; Alerts; Download Sentinel; profile menu; Settings appearance; Settings dashboard; Settings privacy/device.
- Sentinel extension popup: first use; unlinked; active; paused; failed/rejected; privacy.

DATA DESIGN RULES:
- Use realistic layout-safe labels but never invent a token balance, monetary value, fake claim, fake activity count, email, password, user location, referral count or unverified credit number.
- For unavailable future features, show a warm and precise status: “No on-chain epoch has been published yet” plus the real prerequisite.
- Define “Observation latency” with a subtle info affordance: the time from the start of a live probe to receiving and validating the Portaldot response.
- On personal receipt detail, show only useful verifiable fields: recorded time, Portaldot finalized block, latency, verification result, signature scheme, receipt ID and inspect action.
- In Alerts, show only actionable alerts and an empty state saying there is nothing requiring attention.

DELIVERABLE FORMAT:
- One visual north-star / brand board.
- A reusable design-token page.
- Component specimens for navigation, cards, evidence rows, state chips, alert card, buttons, toggles, wallet profile, empty state, receipt detail and tooltip.
- High-fidelity desktop and mobile layouts for every required screen.
- Brief usage notes that distinguish real-now behavior from roadmap-only behavior.
```

## 8. Questions that do not block design

The chosen visual identity may proceed without these answers. They become required only before implementation of the related live feature:

- What is the finalized, public Portaldot testnet/mainnet deployment plan for the credit contract?
- What exact receipt-based formula determines contribution units per epoch?
- What is the retention policy for accepted signed evidence after a participant unlinks a wallet?
- Is a profile service ever desired, or should Atlas remain wallet-first permanently?
