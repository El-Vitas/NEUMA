import type { BlockDraft, BlockTree, PageCoverValue, PageIcon, PageLifecycle } from '@neuma/shared';
import {
  BLOCK_WRITE_COMMAND,
  BLOCK_WRITE_ROOT_PAGES_PATH,
  BLOCK_WRITE_SPACE_TABLE,
  BLOCK_WRITE_TABLE,
} from '../../../common/domain/block-writer.constants';
import { isSameJson } from '../../../common/domain/json.domain';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import { toPageTitleText } from './page.block.domain';
import { PAGE_FORMAT_KEY, PAGE_PROPERTY_KEY } from './page.block.domain.constants';
import type {
  PageBlockOperation,
  PageContentBlock,
  PageContentSnapshot,
  PagePlacement,
  PageSiblings,
  PageValueChanges,
} from './page.block.domain.types';

/** What survives serialization is all the database stores: the editor schemas type their optional fields loosely. */
export const toWireJson = (value: unknown): unknown => {
  const serialized: unknown = JSON.parse(JSON.stringify(value));
  return serialized;
};

const operate = (
  pointerId: string,
  command: string,
  path: readonly string[],
  args: unknown,
  table: string = BLOCK_WRITE_TABLE,
): PageBlockOperation => ({
  args: toWireJson(args),
  command,
  path,
  pointer: { id: pointerId, table },
});

const isEmptyFormat = (format: unknown): boolean =>
  format === null || format === undefined || (typeof format === 'object' && Object.keys(format).length === 0);

/** A block with no format and one with an empty format look the same on the page. */
const hasSameFormat = (stored: unknown, wanted: unknown): boolean =>
  (isEmptyFormat(stored) && isEmptyFormat(wanted)) || isSameJson(stored, wanted);

export const buildCreateOperation = (draft: BlockDraft): PageBlockOperation =>
  operate(draft.id, BLOCK_WRITE_COMMAND.set, [], {
    format: isEmptyFormat(draft.format) ? null : draft.format,
    id: draft.id,
    parentId: draft.parentId,
    properties: draft.properties,
    type: draft.type,
  });

/** Without an anchor the child goes last. */
export const buildListAfterOperation = (
  parentId: string,
  childId: string,
  afterId: null | string,
): PageBlockOperation =>
  operate(
    parentId,
    BLOCK_WRITE_COMMAND.listAfter,
    ['children'],
    afterId === null ? { id: childId } : { after: afterId, id: childId },
  );

/** Without an anchor the child goes first. */
export const buildListBeforeOperation = (
  parentId: string,
  childId: string,
  beforeId: null | string,
): PageBlockOperation =>
  operate(
    parentId,
    BLOCK_WRITE_COMMAND.listBefore,
    ['children'],
    beforeId === null ? { id: childId } : { before: beforeId, id: childId },
  );

export const buildListRemoveOperation = (parentId: string, childId: string): PageBlockOperation =>
  operate(parentId, BLOCK_WRITE_COMMAND.listRemove, ['children'], { id: childId });

const listChildrenOf = (draft: BlockDraft): PageBlockOperation[] =>
  draft.children.map((childId) => buildListAfterOperation(draft.id, childId, null));

/**
 * A page and its blocks as operations: every block is created, then every parent lists its children in order.
 * The page itself is listed by its parent right after the sibling it is placed behind, or last.
 */
export const buildCreatePageOperations = (tree: BlockTree, placement: PagePlacement): PageBlockOperation[] => {
  const drafts = [tree.page, ...tree.blocks];
  const place = { parentId: tree.page.parentId, spaceId: tree.page.spaceId };
  const listing = [buildSiblingAfterOperation(place, tree.page.id, placement.afterSiblingId)];
  return [...drafts.map(buildCreateOperation), ...drafts.flatMap(listChildrenOf), ...listing];
};

export const buildTitleOperation = (pageId: string, title: string): PageBlockOperation =>
  operate(pageId, BLOCK_WRITE_COMMAND.set, ['properties', PAGE_PROPERTY_KEY.title], toPageTitleText(title));

/** A null icon removes the key, because a null is not a valid icon. */
export const buildIconOperation = (pageId: string, icon: PageIcon | null): PageBlockOperation =>
  operate(pageId, BLOCK_WRITE_COMMAND.update, ['format'], { [PAGE_FORMAT_KEY.icon]: icon });

export const buildCoverOperation = (pageId: string, cover: PageCoverValue | null): PageBlockOperation =>
  operate(pageId, BLOCK_WRITE_COMMAND.update, ['format'], { [PAGE_FORMAT_KEY.cover]: cover });

export const buildValuesOperation = (pageId: string, changes: PageValueChanges): PageBlockOperation =>
  operate(pageId, BLOCK_WRITE_COMMAND.mergePageValues, [], { values: changes });

