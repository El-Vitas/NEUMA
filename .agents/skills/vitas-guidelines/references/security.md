# Security — every entrypoint, every time

Read this before adding or changing any entrypoint, handling user input, touching auth, or accepting a file.

An entrypoint is anything the outside world can reach: an HTTP route, a controller, a **Server Action**, a webhook, a queue/worker handler, an MCP tool, a cron endpoint, a GraphQL resolver, a WebSocket message handler.

## Contents

- [1. The entrypoint checklist](#1-the-entrypoint-checklist)
- [2. Authorization is not authentication](#2-authorization-is-not-authentication)
- [3. Server Actions are public endpoints](#3-server-actions-are-public-endpoints)
- [4. Input validation and mass assignment](#4-input-validation-and-mass-assignment)
- [5. Injection](#5-injection)
- [6. SSRF and outbound requests](#6-ssrf-and-outbound-requests)
- [7. XSS and rendering untrusted content](#7-xss-and-rendering-untrusted-content)
- [8. Rate limiting and resource exhaustion](#8-rate-limiting-and-resource-exhaustion)
- [9. Secrets](#9-secrets)
- [10. File uploads and paths](#10-file-uploads-and-paths)
- [11. Sessions, tokens and passwords](#11-sessions-tokens-and-passwords)
- [12. Privacy in logs and errors](#12-privacy-in-logs-and-errors)

---

## 1. The entrypoint checklist

Run all seven for every entrypoint you add or touch. Report the result per entrypoint in the delivery.

1. **Authenticated** — who is calling?
2. **Authorized** — may *this* caller perform *this* operation on *this* resource?
3. **Validated** — is the input schema-parsed before use?
4. **Scoped** — is every resource query bound to the caller?
5. **Rate-limited** — is there a ceiling on how often this can be called?
6. **Bounded** — payload size, page size, upload size, timeout?
7. **Leak-free** — do errors and responses avoid exposing internals or other users' data?

A missing authorization check is the highest-severity defect in these guidelines. Treat it as a blocker, never as a follow-up.

---

## 2. Authorization is not authentication

Knowing *who* the caller is says nothing about what they may do. Both checks are needed, and the second one is the one that gets forgotten.

**IDOR — the default failure.** Fetching a resource by id and trusting it:

```ts
// ❌ any logged-in user can read any invoice by guessing an id
const invoice = await db.invoice.findUnique({ where: { id: input.invoiceId } });

// ✅ ownership is part of the query, not an afterthought
const invoice = await db.invoice.findFirst({
  where: { id: input.invoiceId, organizationId: session.organizationId },
});
if (!invoice) return notFound();
```

Scope in the `where` clause, not with a post-fetch `if`. The query that can't return someone else's row can't leak it.

Other shapes to watch:

- **Nested resources**: `/orgs/:orgId/projects/:projectId` — verify the project belongs to that org, not just that the user belongs to the org.
- **Bulk operations**: a list of ids where only the first is checked.
- **Filters as security**: a UI that only shows the user's rows while the API accepts any `userId` parameter.
- **Authz drift**: two endpoints performing the same operation with different permission checks. The weaker one is the real permission. Centralize the rule (tell-don't-ask: `canEditOrder(user, order)`), don't re-derive it per endpoint.
- **Role checks that ignore the resource**: `if (user.role === 'admin')` when the question was "admin *of this organization*".
- **Client-side-only checks**: a hidden button is not a permission.

---

## 3. Server Actions are public endpoints

`'use server'` does not make a function private. Next.js compiles every Server Action into a **callable HTTP endpoint** with a stable id. Anyone can invoke it directly, with any arguments, bypassing your form, your UI state, and any check the component did before calling it.

Therefore every Server Action does its own:

1. Session/auth check — inside the action, not in the page that renders the form.
2. Authorization check on the target resource.
3. Schema validation of every argument — including ids bound into the action and values you "know" came from a `<select>`.
4. Rate limiting if it's expensive or unauthenticated.

The same applies to route handlers, and to any RPC-style endpoint your framework generates. "It's only called from the admin page" is not a control.

---

## 4. Input validation and mass assignment

- **Parse at the boundary with a schema**, then use the validated value (`typescript.md` §3–4). No casting request data into shape.
- **Validate what you constrain elsewhere.** If the DB limits a column to 255 chars or an enum, the schema says so too — otherwise the user gets a 500 instead of a 400, and you learn about it in the error log.
- **Never spread a request body into a write:**
  ```ts
  // ❌ the client can set role, isVerified, organizationId, credits…
  await db.user.update({ where: { id }, data: { ...body } });

  // ✅ an explicit allowlist, derived from the validated input
  const { displayName, locale } = ProfileSchema.parse(body);
  await db.user.update({ where: { id }, data: { displayName, locale } });
  ```
  Nested writes have the same hole — a `connect` on a relation the caller shouldn't reach.
- **Ids from the client are claims, not facts.** `userId`, `organizationId`, `tenantId` in a request body are attacker-controlled. Take them from the session.

---

## 5. Injection

- **SQL**: parameterized queries only. Never string-concatenate or interpolate user input. In Prisma, `$queryRaw` (tagged template) is parameterized; `$queryRawUnsafe` is not — and neither protects identifiers. Column and table names from user input need an allowlist, never interpolation.
- **NoSQL**: an object where a scalar was expected (`{ $ne: null }`) turns a lookup into a bypass. Validate types before querying.
- **Shell**: never interpolate user input into a command string. Pass arguments as an array to a non-shell exec.
- **`eval` and friends** — `eval`, `new Function`, `vm.runInNewContext`, dynamic `import()` of a user-supplied path: not with untrusted input, ever.
- **Templates and prompts**: user content injected into a template engine or an LLM prompt is untrusted. Escape it, delimit it, and never let it change the instruction.
- **Log injection**: newlines in user input can forge log lines. Serialize structured, don't concatenate.

---

## 6. SSRF and outbound requests

A user-controlled URL passed to `fetch` lets the caller reach your internal network, your cloud metadata endpoint, and localhost.

If a feature genuinely needs to fetch a user-supplied URL: allowlist the scheme (`https` only), resolve the host and reject private/loopback/link-local ranges, disable redirect-following or re-validate every hop, set a timeout and a response size cap, and never forward your own credentials.

Webhook URLs, image proxies, "import from URL", and OpenGraph preview fetchers are all this pattern.

---

## 7. XSS and rendering untrusted content

- **`dangerouslySetInnerHTML`, `v-html`, `@html`** with anything that ever passed through user input needs sanitization by a maintained library — and a reason why rendering it as plain text won't do.
- **User-authored markdown/HTML** is untrusted. Sanitize after rendering, allowlist the tags and attributes.
- **`href` / `src` from user input**: `javascript:` and `data:` URLs execute. Allowlist the scheme.
- **JSON embedded in a `<script>` tag** must be escaped for `</script>`.
- Setting `innerHTML` from a template literal built with user data is the same bug without the scary name.

---

## 8. Rate limiting and resource exhaustion

**Anything expensive or externally reachable needs a ceiling.** Its absence is a real vulnerability, not a nice-to-have.

Always rate-limit: login and password reset (credential stuffing, user enumeration), signup and email/SMS sends (spam and cost), search and any full-text query, file uploads, exports and report generation, AI/LLM calls (direct money), any unauthenticated endpoint, and anything that fans out to a third party.

Also bound:

- **Request payload size** — a body limit on the server, not just the proxy.
- **Page size** — a server-side cap. `limit=1000000` must not be honored.
- **Upload size and count**, before reading the file into memory.
- **Query timeouts and complexity** — nested GraphQL, deeply nested filters, unbounded joins.
- **Regex** — a pattern with nested quantifiers over user input is a ReDoS (`(a+)+$`). Bound the input length or use a linear-time engine.
- **Zip/archive extraction** — decompression bombs and path traversal in entry names.

Choose the key deliberately: per-user for authenticated endpoints, per-IP plus a global cap for anonymous ones (IPs are shared and spoofable behind a bad proxy config — trust the proxy header only if the proxy sets it).

**If the repo has no rate-limiting infrastructure**, say so explicitly in the delivery and name where it would go — never ship an unlimited expensive endpoint silently.

---

## 9. Secrets

- **Never hardcoded.** No tokens, keys, passwords or connection strings in source, tests, fixtures, config files or comments. They belong in the env module (`typescript.md` §6) and the secret store.
- **Never in the client bundle.** In Next.js, anything prefixed `NEXT_PUBLIC_` ships to the browser — putting a real key behind that prefix publishes it. In Vite, everything in `import.meta.env` that isn't server-side is public. Check what your framework inlines.
- **Never in logs, errors, URLs or analytics.** A token in a query string ends up in access logs, referrer headers and browser history.
- **Never committed** — and if one was, rotating it is the fix, not deleting the line.
- **Compare secrets in constant time** (`crypto.timingSafeEqual`), and **verify webhook signatures** before parsing the body.

---

## 10. File uploads and paths

- Validate **type by content**, not by the filename extension or the client-supplied `Content-Type`.
- Enforce a size limit **before** buffering the file.
- Never use the client's filename as a path. Generate the stored name; keep the original only as metadata.
- **Path traversal**: any path built from user input (`../../etc/passwd`, absolute paths, URL-encoded separators, symlinks) must be resolved and checked to stay inside the intended root.
- Serve user-uploaded files from a separate origin, or with `Content-Disposition: attachment` and a restrictive `Content-Type` — an uploaded `.html` served from your domain is stored XSS.
- Strip or reject files with active content (SVG carries scripts).

---

## 11. Sessions, tokens and passwords

- Hash passwords with a slow, salted KDF (bcrypt/argon2/scrypt) — never a plain hash, never a hand-rolled scheme. The cost factor is a named constant.
- Session cookies: `HttpOnly`, `Secure`, `SameSite`, a sensible expiry, and rotation on privilege change (login, role change). Invalidate on logout and on password reset.
- Tokens in URLs leak (§9). Password-reset and magic-link tokens are single-use, short-lived, and random from a CSRF-safe generator.
- Verify JWTs properly: check the signature, the algorithm (reject `none` and algorithm confusion), the expiry, the issuer and the audience. Don't trust a decoded payload you didn't verify.
- **CSRF**: state-changing requests need a token or a strict `SameSite` cookie policy. Know which your framework provides — Next.js Server Actions have built-in origin checks, plain route handlers do not.
- **Timing**: login and token-check responses shouldn't reveal whether the account exists.

---

## 12. Privacy in logs and errors

- No PII, credentials, tokens or full request bodies in logs (`correctness.md` §10).
- Error responses to the client carry a message and a code — not a stack trace, not a SQL error, not an internal path. Log the detail server-side, return the reference.
- Don't leak existence through error differences: "user not found" vs "wrong password" tells an attacker which emails are registered.
