# Neuma Scope Documents

These documents are the scope authority for implementation work.

## Current Scope

Read `current-scope.md` before creating or modifying code. It lists the modules, remaining files, and completion criteria for the current product phase.

## Future Scope

Read `future-scope.md` to see features intentionally excluded from the current phase. Items there are not bugs, missing implementation, or active slices.

## Execution Map

Read `../superpowers/plans/2026-08-03-neuma-module-slices.md` for the module-level slice scopes and dependencies. A slice may run in parallel only when its file scope is disjoint from the other active slices.

## Model Direction

Read `../architecture/adr/008-adopt-single-page-primitive.md` before touching the page, database, or content-storage models. It establishes `Page` as the only content primitive, turns databases into collections that select pages instead of storing rows, puts page mentions and backlinks into the current scope, fixes `Page.content` as the canonical source of truth for content, and records the four-level storage ladder for blocks with level 3 as the target.

Read `../architecture/adr/009-files-live-in-content-not-in-a-parallel-list.md` before touching attachments. The content is the single source of truth for where a file lives; `FileAsset.pageId` is ownership and permission, not placement.

Both are executed by `../superpowers/plans/2026-08-05-neuma-single-page-primitive.md`, which supersedes the data model in `../superpowers/plans/2026-08-02-neuma-databases.md`.

## Functional Verification

Read `verification/README.md` for the behaviour checklists. They state what the product **must be able to do**, written as things observable in the interface, and are walked one block at a time with El-Vitas testing each one. A block is only closed by that walkthrough — an agent's judgement that something "already works" closes nothing.

**The recurring rule behind all of it:** one fact is stored in one place. Every problem these documents fix — a task that cannot hold knowledge, a file listed in two places, content persisted down two paths — is the same mistake wearing different clothes.