/** For a change of the shape of the collection: it reaches rows a lock or the trash would keep from an edit. */
export const buildValueRewriteOperations = (pageId: string, changes: PageValueChanges): PageBlockOperation[] =>
  Object.keys(changes).length === 0
    ? []
    : [operate(pageId, BLOCK_WRITE_COMMAND.rewritePageValues, [], { values: changes })];

export const buildLockOperation = (pageId: string, isLocked: boolean): PageBlockOperation =>
  operate(pageId, BLOCK_WRITE_COMMAND.setLock, [], { locked: isLocked });

export const buildVerificationOperation = (
  pageId: string,
  isVerified: boolean,
  expiresAt: Date | null,
): PageBlockOperation =>
  operate(pageId, BLOCK_WRITE_COMMAND.setVerification, [], {
    expiresAt: expiresAt === null ? null : expiresAt.toISOString(),
    verified: isVerified,
  });

export const buildOwnerOperation = (pageId: string, ownerId: null | string): PageBlockOperation =>
  operate(pageId, BLOCK_WRITE_COMMAND.setOwner, [], { ownerId });

/** A restored page whose parent is in the trash goes to the root: `detachFromParentId` names the parent to leave. */
export const buildLifecycleOperation = (
  pageId: string,
  lifecycle: PageLifecycle,
  detachFromParentId: null | string,
): PageBlockOperation =>
  operate(
    pageId,
    BLOCK_WRITE_COMMAND.setLifecycle,
    [],
    detachFromParentId === null ? { lifecycle } : { detachFromParentId, lifecycle },
  );

/** The page leaves its place and lands, with everything below it, in another space: under a page, or at the top. */
export const buildSpaceMoveOperation = (
  pageId: string,
  destination: { readonly parentId: null | string; readonly spaceId: string },
  detachFromParentId: null | string,
): PageBlockOperation =>
  operate(pageId, BLOCK_WRITE_COMMAND.moveToSpaceRoot, [], {
    ...(detachFromParentId === null ? {} : { detachFromParentId }),
    ...(destination.parentId === null ? {} : { parentId: destination.parentId }),
    spaceId: destination.spaceId,
  });

/** Takes the page out of the list that holds it: the children of a page, or the top-level pages of a space. */
const buildSiblingRemoveOperation = (place: PageSiblings, pageId: string): PageBlockOperation =>
  place.parentId === null
    ? operate(
        place.spaceId,
        BLOCK_WRITE_COMMAND.listRemove,
        [BLOCK_WRITE_ROOT_PAGES_PATH],
        { id: pageId },
        BLOCK_WRITE_SPACE_TABLE,
      )
    : buildListRemoveOperation(place.parentId, pageId);

/** Without an anchor the page goes last among its siblings. */
export const buildSiblingAfterOperation = (
  place: PageSiblings,
  pageId: string,
  afterId: null | string,
): PageBlockOperation =>
  place.parentId === null
    ? operate(
        place.spaceId,
        BLOCK_WRITE_COMMAND.listAfter,
        [BLOCK_WRITE_ROOT_PAGES_PATH],
        afterId === null ? { id: pageId } : { after: afterId, id: pageId },
        BLOCK_WRITE_SPACE_TABLE,
      )
    : buildListAfterOperation(place.parentId, pageId, afterId);

/** The page leaves the list of its old place, takes the new parent and goes last among its siblings. */
export const buildMoveOperations = (pageId: string, from: PageSiblings, to: PageSiblings): PageBlockOperation[] => [
  operate(pageId, BLOCK_WRITE_COMMAND.update, [], { parentId: to.parentId }),
  buildSiblingRemoveOperation(from, pageId),
  buildSiblingAfterOperation(to, pageId, null),
];

/** A null `beforeId` places the page last among its siblings; a null parent means the top of the space. */
export const buildReorderOperation = (
  place: PageSiblings,
  pageId: string,
  beforeId: null | string,
): PageBlockOperation => {
  if (beforeId === null) return buildSiblingAfterOperation(place, pageId, null);
  return place.parentId === null
    ? operate(
        place.spaceId,
        BLOCK_WRITE_COMMAND.listBefore,
        [BLOCK_WRITE_ROOT_PAGES_PATH],
        { before: beforeId, id: pageId },
        BLOCK_WRITE_SPACE_TABLE,
      )
    : operate(place.parentId, BLOCK_WRITE_COMMAND.listBefore, ['children'], { before: beforeId, id: pageId });
};

/** The values to write so the page ends up with `merged`: a key that is gone is sent as null. */
export const diffPageValues = (
  current: SchemaPropertyValues | null,
  merged: SchemaPropertyValues | null,
): PageValueChanges => {
  const before = current ?? {};
  const after = merged ?? {};
  const changed = Object.entries(after).filter(([key, value]) => !isSameJson(before[key], value));
  const removed = Object.keys(before).filter((key) => !(key in after));
  return { ...Object.fromEntries(changed), ...Object.fromEntries(removed.map((key) => [key, null])) };
};

