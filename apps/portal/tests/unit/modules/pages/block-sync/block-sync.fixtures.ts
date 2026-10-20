import { documentToBlocks, type PageContent, pageContentSchema, type Result } from '@neuma/shared';
import { Doc, encodeStateAsUpdate } from 'yjs';
import { encodeBase64 } from '@/modules/pages/block-sync/lib/block-sync.base64.lib';
import { isRichTextValue, snapshotContent } from '@/modules/pages/block-sync/lib/block-sync.snapshot.lib';
import type {
  BlockSnapshot,
  BlockSnapshotMap,
  BlockWireOperation,
  SyncedBlock,
} from '@/modules/pages/block-sync/types/block-sync.types';

export const PAGE_ID = 'page-1';
export const SPACE_ID = 'space-1';

export interface FixtureNode {
  readonly attrs?: Record<string, unknown>;
  readonly content?: readonly unknown[];
  readonly marks?: readonly unknown[];
  readonly text?: string;
  readonly type: string;
}

export const text = (value: string, marks?: readonly unknown[]): FixtureNode =>
  marks === undefined ? { text: value, type: 'text' } : { marks, text: value, type: 'text' };

export const bold = (value: string): FixtureNode => text(value, [{ type: 'strong' }]);

export const link = (value: string, href: string): FixtureNode => text(value, [{ attrs: { href }, type: 'link' }]);

export const mention = (label: string): FixtureNode => ({
  attrs: { label, pageId: 'page-target', spaceId: SPACE_ID },
  type: 'mention',
});

export const paragraph = (id: string, ...content: readonly unknown[]): FixtureNode => ({
  attrs: { id },
  content,
  type: 'paragraph',
});

export const heading = (id: string, level: number, value: string): FixtureNode => ({
  attrs: { id, level },
  content: [text(value)],
  type: 'heading',
});

export const listItem = (id: string, ...content: readonly unknown[]): FixtureNode => ({
  attrs: { id },
  content,
  type: 'list_item',
});

export const bulletList = (...items: readonly unknown[]): FixtureNode => ({ content: items, type: 'bullet_list' });

export const taskItem = (id: string, checked: boolean, ...content: readonly unknown[]): FixtureNode => ({
  attrs: { checked, id },
  content,
  type: 'task_item',
});

export const taskList = (...items: readonly unknown[]): FixtureNode => ({ content: items, type: 'task_list' });

export const toggle = (id: string, summary: string, ...content: readonly unknown[]): FixtureNode => ({
  attrs: { id, open: true, summary },
  content,
  type: 'toggle',
});

export const tableCell = (id: string, ...content: readonly unknown[]): FixtureNode => ({
  attrs: { id },
  content,
  type: 'table_cell',
});

export const tableRow = (id: string, ...cells: readonly unknown[]): FixtureNode => ({
  attrs: { id },
  content: cells,
  type: 'table_row',
});

export const table = (id: string, ...rows: readonly unknown[]): FixtureNode => ({
  attrs: { id },
  content: rows,
  type: 'table',
});

export const documentOf = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

export const unwrap = <Value>(result: Result<Value, Error>): Value => {
  if (result.isFail()) throw result.getError();
  return result.getValue();
};

export const snapshotsOf = (content: PageContent): BlockSnapshotMap =>
  unwrap(snapshotContent(content, PAGE_ID, SPACE_ID));

export const readSnapshot = (snapshots: BlockSnapshotMap, id: string): BlockSnapshot => {
  const snapshot = snapshots.get(id);
  if (snapshot === undefined) throw new Error(`No snapshot ${id}`);
  return snapshot;
};

const encodeTextState = (properties: Readonly<Record<string, unknown>>): string | null => {
  const richKeys = Object.keys(properties).filter((key) => isRichTextValue(properties[key]));
  if (richKeys.length === 0) return null;
  const doc = new Doc();
  for (const key of richKeys) {
    const segments = properties[key];
    if (Array.isArray(segments)) doc.getText(key).applyDelta(segments);
  }
  return encodeBase64(encodeStateAsUpdate(doc));
};

/** What the server would answer for the page: every block with its version, role and Yjs text state. */
export const syncedBlocksOf = (content: PageContent, version = 1, pageId = PAGE_ID): readonly SyncedBlock[] => {
  const tree = unwrap(
    documentToBlocks({
      content,
      cover: null,
      icon: null,
      pageId,
      parentId: null,
      propertyValues: null,
      spaceId: SPACE_ID,
      title: '',
    }),
  );
  return [tree.page, ...tree.blocks].map((block) => ({
    alive: true,
    children: block.children,
    format: block.format,
    id: block.id,
    parentId: block.parentId,
    properties: block.properties,
    role: 'full',
    spaceId: SPACE_ID,
    textState: encodeTextState(block.properties),
    type: block.type,
    version,
  }));
};

export const describeOperations = (operations: readonly BlockWireOperation[]): readonly string[] =>
  operations.map((operation) => `${operation.command}:${operation.pointer.id}:${operation.path.join('.')}`);

export const flattenGroups = (groups: readonly (readonly BlockWireOperation[])[]): readonly BlockWireOperation[] =>
  groups.flat();
