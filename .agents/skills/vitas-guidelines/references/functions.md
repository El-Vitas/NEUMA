# Functions and control flow

Read this before writing or refactoring any function body.

## Contents

- [1. No God symbols](#1-no-god-symbols)
- [2. Small by meaning, not by line count](#2-small-by-meaning-not-by-line-count)
- [3. Section comments = missing extraction](#3-section-comments--missing-extraction)
- [4. What a body may and may not declare](#4-what-a-body-may-and-may-not-declare)
- [5. The narration litmus](#5-the-narration-litmus)
- [6. Tell, don't ask](#6-tell-dont-ask)
- [7. Control flow](#7-control-flow)
- [8. Stubs and placeholders](#8-stubs-and-placeholders)

---

## 1. No God symbols

Avoid God objects, functions, components and files. Low coupling, high cohesion. A God symbol:

- Knows about too many domains (auth, billing, notifications, UI state) in one body.
- Has more than ~5 unrelated responsibilities.
- Has so many parameters or options that calling it requires reading its source.
- Mixes layers — parses HTTP, queries the DB, formats the response and renders JSX.

---

## 2. Small by meaning, not by line count

One function does one thing, and its name describes that thing exactly. **If you can't name it without "and" or "or", it's doing too much.**

Extract into smaller named functions **even when each is 1–2 lines**, when doing so makes the parent self-explanatory. `hasSufficientFunds(user, cartTotal)`, `isPasswordExpired(user)`, `formatOrderLabel(order)` replace the prose that would otherwise explain the parent.

Many small functions is good, not noise:

- Each is trivially testable in isolation.
- The parent reads as prose: `if (hasSufficientFunds(user, total) && !isAccountLocked(user))` instead of a wall of conditions.
- Naming bugs become obvious — a badly named small function feels wrong immediately.

Don't inline something back just because "it's only used once". If it has a name, it deserves to be a function.

Don't impose an artificial LOC limit either. The real signal: **can I describe what this function does in one short sentence using its name and parameters?** Yes → leave it. No → split.

Counterweight (SKILL.md §0.1): if the extraction means a reader must open five files to follow one operation, it went too far. Extraction serves readability; when it stops serving it, stop.

---

## 3. Section comments = missing extraction

The most common failure mode: a function that **looks like one function but is three to five phases glued together**. The giveaway is section comments narrating the phases.

```ts
const doSomething = (input: Input) => {
  const entity = fetchEntity(input.id);
  updateEntityState(entity);

  // complex iteration logic
  for (const item of entity.items) {
    // ... many lines ...
  }

  // validation
  if (!entity.total) throw new Error(...);
  if (entity.items.length === 0) throw new Error(...);

  // build output
  const record = { /* many fields */ };
  saveRecord(record);
};
```

That function is wrong even though it's "one function". Each labelled section IS a sub-responsibility. The comment is the symptom; the disease is the missing extraction.

```ts
const doSomething = (input: Input) => {
  const entity = fetchEntity(input.id);
  updateEntityState(entity);
  const enrichedItems = computeEnrichedItems(entity.items);
  validateEntity(entity, enrichedItems);
  saveEntityRecord(entity, enrichedItems);
};
```

Now it reads as prose, each helper is testable, and no comment is needed — the names ARE the comments.

**Rule:** if a comment marks a section inside a function (`// validation`, `// step 1`, `// process X`, `// loop logic`, `// build result`), that section must become a function named what the comment said. The comment then disappears.

**Blank-line paragraphs are the same symptom.** Visual blocks separated by blank lines because each does a different thing are sub-functions waiting to be born.

### Reuse before you extract

The extraction instinct is right, but the new helper does not have to be new code:

1. Name what the block does in one sentence (`validateOrderItems`, `formatAddressForDisplay`, `assertUserCanEdit`). That name is what you search for.
2. Run search-before-writing (SKILL.md §3.1) on that name and obvious synonyms.
3. If a helper already does it, import it. The block disappears into an existing call — **better than extracting fresh code**.
4. Only when nothing equivalent exists, write the helper in the right kind-file and import it back.

*Menos código nuevo, más reuso.* The principle is recursive: inside function bodies, at the helper level, at the feature level.

---

## 4. What a body may and may not declare

A function body declares the **runtime values it needs right now**. That's its job.

**Never inside a body:**

- A `type` alias or `interface`, even "only used here". Types are not runtime values; declaring one inside a body conflates where a type is *used* with where it *lives*. It lives in the types file; the function imports it.
- A Zod / Yup / Valibot / class-validator schema. Same reasoning — schemas live in the schemas file.
- A `class` declaration. Classes live at module scope.
- A second substantively-sized named function. If the block deserves a name, it deserves its own top-level or sibling-file function.

**Fine inside a body:**

- Local variables and constants for the current computation (`const totalCents = sum + tax;`).
- Local arrays/objects used as transient data (`const headers = { 'Content-Type': 'application/json' };`).
- A local closure whose only purpose is being passed as a callback on the same line (`items.filter((item) => item.isActive)`).
- Destructuring of inputs and results.

Tell-tale: you typed `interface`, `type`, `class`, or a multi-line `z.object({…})` more than two lines inside `const x = (…) => {`. Hoist it and import.

---

## 5. The narration litmus

A body reads as a sequence of named steps. The names of the calls and locals are enough to understand **what** it does; a reader enters a helper only to learn **how**.

**A healthy body contains:** named local consts capturing intermediate values; calls to named functions (the bulk of it); one return, or a few early-return guards; trivial inline closures passed to stdlib methods on the same line; inline arithmetic or interpolation so obvious a name adds nothing.

**It does not contain:** any block you could describe in one short sentence but left inline ("compute the tax-included total", "validate the address fields", "build the audit payload"); a chain of conditional branches that narrates as "check this, then if that, otherwise…" (missing dispatch or strategy); a `.map().filter().reduce()` whose steps aren't obvious from the chain (name the intermediate or extract); anything from §3 or §4 above.

**The litmus** — read the function aloud as if explaining it to a colleague who hears only your words, and listen for the connectors:

- *"Do step A, do step B, do step C, return the result."* → **Pass.** The function IS its narration.
- *"Validate the input — well, we check the email format, then the password length, then if the role is admin we also check… and inside that loop we also map…"* → **Fail.** Every *"and then we"*, *"and inside"*, *"well, we also"* is a hidden helper. Extract (searching first), then re-narrate.

---

## 6. Tell, don't ask

When you have data and a question or operation belonging to that data, **tell the data-owner to perform the operation** instead of asking for its state and applying the logic elsewhere. In functional code, "tell the data" means: define a function taking that data and returning the answer — don't inline the access plus the logic at every call site.

**Ask (anti-pattern):**

```ts
if (user.role === "admin" && user.permissions.includes("write")) {
  doAdminWrite();
}

let totalCents = 0;
for (const item of cart.items) {
  totalCents += item.priceCents * item.quantity;
}

const themeClass = prefs.theme === "dark" ? "dark-bg" : "light-bg";
```

**Tell (correct):**

```ts
if (canPerformAdminWrite(user)) {
  doAdminWrite();
}

const totalCents = computeCartTotal(cart);

const themeClass = getThemeClass(prefs);
```

Why it matters: callers stop depending on internal field names, so a shape change touches one function instead of every call site (**low coupling**); the rule "what does admin-write mean?" lives in one place (**high cohesion**); the narration becomes *"if can-perform-admin-write, do admin write"* (**§5**); and naming the rule once kills the duplicate before it exists (**DRY**).

**Fail patterns to look for in your own code:**

- The same property access + condition in 2+ places (`user.role === "admin"`, `order.items.length === 0`, `cart.items.reduce(…)`).
- A caller using 3+ fields of an object to compute one derived value inline. That derived value has a name — and that name is a function the data-owning module should expose.
- A loop or `.filter().map().reduce()` over an object's collection at the call site. The owning module should expose the result.

This does **not** mean wrapping every property access. Single-field reads used once (`user.id`, `order.createdAt`) are fine. The rule fires when access + logic repeats, or when the call site would read clearly with a named operation.

---

## 7. Control flow

### The branch litmus

§5 gives a litmus for what a function *does*; this is the one for how it *branches*. Both are qualitative on purpose — there is no line count here and no score to compute.

**Read the condition aloud. If you have to hold something in your head to follow it, it is too much.** Which branch am I in; what was true three lines ago; where does this `if` close. The signal is not how long the code is, it is **how many things you must remember at once to read it**.

Symptoms, all visible by reading:

- A ternary inside another ternary.
- A condition that needs parentheses before you can parse it.
- A branch inside a branch inside a loop.
- A boolean joining three or more operators with no name on any part of it.
- Having to scroll to find where an `if` closes.
- A function where you cannot say, without tracing, which inputs reach the return you care about.

The fixes are the ones already in this file: name the condition (§6), early-return the guards, extract the block (§3), or replace the chain with a dispatch map. If a branch resists all four, that is usually the sign the function is doing two jobs.

### Early returns

Always early-return to avoid deep nesting. Keep the happy path at root indentation. No more than two indentation levels in a body.

No `else` after a `return` — the `else` block is already the only path left, and indenting it hides that. This is the most common leftover when a body is converted to guard clauses.

### Switch or dispatch map over if-else chains

Multiple `if / else if` over the same variable → a `switch`, or better, a dictionary/record map. Prefer the map: it's type-safe and adding a case is one entry.

Range-based or multi-variable conditions → guard clauses plus extracted helpers. Don't force a `switch`.

Never let a flag parameter switch a function between two drastically different behaviors — split it into two functions.

### Ternaries are expressions, not control flow

A single short ternary choosing between two values is fine and often clearer than an `if`: `const label = isActive ? 'Active' : 'Inactive';`

- **Never nest one inside another.** `a ? b : c ? d : e` is an `if/else` chain wearing a disguise — and the same rule applies: a dispatch map, or guard clauses. Chained ternaries are the single most common way a branch becomes unreadable while looking compact.
- **If it needs parentheses to be read, it is not a ternary any more.** Rewrite as an early return or a lookup.
- **Never put side effects in one.** A ternary produces a value; if either arm *does* something, it should have been an `if`.
- The same goes for a ternary spanning several lines, or one inside JSX deciding between two whole subtrees — extract the branches into named components or a variable computed above the return.

### Reaching through optional values

Prefer optional chaining and nullish coalescing to a staircase of `if`s whose only job is to reach a value:

```ts
// ❌ three levels of nesting to read one field
if (order) {
  if (order.customer) {
    if (order.customer.address) return order.customer.address.city;
  }
}

// ✅
return order?.customer?.address?.city ?? DEFAULT_CITY;
```

This is a readability rule, not a micro-optimization: the nesting it removes is exactly what the branch litmus penalizes. It does **not** excuse skipping a real absence check — when "not found" is a meaningful outcome, handle it (`correctness.md` §6), don't paper over it with a default.

### Parameter lists

No magic number, same reasoning as function length. The signal is the call site: if reading `f(a, undefined, undefined, d)` is the only way to know what the arguments mean, or callers must count positions to line them up, the parameters have outgrown a positional list. Take an options object with named fields.

Two or three positional parameters whose meaning is obvious from the function name are fine. A run of optional ones is the case that always fails this test.

### Functional methods are the default

**Default to** `.map`, `.filter`, `.reduce`, `.some`, `.every`, `.find`, `.flatMap`. They are cleaner and idiomatic.

**A raw `for` loop is NOT the default.** Do not push `for` over functional methods for stylistic reasons — that produces uglier code, and it is explicitly not what this codebase wants.

You MAY use `for` only when one of these holds, and you must state which one in the delivery:

1. **Collapsing two or more passes into one.** You see `.filter(…).map(…)`, or `.map` inside `.map` over the same dataset, and a single `for` genuinely reduces the work (O(2n) → O(n), or avoids a large intermediate array). Justify it: *"replaced `.filter().map()` with a single `for` doing both in one pass — avoids the intermediate array and the second iteration."*
2. **Early termination** that `.some` / `.every` / `.find` cannot express cleanly.
3. **Side effects on external state** where `.forEach` is clearly less readable.

If you can't justify it with one of those three, use the functional method. A `for` that could have been a `.map` with equal readability is a style violation, not a performance fix.

### Complexity discipline

- Check time and space complexity before finalizing.
- Prefer the simplest correct solution with strong complexity.
- Two equally readable correct solutions → pick the lower complexity.
- `.find` inside `.map` → build a `Map` first. Repeated `.includes` on a large array → a `Set`.
- A `.filter().map().reduce()` chain over a **large** dataset creating wasteful intermediates may be collapsed into one `.reduce`. Don't pre-optimize tiny lists — that's the premature optimization SKILL.md §0.1 forbids.

---

## 8. Stubs and placeholders

**Every deliverable is real, runnable code — not documentation about code.** When asked for stubs, produce actual code in a fenced block; a prose description of what the code would do is not acceptable.

```ts
const fetchOrder = async (id: string): Promise<Order> => {
  throw new Error('Not implemented');
};
```

**No comments inside a stub body** — not `// TODO`, not `// Placeholder`, not `// Implementation provided by caller`. The `throw` IS the signal. Any comment there violates the comments rule.
