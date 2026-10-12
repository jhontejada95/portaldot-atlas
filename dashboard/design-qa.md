# Atlas visual integration QA

## Comparison target

- **Source visual truth:** `C:\Users\HP\AppData\Local\Temp\atlas-visual-review-20261011\stitch_portaldot_atlas_visual_identity_system\portaldot_atlas_landing_home\screen.png` and the supplied Atlas mascot asset in the same visual-identity package.
- **Implementation:** `http://127.0.0.1:5173/`, landing route, rendered in the Codex in-app browser on 2026-10-11.
- **State:** settled landing state after its entry transition; no wallet, token balance, user count, rewards, or invented telemetry is presented.
- **Viewport:** 902 x 813 CSS px, 1x density. The source is 614 x 1600 px, a taller reference composition; comparison was normalized to the above-the-fold desktop content rather than treating the source as a pixel-for-pixel desktop specification.
- **Implementation capture:** browser-rendered CUA capture from this verification run (landing root, 2026-10-11). The browser capture showed the Atlas blue card, supplied mascot, headline, CTAs, and live-navigation shell after animations settled.

## Full-view and focused comparison evidence

The source landing and the rendered Atlas landing were opened and visually compared in the same review session. The implementation deliberately uses the supplied system as an identity resource rather than copying its individual screens: it retains the existing product architecture and replaces unsupported mock metrics with real dashboard flows.

Focused review covered the brand lockup/hero, mascot crop, headline and CTA region. No separate crop was needed: the capture made those surfaces legible at the reviewed viewport.

## Findings

No actionable P0, P1, or P2 issues remain in the reviewed landing state.

- [P3] The supplied mascot is a 1024 x 1024 raster with a light background, so it uses `mix-blend-mode: multiply` inside a circular crop rather than a transparent source asset.
  - Location: `.atlas-mascot` in `src/landing.css`.
  - Evidence: the subject is clear and stylistically coherent in the blue hero card, but an eventual transparent export would give more freedom on alternative dark surfaces.
  - Impact: polish only; it does not obscure legibility or imply an unimplemented product capability.
  - Follow-up: replace it only if the brand team supplies an official transparent icon export.

## Required fidelity surfaces

- **Fonts and typography:** Plus Jakarta Sans is used for headings, Inter for product copy and JetBrains Mono for field labels. The display hierarchy, compact labels and line wrapping are legible at the reviewed width.
- **Spacing and layout rhythm:** the landing uses a two-column desktop hero with a responsive single-column mobile rule, measured card gaps, rounded panels and one consistent action group. The dashboard retains its operational grid rather than inheriting reference-only mock layouts.
- **Colors and visual tokens:** Atlas uses its supplied royal-blue/mint/ink direction with semantic live/attention tokens. It is intentionally distinct from Grass and avoids speculative “farming” treatments.
- **Image quality and asset fidelity:** the mascot comes from the user-supplied visual identity package and is used as a branded visual. Standard controls continue to use the installed Font Awesome library. No Grass logo, image, palette, composition or rewards imagery was copied.
- **Copy and content:** all copy reflects the product’s demonstrated boundaries. The landing labels Credits and independent corroboration as roadmap and does not represent them as live balances, claims, tiers, or rewards.

## Interaction verification

- Landing CTA routes to the functional Download Sentinel dashboard section.
- Dashboard query route `/dashboard?view=download` renders the real MVP package link and the existing wallet/Sentinel instructions.
- Dashboard page transitions use Motion with `reducedMotion="user"`, preserving the browser accessibility preference.
- `npm run build` passed after the visual integration.
- `npm run test:sites` passed (4/4).
- Sentinel extension JavaScript syntax and its updated manifest both validated successfully.

## Comparison history

1. Initial browser capture occurred during the hero’s entry transition, so it was not used for judgement.
2. After waiting for the transition to settle, the landing’s hero/card state was captured and reviewed. No P0/P1/P2 issue was found; the non-transparent mascot treatment was recorded as P3 only.

## Implementation checklist

- [x] Apply supplied Atlas visual language without copying Grass.
- [x] Add a real bundled mascot asset to landing and Sentinel extension identity.
- [x] Add Motion-based, reduced-motion-aware page and hero transitions.
- [x] Preserve real data boundaries and explicit roadmap states.
- [x] Verify build, packaging tests and extension manifest.

## Follow-up polish

- Add an official transparent mascot/icon export when the brand team produces one.
- Run one manual Chrome popup screenshot after the user reloads the unpacked extension; Chrome caches unpacked-extension icons until reload.

final result: passed