const hasChanges = (changes: PageValueChanges): boolean => Object.keys(changes).length > 0;

export const buildValueChangeOperations = (pageId: string, changes: PageValueChanges): PageBlockOperation[] =>
  hasChanges(changes) ? [buildValuesOperation(pageId, changes)] : [];

const buildUpdateOperation = (
  stored: PageContentBlock,
  wanted: BlockDraft,
  isBroughtBack: boolean,
): PageBlockOperation[] => {
  const patch = {
    ...(isBroughtBack ? { alive: true } : {}),
    ...(stored.type === wanted.type ? {} : { type: wanted.type }),
    ...(isSameJson(stored.properties, wanted.properties) ? {} : { properties: wanted.properties }),
    ...(hasSameFormat(stored.format, wanted.format)
      ? {}
      : { format: isEmptyFormat(wanted.format) ? null : wanted.format }),
    ...(stored.parentId === wanted.parentId ? {} : { parentId: wanted.parentId }),
  };
  return Object.keys(patch).length === 0 ? [] : [operate(stored.id, BLOCK_WRITE_COMMAND.update, [], patch)];
};

const buildRemoveOperation = (stored: PageContentBlock): PageBlockOperation =>
  operate(stored.id, BLOCK_WRITE_COMMAND.update, [], { alive: false });

/**
 * The children of `parentId` as they must end up: whoever left is taken out, and from the first child that is not
 * where it should be, the rest are placed again one after the other. A child that already sits in its place is
 * left alone, so appending to a long page sends only what was appended.
 */
const buildChildrenOperations = (
  parentId: string,
  currentChildren: readonly string[],
  wantedChildren: readonly string[],
): PageBlockOperation[] => {
  const wanted = new Set(wantedChildren);
  const kept = currentChildren.filter((id) => wanted.has(id));
  const firstMisplaced = wantedChildren.findIndex((id, index) => kept[index] !== id);
  const removals = currentChildren.filter((id) => !wanted.has(id)).map((id) => buildListRemoveOperation(parentId, id));
  if (firstMisplaced === -1) return removals;
  const placements = wantedChildren.slice(firstMisplaced).map((id, offset) => {
    const previousId = wantedChildren[firstMisplaced + offset - 1];
    return previousId === undefined
      ? buildListBeforeOperation(parentId, id, null)
      : buildListAfterOperation(parentId, id, previousId);
  });
  return [...removals, ...placements];
};

const listContentChildren = (snapshot: PageContentSnapshot): ReadonlyMap<string, readonly string[]> => {
  const contentIds = new Set(snapshot.blocks.map((block) => block.id));
  return new Map([
    [snapshot.pageId, snapshot.pageChildren.filter((id) => contentIds.has(id))],
    ...[...snapshot.blocks, ...snapshot.removed].map((block): [string, readonly string[]] => [
      block.id,
      block.children,
    ]),
  ]);
};

const listWantedChildren = (tree: BlockTree): ReadonlyMap<string, readonly string[]> =>
  new Map([tree.page, ...tree.blocks].map((draft): [string, readonly string[]] => [draft.id, draft.children]));

/**
 * What it takes to turn the blocks a page holds into the ones a document describes, by id: a block the document no
 * longer has is removed, one it adds is created, one it still has is updated or moved, a removed block it names
 * again is brought back, and every parent whose children differ is put in order. The page block itself is only
 * touched to list its children.
 */
export const planContentOperations = (snapshot: PageContentSnapshot, tree: BlockTree): PageBlockOperation[] => {
  const storedById = new Map(snapshot.blocks.map((block) => [block.id, block]));
  const removedById = new Map(snapshot.removed.map((block) => [block.id, block]));
  const wantedIds = new Set(tree.blocks.map((draft) => draft.id));
  const created = tree.blocks.filter((draft) => !storedById.has(draft.id) && !removedById.has(draft.id));
  const kept = tree.blocks.flatMap((draft) => {
    const stored = storedById.get(draft.id);
    if (stored !== undefined) return buildUpdateOperation(stored, draft, false);
    const removed = removedById.get(draft.id);
    return removed === undefined ? [] : buildUpdateOperation(removed, draft, true);
  });
  const dropped = snapshot.blocks.filter((block) => !wantedIds.has(block.id)).map(buildRemoveOperation);
  const currentChildren = listContentChildren(snapshot);
  const wantedChildren = listWantedChildren(tree);
  const parentIds = new Set([...currentChildren.keys(), ...wantedChildren.keys()]);
  const ordering = [...parentIds].flatMap((parentId) =>
    buildChildrenOperations(parentId, currentChildren.get(parentId) ?? [], wantedChildren.get(parentId) ?? []),
  );
  return [...created.map(buildCreateOperation), ...kept, ...dropped, ...ordering];
};
