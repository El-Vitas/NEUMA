import { describe, expect, test } from 'bun:test';
import { PAGE_DOCUMENT_NODES } from '../page-document/page-document.structure.js';
import {
  maximumTableColumns,
  maximumTableColumnWidth,
  maximumToggleSummaryLength,
  PAGE_CONTENT_NODE_TYPES,
} from '../schemas/page-content.schema.js';
import { PAGE_TITLE_MAX_LENGTH } from '../types/page.types.js';
import { parseBlockContent, readBlockText } from './block-content.lib.js';
import { BLOCK_CONTENT_SCHEMAS, blockContentSchema } from './block-content.schemas.js';
import type { BlockType } from './block-content.types.js';
import {
  BLOCK_CONTENT_ERROR_CODE,
  BLOCK_NODE_DISPOSITION,
  BLOCK_NODE_DISPOSITION_KIND,
  BLOCK_TYPE,
  BLOCK_TYPE_VALUES,
} from './block-type.constants.js';

const ASSET_ID = 'asset-1';
const USER_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e';

const annotations = {
  backgroundColor: 'yellow',
  textColor: 'red',
};

const title = [{ insert: 'Hello ' }, { attributes: { strong: true }, insert: 'world' }];

interface Sample {
  readonly format: Record<string, unknown>;
  readonly properties: Record<string, unknown>;
}

const SAMPLES: Readonly<Record<BlockType, Sample>> = {
  page: {
    format: { cover: { assetId: USER_ID, position: 40 }, icon: { kind: 'emoji', value: '📄' } },
    properties: { title: [{ insert: 'Roadmap' }], values: { status: 'open', tags: ['a', 'b'], done: false, size: 3 } },
  },
  paragraph: { format: annotations, properties: { title } },
  heading: { format: { ...annotations, collapsed: true }, properties: { level: 2, title } },
  bulleted_list_item: { format: annotations, properties: { title } },
  numbered_list_item: { format: { ...annotations, start: 3 }, properties: { title } },
  to_do: { format: annotations, properties: { checked: true, title } },
  blockquote: { format: annotations, properties: {} },
  callout: { format: { ...annotations, icon: 'idea' }, properties: {} },
  code_block: {
    format: { ...annotations, frameHeight: 400, shown: 'both', wrapped: true },
    properties: { language: 'mermaid', title: [{ insert: 'graph TD' }] },
  },
  divider: { format: annotations, properties: {} },
  toggle: { format: { ...annotations, open: true }, properties: { title } },
  image: {
    format: { ...annotations, align: 'center', width: 0.5 },
    properties: { alt: 'Logo', assetId: ASSET_ID, caption: 'Our logo' },
  },
  video: { format: { align: 'full', width: 1 }, properties: { assetId: ASSET_ID } },
  audio: { format: { align: 'left' }, properties: { assetId: ASSET_ID } },
  file: {
    format: { align: 'left', display: 'line', width: 0.5 },
    properties: { assetId: ASSET_ID, mimeType: 'application/pdf', size: 2048 },
  },
  bookmark: {
    format: annotations,
    properties: {
      description: 'A site',
      icon: 'https://example.com/icon.png',
      title: 'Example',
      url: 'https://example.com/a',
    },
  },
  embed: {
    format: { align: 'center', width: 0.8 },
    properties: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc' },
  },
  button: {
    format: annotations,
    properties: { deed: 'blocks', label: 'Add', pageId: 'p1', place: 'below', spaceId: 's1' },
  },
  table_of_contents: { format: annotations, properties: {} },
  synced: { format: annotations, properties: { blockId: 'b1', pageId: 'p1', spaceId: 's1' } },
  subpage: { format: annotations, properties: { label: 'Child', pageId: 'p2', spaceId: 's1' } },
  collection: { format: annotations, properties: { pageId: 'p3', spaceId: 's1', viewName: 'Board' } },
  table: { format: { ...annotations, hasHeaderColumn: false, hasHeaderRow: true }, properties: {} },
  table_row: { format: annotations, properties: {} },
  table_cell: {
    format: { ...annotations, colwidth: [120, 80] },
    properties: { colspan: 2, isHeader: true, rowspan: 1 },
  },
  column_list: { format: annotations, properties: {} },
  column: { format: { ...annotations, width: 0.5 }, properties: {} },
  unsupported: {
    format: {},
    properties: {
      node: { attrs: { depth: { deep: [1, null, 'x'] } }, content: [{ type: 'x' }], type: 'future_block' },
    },
  },
};

