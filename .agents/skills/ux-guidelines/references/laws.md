# Laws of UX, Nielsen Heuristics & Gestalt

Each entry: definition → **UI implication** (what to do) → numeric threshold if one exists.

## Cognitive & perceptual laws

### Fitts's Law
Time to reach a target grows with distance and shrinks with target size: `MT = a + b·log₂(2D/W)`.
- **Do:** Make important/frequent controls large and close to where the user's cursor or thumb already is. Give primary CTAs a generous hit area. Keep destructive actions *far* from primary ones (distance is protective).
- **Threshold:** Touch targets ≥ 44×44px (Apple/WCAG 2.5.5); ≥ 48×48dp (Material). ≥ 16px dead-space between a primary and a destructive action.
- **Magic pixels:** Screen edges/corners have "infinite" depth (the cursor stops there) — that's why top menu bars and corner buttons are fast on desktop.

### Hick's Law
Decision time increases logarithmically with the number and complexity of choices.
- **Do:** Limit visible options. Use progressive disclosure — show essentials first, reveal advanced on demand. Break long flows into steps. Group navigation into categories. Provide sensible defaults.
- Beware the "paradox of choice": too many equally-weighted options → decision fatigue → abandonment.

### Jakob's Law
Users spend most of their time on *other* products, so they expect yours to work the same way.
- **Do:** Follow established conventions — logo top-left links home, cart/profile top-right, primary action bottom-right, search icon = magnifier, hamburger = menu. Innovate on value, not on standard mechanics. Every broken convention spends cognitive budget.

### Miller's Law
Working memory holds ~7 ± 2 items.
- **Do:** Chunk information — phone numbers, card numbers, menus into groups of 5–9. Don't force users to remember data across steps (this is why placeholders-as-labels fail).

### Doherty Threshold
Productivity and flow are maintained when system response is < 400ms.
- **Do:** Respond to interactions within 400ms. If the backend is slower, use optimistic UI, skeletons, or progress feedback so *perceived* latency stays low.

### Serial Position Effect
People best remember the first and last items in a series.
- **Do:** Put the most important nav items / actions at the start or end of a list — never bury critical items in the middle.

### Von Restorff (Isolation) Effect
The item that differs visually is the one remembered.
- **Do:** Make the single primary CTA stand out (the 10% accent color). Don't make everything shout, or nothing stands out.

### Aesthetic-Usability Effect
Users perceive attractive interfaces as easier to use and forgive minor usability flaws.
- **Do:** Polish matters — visual quality buys goodwill. But don't let it hide real usability problems in testing.

### Law of Prägnanz (Simplicity)
The eye interprets ambiguous images in the simplest form possible.
- **Do:** Reduce clutter; let whitespace do organizational work instead of borders and boxes.

### Peak-End Rule
People judge an experience by its peak and its end, not the average.
- **Do:** Invest in the emotional peaks (success moments) and the ending (confirmation, thank-you, empty→first-success). A great final screen outweighs mild friction earlier.

### Postel's Law (Robustness)
Be liberal in what you accept, conservative in what you output.
- **Do:** Accept messy input (phone/date formats, extra spaces, upper/lowercase) and normalize it for the user rather than rejecting it.

### Tesler's Law (Conservation of Complexity)
Every system has irreducible complexity; the only question is who absorbs it.
- **Do:** Push complexity onto the system, not the user (smart defaults, autofill, inference) rather than exposing every option.

### Zeigarnik Effect
People remember uncompleted tasks better than completed ones, and feel pulled to finish them.
- **Do:** Use progress indicators, checklists, and "X of Y complete". Pre-filled/endowed progress (a stepper that starts partly done) boosts completion.

## Nielsen's 10 Usability Heuristics
Use as an audit checklist.
1. **Visibility of system status** — always show what's happening (loading, saved, progress).
2. **Match system & real world** — user's language and mental models, not jargon.
3. **User control & freedom** — easy undo/cancel/back; clear exits.
4. **Consistency & standards** — follow platform and internal conventions.
5. **Error prevention** — design so mistakes can't happen (constraints, confirmations, good defaults).
6. **Recognition over recall** — make options visible; don't force memorization.
7. **Flexibility & efficiency** — shortcuts for experts, guided paths for novices.
8. **Aesthetic & minimalist design** — remove irrelevant content; every element competes for attention.
9. **Help users recognize & recover from errors** — plain-language messages that say what happened and how to fix it.
10. **Help & documentation** — available when needed, task-focused, searchable.

## Guiding principles & common myths
- **"Don't Make Me Think" (Steve Krug)** — the overarching usability mantra. Users *satisfice*: they scan and click the first reasonable option, they don't read or puzzle things out. Make choices obvious, self-evident, and low-effort; every question mark in the user's head is friction.
- **KISS / Occam's razor** — prefer the simplest design that solves the problem; remove elements until removing one more would break it. Complexity must earn its place.
- **The "3-click rule" is a myth** — click *count* doesn't predict success or satisfaction (NN/g/UIE). What matters is **information scent** (each step confidently predicts the next) and low effort per click. More easy, well-labeled clicks beat fewer confusing ones. Optimize for "never leave the user lost," not a click budget.
- **The "5-second test"** is a useful *research method* (can users grasp a page's purpose in 5s?), not a design rule — use it to validate clarity, don't treat it as law.

## Gestalt principles (perceptual grouping)
The brain seeks structure before parsing parts — use these to organize without clutter.
- **Proximity** — close elements read as a group. Put labels near their fields; separate groups with whitespace instead of borders.
- **Similarity** — same shape/color/size ⇒ same function. Keep all primary buttons identical; don't restyle them per screen.
- **Closure** — the mind completes shapes. Minimal/simplified icons work because gaps get filled.
- **Common region** — a shared boundary groups strongly (cards, containers). Use cards to bundle a title + image + action.
- **Continuity** — the eye follows lines/paths. Use for breadcrumbs, steppers (1→2→3), aligned flows.
- **Figure/ground** — foreground vs background separation via contrast/shadow/overlay. Modals over a scrim; elevation via shadow.
- **Common fate** — elements moving together are grouped (a drawer sliding in, synchronized hover).
- **Anti-pattern:** excessive proximity (cramped controls) destroys grouping and slows decisions.

## Sources
- Laws of UX — https://lawsofux.com
- NN/g 10 Usability Heuristics — https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g Gestalt principles — https://www.nngroup.com/articles/gestalt-principles/
