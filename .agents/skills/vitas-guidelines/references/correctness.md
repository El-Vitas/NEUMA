# Correctness — data integrity, concurrency, errors, APIs

Read this before touching the database, writing more than one related write, awaiting more than once, handling errors, logging, calling an external service, or adding tests.

Structural rules make code readable. These make it *right*. A perfectly organized module that loses a write under concurrency is a worse deliverable than a messy one that doesn't.

## Contents

- [1. Transactions and atomicity](#1-transactions-and-atomicity)
- [2. Races — read-then-write](#2-races--read-then-write)
- [3. Idempotency](#3-idempotency)
- [4. Derived state and invalidation](#4-derived-state-and-invalidation)
- [5. Concurrency and parallelization](#5-concurrency-and-parallelization)
- [6. Queries — N+1, scope, indexes](#6-queries--n1-scope-indexes)
- [7. Migrations](#7-migrations)
- [8. External calls and API contracts](#8-external-calls-and-api-contracts)
- [9. Error handling](#9-error-handling)
- [10. Logging](#10-logging)
- [11. Tests](#11-tests)

---

## 1. Transactions and atomicity

**Anything that must happen together happens in a transaction.** Two writes that must both land; a write plus its dependent write; a parent row plus its relation; a status change plus its audit entry. Atomic or nothing.

The question to ask of every multi-write operation: **"if the process dies right here, what state is the system in?"** If any answer is "half-done and nobody can tell", you need a transaction.

```ts
// ❌ — the order exists with no items if the second write fails
await db.order.create({ data: order });
await db.orderItem.createMany({ data: items });

// ✅
await db.$transaction(async (tx) => {
  const created = await tx.order.create({ data: order });
  await tx.orderItem.createMany({ data: itemsFor(created.id) });
});
```

### External side effects never go inside a transaction

Emails, queue publishes, webhooks, push notifications, third-party API calls, file uploads to object storage. A transaction that rolls back *after* the email left the building is a broken state you cannot undo — and the network call holds the DB locks open for its whole duration.

**Emit after commit.** If the side effect must not be lost when the process dies between commit and emit, write an outbox row inside the transaction and let a worker drain it.

### Transaction scope discipline

- **Keep them short.** No network calls, no long computation, no user interaction inside. Locks held across a slow call are how a system deadlocks under load.
- **Don't wrap a single query.** One statement is already atomic; the wrapper is noise.
- **The service decides when to open one**, not the query layer. A query whose transaction boundary belongs to the caller shouldn't open its own.
- **Nested transactions**: know whether your ORM gives you real savepoints or silently joins the outer one. Don't assume.
- **Don't parallelize work inside a transaction** — most clients bind a transaction to a single connection, and concurrent statements on it either serialize anyway or error.

State in the delivery which writes are transactional and why.

---

## 2. Races — read-then-write

Read-then-write needs a lock, a unique constraint, or an atomic update — **never a re-read**.

The classic broken shapes:

```ts
// ❌ check-then-insert — two requests both see "not found" and both insert
const existing = await db.user.findUnique({ where: { email } });
if (existing) throw new ConflictError();
await db.user.create({ data: { email } });

// ❌ read-modify-write — two requests both read 10, both write 11, one increment is lost
const account = await db.account.findUnique({ where: { id } });
await db.account.update({ where: { id }, data: { credits: account.credits + 1 } });
```

The fixes, in order of preference:

1. **A unique constraint in the schema**, and handle the conflict error. The DB is the only thing that can decide this correctly.
2. **An atomic update** — `{ credits: { increment: 1 } }`, `UPDATE … SET credits = credits + 1`. The read disappears.
3. **A conditional update** — `WHERE id = ? AND version = ?` (optimistic locking), and retry on zero rows affected.
4. **A locking read** — `SELECT … FOR UPDATE` inside a transaction, when the decision genuinely needs the current value and the above don't fit.

Also races: two requests uploading to the same key; a "generate the next invoice number" query; anything reading a counter to decide whether a limit was reached.

---

## 3. Idempotency

**Can this handler run twice without duplicating the effect?** If it can be retried, it will be.

Retried by: queue consumers with at-least-once delivery, webhook senders (Stripe, GitHub, every provider retries), HTTP clients with retry logic, load balancers on timeout, and users double-clicking a button.

Make it idempotent with:

- **A unique constraint on a natural key** — the provider's event id, the order number, the idempotency key from the request header. The second attempt hits the constraint and becomes a no-op.
- **A processed-events table** — insert the event id inside the same transaction as the effect. Already present → skip.
- **A state guard** — `UPDATE … SET status = 'PAID' WHERE id = ? AND status = 'PENDING'`, and treat zero rows affected as "already done".

Not idempotent: "check if it exists, then insert" (§2), or trusting the caller not to retry.

---

## 4. Derived state and invalidation

**A write that leaves derived state stale is a bug**, even when every row is correct. Derived state includes:

- HTTP / framework caches — Next.js `revalidatePath` / `revalidateTag`, ISR, CDN entries.
- The client-side data cache — invalidated after a mutation.
- Search indexes and read-model projections.
- Materialized counters and aggregates (`commentCount`, `totalSpent`).
- Denormalized copies of a field on another table.

Invalidate **in the same change that writes**. If invalidation lives elsewhere, name where, in the delivery.

Caching itself is a tradeoff to state, not a free win: you're trading staleness for latency and taking on an invalidation burden. Don't add a cache without saying what can go stale and for how long.

---

## 5. Concurrency and parallelization

**Independent awaits must not run in series.** This is the single most common performance miss. Scan every function body for consecutive `await` statements with no data dependency between them.

```ts
// ❌ — three round trips end to end
const user = await getUser(userId);
const settings = await getSettings(userId);
const plan = await getPlan(userId);

// ✅ — one round trip's worth of wall clock
const [user, settings, plan] = await Promise.all([
  getUser(userId),
  getSettings(userId),
  getPlan(userId),
]);
```

Also parallelizable: independent items in a loop where each iteration awaits and nothing accumulates across iterations.

### Never parallelize without naming the tradeoff

State which of these you checked. A parallelization recommendation with no stated cost is incomplete.

| Concern | What goes wrong | What to do |
|---|---|---|
| **Failure semantics** | `Promise.all` rejects on the first failure and abandons the rest — in-flight work still runs, and you lose the other results | Use `Promise.allSettled` when partial success is acceptable; keep `all` when one failure should abort everything |
| **Unbounded fan-out** | `Promise.all(items.map(…))` over 5,000 rows opens 5,000 concurrent operations — the DB connection pool starves, the third-party API rate-limits you, memory spikes | Bound the concurrency — a semaphore, a chunked loop, or whatever the project already uses. Batch into one query when the work is a DB read |
| **Write contention** | Parallel writes touching the same rows deadlock or serialize anyway | Order the writes deterministically, or keep them sequential |
| **Inside a transaction** | Most clients bind a transaction to one connection; concurrent statements error or serialize | Keep transaction bodies sequential |
| **Ordering** | `Promise.all` preserves *result* order but not *execution* order — side effects happen interleaved | If order matters, it isn't independent work |

### Backoff and timeouts belong with retries

Retrying without a cap turns one failure into an outage. Every retry loop needs a maximum attempt count, exponential backoff with jitter, and a decision about which errors are retryable (a 500 is; a 400 isn't). Every outbound call needs a timeout — the default in most HTTP clients is "wait forever".

---

## 6. Queries — N+1, scope, indexes

- **No N+1.** A query inside a loop or a `.map` is the shape. Fix with a batched query, an ORM `include`/join, or one `IN (…)` and a `Map` lookup.
  ```ts
  // ❌
  const orders = await db.order.findMany({ where: { userId } });
  for (const order of orders) {
    order.items = await db.orderItem.findMany({ where: { orderId: order.id } });
  }
  // ✅
  const orders = await db.order.findMany({ where: { userId }, include: { items: true } });
  ```
  The UI layer produces these too: a list component whose row fetches its own data.
- **Fetch only what's used.** No `SELECT *`; no Prisma `findMany` without `select` when three columns are needed; no loading a whole relation to read one field.
- **Paginate every collection.** An endpoint or query with no limit is an outage waiting for the table to grow. Cap the page size server-side — never let the client ask for a million rows.
- **Check the index.** Every column used in `where`, `orderBy`, or a join condition needs one. Composite indexes are order-sensitive; a filter on the second column alone won't use it. Say in the delivery which index a new query relies on, and add it if it's missing.
- **Parameterized queries only.** Never concatenate user input into SQL — see `security.md`.
- **Think about impact.** What else reads this table? Does this write invalidate something (§4)? Does this new index slow down writes?

### Absence is a normal result, not an exception

`findUnique`, `findFirst`, `find`, `Map.get`, a cache read, an array index — every one of them returns null/undefined for perfectly ordinary input. Dereferencing the result without a check converts "not found" into an unhandled `TypeError` thrown from whichever line happened to touch it first: a 500 instead of a 404, a stack trace instead of a message, and a failure the caller can't distinguish from a real bug.

```ts
// ❌ throws TypeError on a valid id that simply doesn't exist
const invoice = await db.invoice.findUnique({ where: { id } });
if (invoice.status === 'ISSUED') return alreadyIssued();

// ✅ absence is handled where it happens
const invoice = await db.invoice.findUnique({ where: { id } });
if (!invoice) return invoiceNotFound(id);
```

Handle it at the lookup — a guard clause returning a `Result`, or an ORM variant that throws a typed error (`findUniqueOrThrow`) caught at the boundary. Never with a non-null assertion (`invoice!`), which just moves the crash and hides it from the type checker.

### Dead code

Delete it in the same change:

- A value fetched and never read — that's also a wasted query or network round trip.
- A variable assigned and never used; a state value set and never rendered.
- An unused export, an unused type, a parameter nobody passes.
- An unreachable branch, a condition that can't be false, commented-out code.
- A feature flag nothing reads any more.

Dead code is the cheapest defect to remove and the most expensive to leave: the next reader assumes it matters, and every future refactor carries it forward. Most of it is mechanical enough that a detector will find it if the project has one; a value that is fetched and then discarded usually needs a reader to notice.

---

## 7. Migrations

- **Backward-compatible with the code currently running.** During a deploy both versions are live. Adding a required column with no default breaks the old code; dropping a column breaks it too.
- **Expand then contract**: add the new column → backfill → write to both → switch reads → stop writing the old → drop it. Several deploys, not one.
- **Destructive changes need an explicit plan** and the user's confirmation. A migration that drops data is not a routine edit.
- **Long-running migrations lock tables.** Adding an index on a large table needs the concurrent/online variant.
- **Backfills belong outside the migration** when the table is large — a batched job, not a single `UPDATE` over ten million rows.

---

## 8. External calls and API contracts

For calls you make:

- Timeout on every request. Retry with backoff and a cap (§5). Decide what happens when it stays down — fail the operation, degrade, or queue it.
- Validate the response at the boundary (`typescript.md` §3). Their contract can change without telling you.
- Never inside a transaction (§1).

For APIs you expose:

- **Consistent error contract** — one shape for all failures, correct status codes (400 vs 401 vs 403 vs 404 vs 409 vs 422), and no internal details or stack traces leaking to the client.
- **Pagination on every collection**, with a server-side cap.
- **Backward compatibility.** Removing a field, renaming one, tightening validation, or changing a status code is a breaking change for existing clients. Add before you remove; version when you must break.
- **Bounded payloads** — request size limits and response size limits.

---

## 9. Error handling

- **Result pattern first.** Business logic returns `Result<T, E>` and does not throw. The caller handles both branches; the compiler makes sure they do.
- **`try/catch` only at infrastructure boundaries** — HTTP, DB, filesystem, external APIs — to convert a technical exception into a `Result`.
- **A function either returns `Result<T, E>` or throws a technical exception — never both for the same failure mode.** Mixing them means every caller has to handle two mechanisms.
- **Never swallow an error.** An empty `catch`, a `catch` that only logs and continues, or a `.catch(() => null)` that hides a real failure — all forbidden. If the error is genuinely ignorable, say why in the code's structure (a named `Result` variant), not by silence.
- **Never throw a bare `Error` without context.** Include what failed and the identifying values — but no PII or secrets (§10).
- **No floating promises.** Always `await` or explicitly handle. An unawaited promise that rejects can crash the process or vanish silently.
- **No silent fallback logic.** Defaulting to an empty array when a query fails, or to a "safe" value when validation fails, hides bugs and can hide security failures.

---

## 10. Logging

- **Use the project's logger. Never `console.log`.**
- **No PII and no secrets** — no emails, passwords, tokens, API keys, personal data. Obfuscate or omit.
- **Stack traces on errors**, so a failure is diagnosable.
- **Log what a reader needs to act**: what operation, what identifiers, what outcome. Not a narration of every step.

---

## 11. Tests

- **Tests are part of the deliverable**, not a follow-up. If the repo mandates TDD, write the test first.
- Tests live in `tests/` mirroring the source, or wherever the repo puts them.
- **Test behavior, not implementation.** Don't test private functions; don't assert on internal call counts when the observable result is what matters.
- **Arrange–Act–Assert.**
- **Deterministic.** No real clocks, no real network, no shared mutable state between tests, no ordering dependencies.
- Cover the failure paths this file is about: the rollback, the duplicate delivery, the concurrent update, the missing authorization — not only the happy path.
