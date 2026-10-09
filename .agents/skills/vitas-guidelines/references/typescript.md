# TypeScript strictness, boundaries and env

Read this before writing types, generics, schemas, casts, ORM adapters, or anything that touches environment variables.

## Contents

- [1. No `any` — including the places agents forget](#1-no-any--including-the-places-agents-forget)
- [2. No `as unknown as` — especially at ORM boundaries](#2-no-as-unknown-as--especially-at-orm-boundaries)
- [3. External input is `unknown` — parse, don't cast](#3-external-input-is-unknown--parse-dont-cast)
- [4. Validation must cover every field you access](#4-validation-must-cover-every-field-you-access)
- [5. Imports at the top — every language](#5-imports-at-the-top--every-language)
- [6. Environment variables — one validated accessor](#6-environment-variables--one-validated-accessor)

---

## 1. No `any` — including the places agents forget

Strict mode is assumed. `any` is forbidden in parameters, returns, locals and casts. So are non-null assertions unless provably safe. Public exported functions carry an explicit return type — don't rely on inference across files.

### Generic constraints

Agents routinely emit `<T extends (...args: any[]) => any>` and then self-report "no any". That is a FAIL.

```ts
// ❌
const memoize = <T extends (...args: any[]) => any>(fn: T): T => { … };

// ✅ — unknown in the constraint, signature preserved via utility types
const memoize = <T extends (...args: unknown[]) => unknown>(fn: T): T => { … };
// or, preserving the exact signature without any cast:
const memoize = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
): ((...args: TArgs) => TResult) => { … };
```

`Parameters<T>` and `ReturnType<T>` preserve a wrapped signature correctly — the inferred type is right without an `as T`.

### Form handlers

Never `(formData: any) => …`. Derive the type from the schema:

```ts
type ContactInput = z.infer<typeof ContactSchema>;
const handleSubmit = async (formData: ContactInput) => { … };
```

With react-hook-form: `SubmitHandler<ContactInput>`. With next-safe-action: the action's parsed input type *is* the schema's inferred type.

**Parse functions follow the same rule** — a wrapper around `safeParse` returns the inferred type, not `any`:

```ts
// ❌
const parseContactFormData = (formData: FormData): { success: boolean; data?: any } => { … };

// ✅
type ValidatedContactInput = z.infer<typeof ContactSchema>;
const parseContactFormData = (
  formData: FormData,
): { success: boolean; data?: ValidatedContactInput } => {
  const result = ContactSchema.safeParse(Object.fromEntries(formData));
  …
};
```

### Trailing `as any`

After a correct narrowing chain like `record[key as keyof typeof record]`, do NOT append `as any` "just to be safe". The narrowing already worked; the trailing cast is a FAIL even though the cast before it was right.

---

## 2. No `as unknown as` — especially at ORM boundaries

`as unknown as <Type>` is forbidden categorically, no matter how short the diff or how obvious the cast looks. It shows up constantly where an ORM (Prisma, Drizzle, TypeORM) returns a structurally-typed row and the consumer wants a domain type.

**Two correct alternatives:**

### 2.1 Narrow at the query

```ts
const findPaymentForList = (id: string) =>
  prisma.payment.findUnique({
    where: { id },
    select: { id: true, customerId: true, amountCents: true, status: true },
  });
// The return type IS the narrowed shape — no cast needed.
```

### 2.2 Write a typed adapter

A small named helper taking the ORM row and returning the domain type. It lives in the feature's `lib/` (pure) or `server/lib/` (if it does more I/O on the way). Every call site imports it; nobody casts.

```ts
const toPayment = (row: PrismaPayment): Payment => ({
  id: row.id,
  customerId: row.customerId,
  amountCents: row.amountCents,
  status: row.status as PaymentStatus,
});
```

**That single row-to-union assertion is acceptable ONLY if all three hold:**

1. The column is constrained at the DB level (enum or check constraint) AND the constraint exactly matches the union.
2. The schema/migration file proving the constraint is **part of the same delivery**. You cannot claim a DB-level constraint without shipping the schema change that establishes it. Introducing a new model or column without the schema update makes the assertion unjustified.
3. The delivery report explicitly names the file plus the enum/check backing it.

If any is missing — plain string column, schema not delivered, report doesn't name it — the adapter validates at runtime instead:

```ts
if (!PAYMENT_STATUSES.includes(row.status)) {
  throw new Error(`Unexpected payment status: ${row.status}`);
}
```

"It will be an enum eventually" is not a justification.

### 2.3 No carve-out for "library ergonomics"

When a typed API demands a narrower literal / tuple / branded input than your source value's declared type, **fix it at the source declaration**, not with a cast at the call site. In TS that's `as const` on the source constant (or the equivalent elsewhere: frozen tuple, readonly literal, value-typed enum) so the type already *is* what the API wants. "The library forces me" is the exact rationalization this rule blocks.

If a type assertion is genuinely unavoidable at an untyped external library boundary: validate/narrow at runtime first, keep the assertion minimal and local, and add the one safety comment the comments rule allows.

---

## 3. External input is `unknown` — parse, don't cast

Every door where data enters from outside the type system returns an unverified value **regardless of its declared return type**. Treat it as `unknown` and parse with a schema before use. Casting at any of these doors is forbidden.

The doors (non-exhaustive — the principle is "data this process did not produce"):

- **HTTP responses**: `await response.json()`, `response.text()` + `JSON.parse`, axios/got/ky wrapper results.
- **JSON deserialization**: `JSON.parse` returns `any`/`unknown`. Casting immediately after is a FAIL.
- **Web platform inputs**: `FormData.get`, `URLSearchParams.get`, `localStorage.getItem`, `sessionStorage.getItem`.
- **Process/runtime inputs**: `process.env.X`, `Deno.env`, `os.getenv` — and these belong only inside the env module (§6).
- **File reads**: `fs.readFile` and equivalents; if `JSON.parse`d, schema-parse the result.
- **DB rows where the column type ≠ the domain type** — handled by the adapter in §2, not by a cast.

Correct forms:

```ts
const parsed = ResponseSchema.parse(await response.json());
const input = ContactSchema.parse(Object.fromEntries(formData));
if (typeof raw !== 'string') throw new Error('Expected a string');
```

---

## 4. Validation must cover every field you access

If a function takes `input: unknown` and validates it as `SignupInput`, you may access only the fields declared on `SignupInput`, and only via the validated value — `validated.password`, never `input.password`.

Doing `input.password as string` after a Zod parse that didn't include `password` is a FAIL: it's the exact unsafe assertion this section forbids, dressed up with prior validation that didn't cover the field you read.

---

## 5. Imports at the top — every language

- **TS/JS**: every `import … from …` at the very top, after a `'use server'` / `'use client'` directive if present. No `require()` in a function body — it bypasses module resolution, breaks tree-shaking, hides the dependency from readers and returns untyped values.
- **Python**: every `import` / `from … import …` at module top, after the module docstring. No imports inside functions, no `importlib.import_module` for statically known dependencies.
- **PHP/Laravel**: every `use …` at the top after `namespace`. No inline `\Fully\Qualified\Name` mid-method when a `use` would clean it up.
- **Go**: one grouped `import (…)` block after `package`.
- **Java / Kotlin / C#**: all imports / `using` at the top.

The only legitimate inline import is **dynamic code-splitting for performance** — `const Heavy = dynamic(() => import('./Heavy'))`, or `await import(…)` for a route known not to be needed at startup. Even then it lives at module top or at the top of the function, never buried in a callback or a conditional branch.

---

## 6. Environment variables — one validated accessor

**Reading an env var at the point of use is forbidden.** No `process.env.X` (Node/Next), `import.meta.env.X` (Vite), `Deno.env.get(…)`, `os.getenv(…)` (Python), `$_ENV` / `getenv()` (PHP), `System.getenv(…)` (JVM) scattered across the codebase. Each one is an unvalidated boundary (§3) and a duplicated magic string at the same time.

**One centralized env module** is the single place the raw runtime env is touched. It:

1. Declares which variables are **required** vs **optional** and validates presence at load — a missing required var throws immediately with a clear message. Fail fast at boot, not at first use.
2. Exposes each variable through a typed accessor, so consumers write `env.DOWNLOAD_TOKEN_SECRET`.
3. Applies defaults and type coercion in one place (`PORT` → number with a default), so the rest of the code receives already-typed, already-validated values.

The shape is the same across stacks; only the validation mechanism differs — hand-rolled checks or whatever schema library the project already uses.

```ts
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is required but missing or empty.`);
  return value;
};

const optional = (name: string): string | undefined => process.env[name] || undefined;

export const env = {
  get PORT(): number { return Number(process.env.PORT ?? DEFAULT_PORT); },
  get DATABASE_URL(): string { return required("DATABASE_URL"); },
  get SENTRY_DSN(): string | undefined { return optional("SENTRY_DSN"); },
};
```

`process.env` appears ONLY inside this module. Everywhere else imports `env`. A direct env read elsewhere is a FAIL — it skips validation and duplicates the variable name across files.

**Audit grep:** `process.env.`, `import.meta.env.`, `Deno.env`, `os.getenv`, `getenv(`, `System.getenv`. Every hit must be inside the env module.
