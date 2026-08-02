---
name: prisma-orm
description: 'Pragmatic Prisma ORM best practices: schema design, migrations, efficient queries, transactions, connection management, and production checklist.'
metadata:
  version: '1.0'
  scope: [prisma, src/prisma]
  auto_invoke: 'When working with Prisma schema, queries, migrations, or performance'
---

# Prisma ORM Skill

High-value, practical guidelines and patterns for using Prisma ORM in Node.js/TypeScript projects. Keep this skill focused on patterns that reduce bugs, improve performance, and make schema changes safer.

## Core Principles

- Use a single, shared `PrismaClient` instance (avoid multiple instantiations).
- Encapsulate DB logic (repositories/services) separate from business logic.
- Model relations clearly and add indexes for filter/sort fields.
- Fetch only necessary fields (`select`/`include`) to avoid over-fetching.
- Use transactions for multi-step operations that must be atomic.

---

## Schema Design (Source of Truth)

- Define primary keys (`@id`), unique constraints, and explicit `@relation` annotations.
- Prefer stable surrogate IDs (e.g., `cuid()`/`uuid()`) when appropriate.
- Add `@@index` for fields used frequently in queries.
- Plan migrations to avoid data loss (add nullable columns first, backfill, then make non-nullable).

Example model:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
```

---

## Efficient Querying

- Prefer `select` to limit returned fields; use `include` only when necessary.
- Avoid N+1: use `include`/`select` with proper joins or batch requests.
- Batch parallel queries with `Promise.all` when independent.

Example:

```ts
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    posts: { select: { id: true, title: true } },
  },
});
```

---

## Transactions & Atomic Operations

- Use transactions (`$transaction`) for related operations that must succeed together.

```ts
await prisma.$transaction(async (tx) => {
  await tx.user.create({ data: userData });
  await tx.profile.create({ data: profileData });
});
```

---

## Migrations

- Use `prisma migrate` for schema changes and version migrations with descriptive names.
- Test migrations on staging before production; avoid `migrate dev` in production.

```bash
npx prisma migrate dev --name add-posts-relation
```

---

## Connection Management

- Reuse a singleton `PrismaClient` (especially important for serverless).
- Configure connection pool limits in production; monitor DB connection usage.

---

## Observability & Performance

- Monitor slow queries with `prisma.$on('query')` for logging and profiling.
- Add indexes for frequent filters/sorts; run EXPLAIN on problematic queries.

```ts
prisma.$on('query', (e) => console.log(e.query, e.duration));
```

---

## Anti-Patterns to Avoid

- Multiple `PrismaClient` instances (connection leakage).
- Over-including relationships you don't need.
- Running destructive migrations without backups.
- Fetching entire rows when only a few fields are needed.

---

## Checklist

- [ ] Schema models have primary keys, unique constraints, and indexes
- [ ] Relations have explicit `@relation` annotations
- [ ] Queries use `select`/`include` effectively (no over-fetching)
- [ ] Transactions wrap multi-step operations where needed
- [ ] Migrations are descriptive and tested in staging
- [ ] Singleton `PrismaClient` instance used
- [ ] Connection pooling configured for production
- [ ] N+1 queries identified and eliminated
- [ ] Pagination implemented for large lists
- [ ] Error conditions handled gracefully
