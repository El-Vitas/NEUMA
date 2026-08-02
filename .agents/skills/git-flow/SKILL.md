---
name: git-flow
description: Git workflow for commits, branches, and PRs. Use when creating commits, branches, or PRs in this repo. Covers commit message format, branch naming, and PR description format (manual or via gh CLI).
metadata:
  version: '2.0'
  scope: [general]
  auto_invoke: 'When creating commits, branches, or organizing code changes'
---

# Git Flow

Strict conventions for commits, branches, and PRs.

**Rule of thumb: if you are about to run `git commit`, `git checkout -b`, or `gh pr create`, READ THIS FILE first.**

---

# Critical Rules

## 🚫 NEVER Push

**The AI agent must NEVER execute `git push`.**

- AI creates branches, stages files, writes commits
- **USER manually pushes and opens PRs**

This is non-negotiable. The push is the user's responsibility.

## 🚫 NEVER Stage Everything

Always `git add <specific files>`. Never `git add .`, `git add -A`, or `git add <dir>`.

```bash
# Good
git add src/modules/users/users.service.ts

# Bad
git add .
git add -A
git add src/
```

## 🚫 NEVER Commit to main

Work happens on a feature branch. `main` only receives merges.

---

# Branch Naming

```
<type>/<short-description>
```

| Type        | Description           | Example                  |
| ----------- | --------------------- | ------------------------ |
| `feat/`     | New feature           | `feat/user-registration` |
| `fix/`      | Bug fix               | `fix/logger-status-code` |
| `chore/`    | Config, deps, tooling | `chore/bcrypt-config`    |
| `docs/`     | Documentation only    | `docs/api-endpoints`     |
| `refactor/` | Code refactoring      | `refactor/user-entity`   |
| `test/`     | Adding/updating tests | `test/user-service`      |

**Rules:**

- Kebab-case: `feat/user-registration` (not `feat/userRegistration`)
- Short and descriptive
- One logical change per branch

---

# Commit Message Format

## Header (required)

```
<type>(<scope>): <subject>
```

### Types

| Type       | Description                 |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `docs`     | Documentation               |
| `style`    | Formatting (no code change) |
| `refactor` | Code refactoring            |
| `test`     | Adding/updating tests       |
| `chore`    | Config, deps, tooling       |
| `perf`     | Performance improvement     |
| `ci`       | CI changes                  |
| `build`    | Build system changes        |

### Scope

The module or component affected: `users`, `auth`, `config`, `prisma`, `web`, `backend`, etc.

### Subject

- **Imperative mood:** "add", "fix", "update" (not "added", "fixing")
- **No period** at the end
- **Lowercase** first letter
- **Max 72 characters**
- No vague words ("changes", "stuff", "fix")

## Body (optional but recommended)

The body explains **why** the change was made and **what** it does at a high level. It is NOT a code review.

```
- Bullet points describing the change
- Each bullet starts with a verb in imperative mood
- Wrap lines at 100 characters
- Reference related issues: `Closes #123`, `Refs #456`
```

## Footer (optional)

- `Closes #123` — closes an issue
- `Fixes #456` — fixes a bug
- `BREAKING CHANGE: <description>` — for breaking changes
- `Co-authored-by: Name <email>` — co-authors

## Full Examples

### Simple commit (header only)

```
feat(auth): add JWT token generation
```

### Commit with body

```
feat(auth): add JWT token generation

- Implement AuthService.login with bcrypt password comparison
- Implement AuthService.generateToken with 15m expiry
- Add JwtModule.registerAsync with ConfigService secret
- Add POST /api/v1/auth/login endpoint

Refs #42
```

### Bug fix

```
fix(orders): correct status enum mapping in status-history

The OrderStatusHistory.toStatus was being stored as the
string representation of the enum instead of the enum value,
causing Prisma to reject inserts with type errors.

Use enum value directly instead of Object.values() stringification.
```

### Breaking change

```
feat(api): change order response shape

BREAKING CHANGE: orders now return ISO 8601 timestamps
instead of unix epoch. Clients must update date parsing.
```

---

# AI Commit Workflow

```bash
# 1. Create branch from main
git checkout main
git checkout -b feat/user-registration

# 2. Inspect what's actually changed
git status
git diff --stat

# 3. Stage SPECIFIC files (not git add .)
git add src/modules/users/domain/entities/user.entity.ts
git add src/modules/users/users.service.ts
git add src/modules/users/users.controller.ts

# 4. Create commit
git commit -m "feat(users): add user registration endpoint"

# 5. Report to user (NEVER PUSH)
echo "Branch 'feat/user-registration' ready. Run: git push origin feat/user-registration"
```

