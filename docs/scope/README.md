# Neuma Scope Documents

These documents are the scope authority for implementation work.

## Current Scope

Read `current-scope.md` before creating or modifying code. It lists the modules, remaining files, and completion criteria for the current product phase.

## Future Scope

Read `future-scope.md` to see features intentionally excluded from the current phase. Items there are not bugs, missing implementation, or active slices.

## Execution Map

Read `../superpowers/plans/2026-08-03-neuma-module-slices.md` for the module-level slice scopes and dependencies. A slice may run in parallel only when its file scope is disjoint from the other active slices.

## Model Direction

Read `../architecture/adr/021-everything-is-a-block.md` before touching the page, database, or content-storage models. It makes `Block` the only entity: a page is a block of type `page`, a collection is a page block with a schema whose rows are its children, and blocks are canonical. There is no `Page.content`. Changes are transactions of operations over block rows, permissions are declared per block and inherited, and search and backlinks are read from `Block` and `BlockLink` in the same transaction. `../architecture/adr/022-retire-the-outbox-and-projection-workers.md` retires the outbox and the projection workers.

`../architecture/adr/008-adopt-single-page-primitive.md` is still the origin of the mention graph and of collections as pages; its storage decisions (`Page.content` as the source of truth, the `PageBlock` projection) are superseded by 021.

Read `../architecture/adr/009-files-live-in-content-not-in-a-parallel-list.md` before touching attachments. The content is the single source of truth for where a file lives; `FileAsset.pageId` is ownership and permission, not placement.

The block model is executed by `../superpowers/plans/2026-10-19-todo-es-un-bloque.md`. The attachment decision (009) follows `../superpowers/plans/2026-08-05-neuma-single-page-primitive.md`, Phase 5.

## Functional Verification

Read `verification/README.md` for the behaviour checklists. They state what the product **must be able to do**, written as things observable in the interface, and are walked one block at a time with El-Vitas testing each one. A block is only closed by that walkthrough — an agent's judgement that something "already works" closes nothing.

**The recurring rule behind all of it:** one fact is stored in one place. Every problem these documents fix — a task that cannot hold knowledge, a file listed in two places, content persisted down two paths — is the same mistake wearing different clothes.