describe('block types', () => {
  test('has a schema and a sample for every type', () => {
    const byName = (first: string, second: string): number => first.localeCompare(second);
    expect(Object.keys(BLOCK_CONTENT_SCHEMAS).sort(byName)).toEqual([...BLOCK_TYPE_VALUES].sort(byName));
    expect(Object.keys(SAMPLES).sort(byName)).toEqual([...BLOCK_TYPE_VALUES].sort(byName));
    expect(blockContentSchema.options).toHaveLength(BLOCK_TYPE_VALUES.length);
  });

  test.each(BLOCK_TYPE_VALUES)('%s accepts a realistic sample', (type) => {
    const sample = SAMPLES[type];

    const result = parseBlockContent(type, sample.properties, sample.format);

    expect(result.isOk()).toBe(true);
    const parsed: unknown = result.getValue();
    expect(parsed).toEqual({ format: sample.format, properties: sample.properties, type });
  });

  test.each(BLOCK_TYPE_VALUES)('%s rejects an unknown key in properties and in format', (type) => {
    const sample = SAMPLES[type];

    const inProperties = parseBlockContent(type, { ...sample.properties, surprise: 1 }, sample.format);
    const inFormat = parseBlockContent(type, sample.properties, { ...sample.format, surprise: 1 });

    expect(inProperties.getError().issues.map((issue) => issue.field)).toContain('properties.surprise');
    expect(inFormat.getError().issues.map((issue) => issue.field)).toContain('format.surprise');
  });

  test('takes a missing format as an empty one', () => {
    expect(parseBlockContent('divider', {}, null).isOk()).toBe(true);
    expect(parseBlockContent('divider', {}, undefined).isOk()).toBe(true);
  });
});

describe('parseBlockContent errors', () => {
  test('names the field that failed', () => {
    const result = parseBlockContent('heading', { level: 4, title }, {});

    expect(result.getError()).toEqual({
      code: BLOCK_CONTENT_ERROR_CODE.invalidContent,
      issues: [expect.objectContaining({ field: 'properties.level' })],
      type: 'heading',
    });
  });

  test('names the segment inside a rich text', () => {
    const result = parseBlockContent('paragraph', { title: [{ insert: 'ok' }, { insert: '' }] }, {});

    expect(result.isFail()).toBe(true);
    expect(result.getError().issues.every((issue) => issue.field.startsWith('properties.title.1'))).toBe(true);
  });

  test('refuses a type it does not know', () => {
    const result = parseBlockContent('hologram', {}, {});

    expect(result.getError()).toEqual({
      code: BLOCK_CONTENT_ERROR_CODE.unknownType,
      issues: [{ field: 'type', message: 'Unknown block type hologram' }],
      type: 'hologram',
    });
  });

  test('refuses an embed outside its provider hosts and a bad format value', () => {
    const embed = parseBlockContent('embed', { provider: 'youtube', url: 'https://evil.example/x' }, {});
    const color = parseBlockContent('paragraph', { title }, { textColor: 'pink' });

    expect(embed.getError().issues[0]?.field).toBe('properties.url');
    expect(color.getError().issues[0]?.field).toBe('format.textColor');
  });

  test('refuses a toggle title over the summary limit and a page title over the page limit', () => {
    const longTitle = [{ insert: 'a'.repeat(maximumToggleSummaryLength + 1) }];
    const longPageTitle = [{ insert: 'a'.repeat(PAGE_TITLE_MAX_LENGTH + 1) }];

    expect(parseBlockContent('toggle', { title: longTitle }, {}).getError().issues[0]?.field).toBe('properties.title');
    expect(parseBlockContent('page', { title: longPageTitle }, {}).getError().issues[0]?.field).toBe(
      'properties.title',
    );
  });

  test('counts a page title across its segments', () => {
    const halves = [{ insert: 'a'.repeat(PAGE_TITLE_MAX_LENGTH) }, { insert: 'b' }];

    expect(parseBlockContent('page', { title: halves }, {}).isFail()).toBe(true);
  });

  test('refuses a table cell that spans more than a table can hold or has a bad width', () => {
    const tooWide = parseBlockContent('table_cell', { colspan: maximumTableColumns + 1 }, {});
    const badWidth = parseBlockContent('table_cell', {}, { colwidth: [maximumTableColumnWidth + 1] });

    expect(tooWide.getError().issues[0]?.field).toBe('properties.colspan');
    expect(badWidth.getError().issues[0]?.field).toBe('format.colwidth.0');
    expect(parseBlockContent('table_cell', {}, { colwidth: null }).isOk()).toBe(true);
  });
});