## Commit Organization

Group related files into logical commits. Don't dump everything in one commit.

```bash
# Commit 1: Domain layer
git add src/modules/users/domain/
git commit -m "feat(users): add UserEntity with create and rehydrate"

# Commit 2: Infrastructure
git add src/modules/users/infrastructure/
git commit -m "feat(users): add UsersRepository and UsersMapper"

# Commit 3: Service
git add src/modules/users/users.service.ts
git commit -m "feat(users): add UsersService with register use case"

# Commit 4: Controller + DTO
git add src/modules/users/users.controller.ts
git add src/modules/users/register-user.dto.ts
git commit -m "feat(users): add UsersController and RegisterUserDto"
```

---

# Creating a Pull Request

## Step 1: Check for `gh` CLI

Before doing anything, check if the user has `gh` installed and authenticated.

```bash
command -v gh && gh auth status
```

**If `gh` is available AND authenticated:** you can use `gh pr create` (see below).
**If `gh` is missing or not authenticated:** fall back to manual instructions.

## Step 2a: Create PR with `gh` (if available)

Use this PR description format. The `gh` command will prompt for title interactively; pass it with `--title`.

```bash
gh pr create --base main --title "feat(users): add user registration endpoint" --body "$(cat <<'EOF'
## Summary

- Add user registration endpoint with email/password
- Implement bcrypt hashing and JWT token generation
- Wire AuthModule and UsersModule in AppModule

## Why

The team needs the ability to onboard new users before the
client portal launch. This unblocks the auth flow.

## Changes

- feat(auth): add AuthService with login, generateToken, validateUser
- feat(auth): add JwtModule.registerAsync with ConfigModule
- feat(users): add UsersRepository and UsersMapper
- feat(users): add POST /api/v1/users/register endpoint
- test(auth): add unit tests for AuthService

## Testing

- `pnpm run check` passes (format + lint + typecheck)
- Manual: POST /api/v1/users/register with valid payload returns 201 + token
- Manual: invalid payload returns 400 with validation errors

## Checklist

- [x] Tests pass
- [x] Lint passes
- [x] TypeCheck passes
- [x] No dependency edits without instruction
- [x] No drive-by refactors

Refs #42
EOF
)"
```

## Step 2b: Manual PR creation (no `gh`)

If `gh` is not available, give the user the PR title and description to paste manually:

```bash
echo "gh not available. Use this PR template on GitHub:

Title:
feat(users): add user registration endpoint

Description:
[ paste the same template above ]"
```

## PR Description Format

The PR description must follow this template. Fill in every section — leave nothing blank.

```markdown
## Summary

- One to three bullets describing WHAT was done
- Each bullet starts with a verb in imperative mood

## Why

- The motivation / problem this PR solves
- Reference any related issues

## Changes

- Bullet list of notable commits grouped by area
- Format: `<type>(<scope>): <subject>` for each

## Testing

- How the changes were verified
- Commands run (e.g. `pnpm run check`)
- Manual test steps if applicable

## Checklist

- [x] Tests pass
- [x] Lint passes
- [x] TypeCheck passes
- [x] No dependency edits without instruction
- [x] No drive-by refactors
- [x] No `any` or unsafe type assertions introduced
```

## PR Title

**The PR title MUST be the same as the first/header commit's subject.** This keeps history clean and allows squash-merge to produce a clean message.

```
feat(users): add user registration endpoint
```

---

# What NEVER to Do

- ❌ Execute `git push` (any branch, any reason)
- ❌ Use `git add .` or `git add -A`
- ❌ Push directly to `main`
- ❌ Mix multiple features in one branch
- ❌ Vague commit messages ("fix", "update", "changes")
- ❌ Commit unrelated changes together
- ❌ Skip the scope when relevant
- ❌ Use past tense ("added feature" → "add feature")
- ❌ Create a PR with empty body sections
- ❌ Forget to check for `gh` CLI before offering PR instructions

---

# Quick Reference

```bash
# Create branch
git checkout -b feat/user-registration

# Stage specific files
git add src/modules/users/users.service.ts

# Commit
git commit -m "feat(users): add registration endpoint"

# Report to user (DO NOT PUSH)
# "Branch ready. Push with: git push origin feat/user-registration"

# Check gh availability
command -v gh && gh auth status

# Create PR with gh
gh pr create --base main --title "feat(...): ..." --body "..."

# NEVER
git push origin feat/user-registration
git push origin main
git add .
```
