# Microinteractions, Loading States & Ethical Design

## Microinteraction timing
Humans reliably perceive a visual change at ~215–230ms. Match animation duration to purpose:
- **< 100ms — instant.** Haptic feedback, checkbox toggles, hover/active states, selection. Delaying these breaks the feeling of direct manipulation.
- **200–400ms — standard transitions.** Panels, modals, drawers, fade/scale in-out. Fluid but not sluggish. Most UI transitions live here.
- **> 500ms — too slow** for recurrent transitions; users get impatient. Reserve longer only for large, deliberate, once-in-a-flow moments.
- Stay under the **Doherty Threshold (400ms)** for responses to keep the user in flow.

### Easing
Never use linear easing for UI (feels robotic/mechanical).
- **Ease-out** — for elements *entering* (they decelerate into place). Feels responsive.
- **Ease-in** — for elements *leaving* the screen (accelerate out).
- **Ease-in-out** — for elements moving within the viewport.
- Respect **`prefers-reduced-motion`** — swap large transforms for gentle fades or make them instant.

## Loading: skeletons vs spinners
Nielsen's response-time limits: **0.1s** feels instantaneous (no indicator needed), **1s** keeps flow (may need a subtle indicator), **10s** is the attention limit (show a percent-done bar and let the user do other things).
- **< 1s → show nothing.** A flashing indicator for a sub-second wait is worse than the wait itself.
- **Skeleton screens** — for content with predictable structure (feeds, cards, tables, profiles) loading in ~1–10s. Show gray placeholder blocks where content will land; they give the brain a preview to build a mental model against, so the wait feels shorter. Use for most page/section loads.
- **Spinners** — for short, isolated, indeterminate blocking actions (submitting a form, authenticating, uploading). A spinner carries no information — every rotation looks identical — so it feels slow past a few seconds. Never use a full-page spinner for content that could be skeleton-loaded.
- **Progress bars (percent-done)** — for any wait **> 10s** or determinate multi-step operations. Determinate beats indeterminate.
- **Optimistic UI** — for high-confidence mutations, update the UI immediately and reconcile with the server response; reduces perceived latency to zero.

## Performance is UX (Core Web Vitals)
Perceived speed is part of usability — slow or janky UI reads as broken (ties to the Doherty Threshold). Google's Core Web Vitals give concrete targets:
- **LCP (Largest Contentful Paint) ≤ 2.5s** — how fast the main content renders. In Next.js: `next/image` with `priority` on the hero/LCP image, `next/font`, avoid render-blocking work.
- **INP (Interaction to Next Paint) ≤ 200ms** — responsiveness to taps/clicks/keypresses (replaced FID in 2024). Keep main-thread work small; defer/break up heavy JS; use `useTransition`/`useDeferredValue` for expensive updates.
- **CLS (Cumulative Layout Shift) ≤ 0.1** — visual stability. Reserve space for images/ads/embeds (width+height), use `font-display: swap` with fallback metrics, and skeletons that match final layout so nothing jumps.
These are the perceived-performance floor beneath every microinteraction rule below.

## Empty states
A blank "No records" reads as an error or dead-end and kills activation. A good empty state has four parts:
1. **Clear, jargon-free message** — "You don't have any projects yet."
2. **Warm visual** — a modest illustration/icon so the space feels intentional, not broken.
3. **Proactive CTA** — turn the void into a next step: "Create your first project", "Import contacts". Provide the action inline.
4. **Optional guidance** — a link to help/templates for first-timers.
Distinguish the three empty cases: first-use (onboard + CTA), user-cleared (celebrate/confirm), and no-search-results (suggest broadening filters, never a dead-end).

## Ethical design — dark patterns to AVOID
Dark (deceptive) patterns exploit cognitive biases to push users into choices against their interest. They're increasingly illegal (EU DSA, GDPR/EDPB guidance 03/2022, US FTC — e.g. the Amazon "Iliad flow" case). Never implement these, and flag them if asked to:
- **Roach Motel / hard cancellation** — easy to get in, tortuous to get out. Cancelling/unsubscribing/deleting must be as easy as signing up.
- **Forced continuity** — free trial silently rolls into paid charges with no reminder. Warn before charging; make cancellation obvious.
- **Confirmshaming** — guilt-tripping the decline option ("No, I don't want to save money"). Use neutral, equal-weight opt-out wording.
- **Trick wording / misdirection** — double negatives, pre-ticked consent boxes, hiding the honest choice behind a dim link while the manipulative one is bright ("Accept All" loud, "Reject" hidden). Give consent options equal visual weight.
- **Drip pricing / sneak-into-basket** — hiding fees until checkout, or auto-adding items/insurance. Show the full price early; never add to cart without explicit action.

### The symmetry test (use this to check your own designs)
Opposite actions should cost the same effort. If subscribing is one bright button but cancelling is five gray screens, that asymmetry is a dark pattern. Make reversing an action as easy — same prominence, same number of steps — as taking it. Design for informed consent and easy exit; that's both ethical and, increasingly, legally required.

## Sources
- Material 3 motion — https://m3.material.io/styles/motion/overview
- NN/g skeleton screens & progress — https://www.nngroup.com/articles/progress-indicators/
- NN/g empty states — https://www.nngroup.com/articles/empty-state-interface-design/
- Deceptive patterns catalog — https://www.deceptive.design/types
- FTC on dark patterns — https://www.ftc.gov/
