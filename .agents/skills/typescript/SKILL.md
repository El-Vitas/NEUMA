---
name: typescript
description: Enforce strict, scalable TypeScript patterns when creating or refactoring .ts/.tsx files. Use when defining types, interfaces, generics, const maps, utility types, type guards, eliminating any, and strengthening unknown usage.
metadata:
  version: '1.0'
  scope: [general]
  auto_invoke: 'Writing or refactoring TypeScript types and interfaces'
---

# TypeScript Strict Architecture Skill

This skill enforces strict, production-grade TypeScript patterns focused on:

- Strong type safety
- Single source of truth
- Predictable refactoring
- Zero `any`
- Clear and reusable type structures

Apply these rules consistently.

---

# 1. Absolute Rule: Never Use `any`

## 1.1 Replace `any` With Proper Typing

`any` disables type safety. It is forbidden.

### ✅ Use `unknown` for truly unknown values

```typescript
function parse(input: unknown): User {
  if (isUser(input)) return input;
  throw new Error('Invalid input');
}
```

### ✅ Use generics for flexibility

```typescript
function first<T>(items: T[]): T | undefined {
  return items[0];
}
```

### ❌ Forbidden

```typescript
function parse(input: any): any {}
```

---

# 2. Const Map Pattern (REQUIRED)

Always define constant objects first and derive types from them.

This ensures:

- Runtime availability
- Autocomplete
- Single source of truth
- Safe refactoring

## ✅ Correct Pattern

```typescript
const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];
```

## ❌ Forbidden Pattern

```typescript
type Status = 'active' | 'inactive' | 'pending';
```

Never declare raw union literals when they represent fixed runtime values.

---

# 3. Interface Architecture (Flat & Composable)

Interfaces must be shallow and reusable.

## 3.1 No Inline Nested Objects

Nested objects must have their own dedicated interface.

### ✅ Correct

```typescript
interface UserAddress {
  street: string;
  city: string;
}

interface User {
  id: string;
  name: string;
  address: UserAddress;
}

interface Admin extends User {
  permissions: string[];
}
```

### ❌ Forbidden

```typescript
interface User {
  address: {
    street: string;
    city: string;
  };
}
```

Inline nested structures reduce reusability and clarity.

---

# 4. Type Guards (Required for Runtime Validation)

When working with `unknown`, validate using type predicates.

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}
```

Type guards must:

- Check for null
- Confirm object type
- Validate required properties

---

# 5. Utility Types (Prefer Over Manual Rewriting)

Leverage built-in utility types instead of duplicating structures.

```typescript
Pick<User, 'id' | 'name'>;
Omit<User, 'id'>;
Partial<User>;
Required<User>;
Readonly<User>;
Record<string, User>;
Extract<Union, 'a' | 'b'>;
Exclude<Union, 'a'>;
NonNullable<T | null>;
ReturnType<typeof fn>;
Parameters<typeof fn>;
```

Avoid redefining types manually when a utility type can express it.

---

# 6. Proper Type Imports

Always use type-only imports where possible.

```typescript
import type { User } from './types';
import { createUser, type Config } from './utils';
```

Benefits:

- Cleaner output
- Better tree-shaking
- Clear separation of runtime vs type-only dependencies

---

# 7. Generics Best Practices

- Always constrain generics when possible.
- Avoid unconstrained `<T>` if assumptions are made.

### ✅ Constrained Generic

```typescript
function getId<T extends { id: string }>(entity: T): string {
  return entity.id;
}
```

---

# 8. Immutability by Default

Prefer `readonly` where mutation is not intended.

```typescript
interface Config {
  readonly apiUrl: string;
}
```

Use `as const` when defining static configuration objects.

---

# 9. Strictness Principles

The following must always hold:

- No `any`
- No implicit `any`
- No inline nested object types
- No duplicated literal unions
- No weakening types for convenience
- Prefer composition over repetition
- Prefer explicit return types in exported functions

- Avoid `as` type assertions; prefer explicit narrowing and type guards. Only use assertions when strictly justified.

---

# 10. Review Checklist

Before finalizing TypeScript code:

- [ ] No `any` present
- [ ] `unknown` validated via type guards
- [ ] Literal unions derived from `as const` maps
- [ ] Interfaces are flat and reusable
- [ ] Utility types used appropriately
- [ ] Type-only imports applied
- [ ] Generics constrained where needed
- [ ] Exported functions have explicit return types
- [ ] No `as` type assertions unless narrowly justified and documented
