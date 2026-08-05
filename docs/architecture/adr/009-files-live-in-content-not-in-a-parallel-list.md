# 009: A file lives where it was placed in the content

**Status:** Accepted
**Date:** 2026-08-05
**Depends on:** `008-adopt-single-page-primitive.md`

## Context

The product target for attachments is the behaviour users already expect: **you drop a file where you want it and you are done.** No upload dialog that leads somewhere else, no separate place to go and manage what you attached.

The current implementation does not do that, because — like the page/record split in ADR-008 — it stores the same fact twice.

**Representation 1 — the row.** `FileAsset` carries `pageId` and `databaseRecordId` (exactly one must be set; `file.asset.repository.ts:42` enforces it). `GET /api/v1/files/page/:pageId` lists assets by that column, and the portal renders them as a separate "Attachments" section under the document.

**Representation 2 — the content.** The editor schema has `file` and `image` nodes carrying an `assetId`, so an asset is also referenced from a position inside the ProseMirror document.

Both are written on upload today: `addUploadedAttachment` inserts the node and the row already exists. But nothing keeps them in agreement afterwards:

- Delete the node from the text → the row survives, so the file still appears in the attachments list while existing nowhere in the document. The user "removed" it and it is still there.
- Delete the asset from the attachments list → the node in the content becomes a reference to a deleted asset.
- Upload without inserting → an asset that belongs to the page and appears in a list, but has no place in the document.

This is the same disease as the two content primitives: **two sources of truth for one fact, with no reconciliation.** It also produces the UI the user explicitly does not want — attaching is a two-surface operation instead of one gesture.

Authorization, by contrast, is already correct and is not in question: `file.asset.repository.ts` resolves an asset's `pageId` and checks page access — which resolves to space access — before allowing download or listing. That mechanism is kept exactly as is.

## Alternatives Considered

- **Keep both representations, add reconciliation.** PRO: no behaviour change. CON: reconciliation between a JSON document and a row is exactly the thing that will drift; it is work spent defending a duplication instead of removing it. Rejected.
- **Make the row the truth and drop the inline nodes.** PRO: simplest data model. CON: files could then only ever appear as a list at the bottom of a page — you could not put a diagram in the middle of the paragraph it explains. This is a downgrade in the product's core surface. Rejected.
- **Make the content the truth for placement, keep the row for ownership (chosen).** PRO: one gesture in the UI; placement cannot drift because there is only one place it is recorded; permissions and cleanup keep a stable anchor. CON: an asset can become unreferenced, so orphan collection is now a real concern that must be designed rather than ignored.

## Decision

**The content is the single source of truth for *where* a file lives.** A file appears on a page because a `file` or `image` node in that page's content references its `assetId`. There is no second list that also claims the file is there.

**`FileAsset.pageId` is the ownership anchor, not the placement.** It answers three questions and only those three:

1. **Permission** — which page's access rules govern this blob (unchanged; already implemented and correct).
2. **Ownership** — which page's deletion should take the blob with it.
3. **Reference scanning** — which page's content to scan when deciding whether the blob is still referenced. (Worded as "scanning" rather than "collection" deliberately: since ADR-008, *collection* is a domain term meaning a page that carries a schema, and reusing it for garbage collection here would be ambiguous.)

It must not be used to render "the files of this page" as a parallel list, because that list is what makes the two representations diverge.

**Referenced-ness is derived, not stored.** The block projection introduced by ADR-008 (level 3 of its storage ladder) already walks every page's content and knows every node in it. Extracting the set of referenced `assetId`s is the same pass. An asset whose id appears in no node of its owning page is unreferenced.

**Unreferenced assets are collected on a delay, never immediately.** Deleting a node must not destroy the blob synchronously: undo would break, and page version history holds older content that still references it. An unreferenced asset is marked and swept after a grace period. The existing `FileAssetLifecycle` (`ACTIVE`/`DELETED`) with `deletedAt` already models the soft delete this needs.

**`databaseRecordId` disappears** with `DatabaseRecord` (ADR-008, Phase 3). A file attached to what used to be a record becomes a file attached to a page, and the exactly-one-of check in the repository collapses to a single required `pageId`.

## The interaction this produces

Stated explicitly, because "simple" is the requirement and a vague requirement gets built vaguely:

- **Drag a file onto the document** → it uploads and appears at the drop position. The editor already receives the drop (`onDropCapture` → `uploadDroppedFile`); what changes is that the insertion position is the drop position rather than the end.
- **Paste an image** → same path, at the caret.
- **`/file` or `/image` from the slash menu** → picker, then insert at the caret.
- **Images render inline. Other files render as a compact card** with filename, size and download, in the flow of the text.
- **Removing the file is deleting the block**, like any other content. There is no second place to also remove it from.
- **Upload state lives at the insertion point** — a placeholder block that shows progress and, on failure, an inline retry. Failure must not be signalled only by a toast that disappears; the block itself is the durable place where the error belongs.

A file-management view (find large files, find orphans) may still exist as an administrative surface. It is not the attachment path and must not be presented as one.

## Consequences

- The current "Attachments" section under the document stops being the primary surface. `GET /files/page/:pageId` survives for administrative and cleanup use, not for rendering the page.
- Page version history keeps working: an old version references asset ids that are still `ACTIVE` because the grace period and the "referenced by any version" check protect them. **Restoring an old page version must not resurrect an already-swept blob** — a restored version whose asset is gone renders a missing-file block rather than a broken image.
- Copying a block between pages copies a reference to an asset owned by another page. The reader's access is governed by the asset's owning page, so a copied block can render for the author and not for a colleague. This is a real edge and must produce an explicit "you do not have access to this file" state, never a silent broken image.
- Storage cleanup becomes possible at all, which it is not today: currently nothing ever marks an asset unreferenced.

## Risks

- **Sweeping something still in use.** The grace period plus the version-history check are the mitigation. The failure mode is data loss, so the sweep must be conservative: when in doubt, keep the blob. Deleting a file that is still referenced somewhere is far worse than paying for storage.
- **Cross-page references and permissions.** As above: an asset referenced from a page other than its owner is governed by its owner's access. Rendering must fail closed.
