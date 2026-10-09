# Frontend — React and Next.js practice

Read this before writing React/Next code: effects, state, the server/client boundary, data fetching, or anything in a render path.

Structure rules for components (one component per file, subcomponent extraction, `IProps`) live in `structure.md`. This file is about behavior.

## Contents

- [1. `useEffect` — when not to](#1-useeffect--when-not-to)
- [2. Effects done right](#2-effects-done-right)
- [3. State](#3-state)
- [4. Re-renders](#4-re-renders)
- [5. Memoization — both directions](#5-memoization--both-directions)
- [6. The server/client boundary](#6-the-serverclient-boundary)
- [7. Data fetching](#7-data-fetching)
- [8. Lists and keys](#8-lists-and-keys)
- [9. Forms and mutations](#9-forms-and-mutations)
- [10. Bundle and assets](#10-bundle-and-assets)
- [11. Accessibility](#11-accessibility)

---

## 1. `useEffect` — when not to

**An effect synchronizes your component with an external system.** Subscriptions, event listeners, timers, the document title, a non-React widget, an analytics SDK. That's the job.

Everything else is a misuse. The four common ones:

**Deriving state from props or state.** If you can compute it during render, compute it during render.

```tsx
// ❌ an extra render, and a frame where the value is stale
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(`${firstName} ${lastName}`); }, [firstName, lastName]);

// ✅
const fullName = `${firstName} ${lastName}`;
```

Expensive? Wrap the calculation in `useMemo` — still not an effect.

**Resetting state when a prop changes.** Change the `key` so React remounts the subtree, or compute it during render from the previous value. Don't `setState` in an effect that watches a prop.

**Handling a user event.** Logic that should run *because the user clicked* belongs in the handler, not in an effect watching the state the click produced. An effect can't tell why it ran; the handler knows.

**Fetching data.** In Next.js App Router, a Server Component or the route's loader does this. In a client component, a dedicated data-fetching layer handles caching, deduplication, retries and races — a hand-rolled `useEffect` fetch handles none of them and reintroduces the bugs in §2. Whatever the project already uses for this is the answer; adding a second mechanism beside it is not.

**Chained effects** — effect A sets state that triggers effect B that sets state that triggers effect C — are the strongest signal the logic belongs somewhere else. Each link costs a render pass and the intermediate states are all visible.

---

## 2. Effects done right

When an effect *is* correct:

- **Complete dependency array.** Every reactive value the effect reads goes in. **Never silence the lint rule** — a suppressed dependency warning is a stale-closure bug waiting to happen. If a dependency causes a loop, the fix is elsewhere (a ref, a functional update, moving the value out of render, an event handler).
- **Cleanup for anything that outlives the render.** Subscriptions, listeners, timers, intervals, observers, WebSockets. React runs effects twice in development Strict Mode precisely to expose a missing cleanup — a "bug that only happens in dev" is usually a real leak.
- **Abort in-flight async work.** Without it, a fast prop change lands the *first* response after the second and you render stale data:
  ```tsx
  useEffect(() => {
    const controller = new AbortController();
    loadUser(userId, { signal: controller.signal }).then(setUser).catch(ignoreAbort);
    return () => controller.abort();
  }, [userId]);
  ```
- **No `setState` in an effect with no dependency array** — that's an infinite loop.
- **`useLayoutEffect` only for measuring the DOM before paint.** It blocks paint; the default is `useEffect`.

---

## 3. State

- **Don't store what you can derive.** Duplicated state drifts. One source of truth, computed values everywhere else.
- **Keep it as local as possible**, and lift it only when a second consumer actually appears.
- **URL state belongs in the URL** — filters, tabs, pagination, the open dialog. It makes the view shareable and survives a refresh; `useState` doesn't.
- **Server data isn't client state.** It belongs to the server or to the data-fetching layer, not copied into `useState`.
- Updates that depend on the previous value use the functional form: `setCount((count) => count + 1)`.
- Never mutate state or props in place.

---

## 4. Re-renders

The costs worth hunting, in order of how often they matter:

- **A new object, array, or function literal passed as a prop on every render** breaks a memoized child's equality check and makes the memo pointless.
- **An unmemoized context value** re-renders every consumer on every provider render. `value={{ user, setUser }}` creates a new object each time — memoize it, or split into two contexts (one that changes, one that doesn't).
- **A context that carries too much.** Every consumer re-renders when any field changes. Split by change frequency.
- **State living too high.** A keystroke in a header input re-rendering the entire page means the state is in the wrong component.
- **An expensive computation recomputed each render** that nothing invalidates.
- **Unstable keys** (§8) — remount instead of re-render, which is far worse.
- **Rendering a huge list at once.** Virtualize past a few hundred rows.

Measure before you chase this — a profiler, or whatever the project already uses. "It felt slow" is not a finding.

---

## 5. Memoization — both directions

`useMemo`, `useCallback` and `memo` are a tradeoff, not an improvement:

**Add them when** a measurably expensive computation runs on every render, a value is a dependency of an effect that would otherwise fire constantly, or a prop feeds a memoized child that actually re-renders often.

**Don't add them when** the wrapped work is a string concat or a small map, the memoized child re-renders anyway because *another* prop is unstable, or the dependency array is as expensive to compare as the work it guards. Every `useMemo` costs an allocation, a comparison and a line of indirection. `useCallback` around a handler passed to a plain DOM element buys nothing.

Both directions are audit findings: the missing memo that causes a real re-render storm, **and** the ritual memo that buys nothing. When a compiler (React Compiler) handles this automatically in the project, manual memoization is noise — check before adding it.

---

## 6. The server/client boundary

- **`'use client'` is a boundary, not a file-level annotation.** Everything imported below it ships to the browser. Push it as far down the tree as possible — a page doesn't become a client component because one button needs `onClick`.
- **Server-only code must be server-only.** A module reading the DB, secrets or `node:*` imported from a client component either crashes the build or, worse, leaks. Keep server helpers in the server folder (`structure.md` §3) and use `server-only` where the framework offers it.
- **Props crossing the boundary are serialized** and are visible in the HTML payload. Never pass a whole user record, an internal token, or a full DB row into a client component — pass the fields the UI renders.
- **Server Actions are public endpoints** — see `security.md` §3. This is the boundary rule that gets forgotten most.
- Big libraries pulled into a client component ship to every visitor. Check what a `'use client'` file imports.

---

## 7. Data fetching

- **Fetch on the server when you can.** It's faster, it doesn't ship the query code, and the data arrives with the HTML.
- **Waterfalls are the main cost.** A parent that awaits before rendering a child that awaits serializes two round trips. Start independent requests together (`Promise.all` — `correctness.md` §5), or render the independent parts inside `<Suspense>` so they stream in parallel.
- **Every async boundary needs a loading and an error state.** A `<Suspense>` with no fallback and a route with no error boundary both fail silently.
- **No N+1 in the UI**: a list whose row component fetches its own data issues one request per row. Fetch the collection once.
- **Client fetching goes through the data library**, which handles caching, deduping, retries and race conditions. Then **invalidate after a mutation** (`correctness.md` §4) — the stale-list-after-create bug is this rule being skipped.
- Know your framework's caching defaults before relying on them, and know how to opt out.

---

## 8. Lists and keys

- **Never the array index as a key** for a list that can reorder, filter, insert or delete. React reuses the wrong component instance and state jumps between rows. A stable id from the data is the key.
- An index key is acceptable only for a static list that never changes order or length.
- Don't use `Math.random()` — that remounts every row on every render.
- Keys are for identity within a sibling set; they don't need to be globally unique.

---

## 9. Forms and mutations

- **Every mutation surfaces pending, success and error states.** A button that does nothing visible for two seconds reads as broken.
- **Disable the submit while it's in flight** — double-submission is the most common duplicate-record bug (and see idempotency, `correctness.md` §3).
- **Client validation is UX; server validation is the control.** Same schema on both sides where possible, but the server never trusts the client.
- **Optimistic updates need a rollback path.** An optimistic update that leaves the wrong value on failure is worse than no optimism.
- Show field-level errors next to the fields, and keep what the user typed.

---

## 10. Bundle and assets

- Dynamic-import genuinely heavy client components (editors, charts, map SDKs) — `structure.md` and `typescript.md` §5 cover where the import goes.
- Use the framework's image component (or explicit `width`/`height`) so images don't shift layout, and don't ship a 4 MB PNG as a thumbnail.
- Watch what a barrel file drags in: importing one icon from an un-treeshaken index can pull the whole library.

---

## 11. Accessibility

Semantic elements first: a `<button>` for actions, a `<a>` for navigation, real labels tied to inputs, headings in order. A `<div onClick>` is not keyboard-reachable and not announced.

Everything interactive works with a keyboard, focus is visible, and focus is managed when a dialog opens and closes.

For the full evidence-based rules — contrast ratios, target sizes, ARIA patterns, form and error semantics — use the **`ux-guidelines`** skill rather than duplicating them here.