describe('unsupported block', () => {
  test('keeps the raw node of a type it does not know', () => {
    const node = { attrs: { mode: 'wide' }, content: [{ nested: { deep: true } }], type: 'timeline' };

    const result = parseBlockContent('unsupported', { node }, {});

    expect(result.getValue().properties).toEqual({ node });
  });

  test('refuses a node whose type is known, because being wrong is not being new', () => {
    const result = parseBlockContent('unsupported', { node: { attrs: {}, type: 'paragraph' } }, {});

    expect(result.getError().issues[0]?.field).toBe('properties.node');
  });

  test('refuses a node nested too deep to be kept safely', () => {
    let deepest: Record<string, unknown> = { leaf: true };
    for (let level = 0; level < 40; level += 1) deepest = { inner: deepest };

    const result = parseBlockContent('unsupported', { node: { attrs: deepest, type: 'timeline' } }, {});

    expect(result.isFail()).toBe(true);
  });
});

describe('readBlockText', () => {
  test('reads the title of a block that has one', () => {
    const content = parseBlockContent('heading', { level: 1, title }, {}).getValue();

    expect(readBlockText(content)).toBe('Hello world');
  });

  test('reads nothing from a table row or cell, whose text lives in their child blocks', () => {
    expect(readBlockText(parseBlockContent('table_row', {}, {}).getValue())).toBe('');
    expect(readBlockText(parseBlockContent('table_cell', {}, {}).getValue())).toBe('');
  });

  test('reads nothing from a block that only holds others', () => {
    const content = parseBlockContent('callout', {}, {}).getValue();

    expect(readBlockText(content)).toBe('');
  });
});

describe('document nodes', () => {
  const documentNodeTypes = [...new Set([...PAGE_CONTENT_NODE_TYPES, ...Object.keys(PAGE_DOCUMENT_NODES)])];

  test.each(documentNodeTypes)('%s is a block type or a documented structural wrapper', (nodeType) => {
    expect(Object.keys(BLOCK_NODE_DISPOSITION)).toContain(nodeType);
  });

  test('every block disposition points at real block types and every type but the page has a source node', () => {
    const targets = Object.values(BLOCK_NODE_DISPOSITION).flatMap((disposition) =>
      disposition.kind === BLOCK_NODE_DISPOSITION_KIND.block ? disposition.blockTypes : [],
    );

    for (const target of targets) expect(BLOCK_TYPE_VALUES).toContain(target);
    expect(BLOCK_TYPE_VALUES.filter((type) => !targets.includes(type))).toEqual([BLOCK_TYPE.page]);
  });

  test('a header cell is a table_cell block flagged as header', () => {
    expect(BLOCK_NODE_DISPOSITION.table_cell).toEqual({
      blockTypes: [BLOCK_TYPE.tableCell],
      kind: BLOCK_NODE_DISPOSITION_KIND.block,
    });
    expect(BLOCK_NODE_DISPOSITION.table_header).toEqual(BLOCK_NODE_DISPOSITION.table_cell);
  });

  test('every wrapper and inline disposition says where its information goes', () => {
    const described = Object.values(BLOCK_NODE_DISPOSITION).filter(
      (disposition) => disposition.kind !== BLOCK_NODE_DISPOSITION_KIND.block,
    );

    expect(described.length).toBeGreaterThan(0);
    for (const disposition of described) expect(disposition.destination.length).toBeGreaterThan(0);
  });
});
