import { describe, expect, test } from 'bun:test';
import { type PageContent } from '../schemas/page-content.schema.js';
import { BLOCK_DOCUMENT_ERROR_CODE } from './block-document.constants.js';
import { BlockDocumentError } from './block-document.error.js';
import {
  FIXTURE_PAGE_ID,
  FIXTURE_SPACE_ID,
  ANNOTATIONS,
  blockAt,
  bulletList,
  cell,
  document,
  documentWithIds,
  heading,
  listItem,
  nestedBlock,
  orderedList,
  paragraph,
  row,
  table,
  text,
  toInput,
  unwrap,
} from './block-document.fixtures.js';
import { deriveBlockId } from './block-document.id.lib.js';
import { documentToBlocks } from './block-document.to-blocks.lib.js';
import { BLOCK_TYPE } from './block-type.constants.js';

const convert = (content: PageContent) => unwrap(documentToBlocks(toInput(content)));

describe('documentToBlocks: the page block', () => {
  test('holds the page fields and the top-level blocks in order', () => {
    const content = documentWithIds(paragraph(text('uno')), heading(1, 'dos'));

    const { blocks, page } = documentToBlocks({
      ...toInput(content),
      cover: { assetId: '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e', position: 40 },
      icon: { kind: 'emoji', value: '📄' },
      parentId: 'parent-page',
      propertyValues: { status: 'open', tags: ['a'] },
      title: 'Plan',
    }).getValue();

    expect(page).toEqual({
      children: [blockAt(blocks, 0).id, blockAt(blocks, 1).id],
      format: {
        cover: { assetId: '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e', position: 40 },
        icon: { kind: 'emoji', value: '📄' },
      },
      id: FIXTURE_PAGE_ID,
      parentId: 'parent-page',
      properties: { title: [{ insert: 'Plan' }], values: { status: 'open', tags: ['a'] } },
      spaceId: FIXTURE_SPACE_ID,
      type: BLOCK_TYPE.page,
    });
  });

  test('has no values and no format when the page has none', () => {
    const { page } = convert(document(paragraph()));

    expect(page.properties).toEqual({ title: [{ insert: 'Roadmap' }] });
    expect(page.format).toEqual({});
  });

  test('an empty title is an empty text', () => {
    const { page } = unwrap(documentToBlocks({ ...toInput(document(paragraph())), title: '' }));

    expect(page.properties).toEqual({ title: [] });
  });

  test('refuses a title longer than a page title can be', () => {
    const result = documentToBlocks({ ...toInput(document(paragraph())), title: 'x'.repeat(201) });

    expect(result.isFail()).toBe(true);
  });
});

describe('documentToBlocks: structure', () => {
  test('list wrappers dissolve into items that are siblings', () => {
    const { blocks, page } = convert(
      documentWithIds(bulletList(listItem(paragraph(text('a'))), listItem(paragraph(text('b'))))),
    );

    expect(blocks.map((block) => block.type)).toEqual([BLOCK_TYPE.bulletedListItem, BLOCK_TYPE.bulletedListItem]);
    expect(blocks.map((block) => block.parentId)).toEqual([page.id, page.id]);
    expect(page.children).toEqual(blocks.map((block) => block.id));
  });

  test('the first paragraph of an item is its title and the rest are its children', () => {
    const { blocks } = convert(
      documentWithIds(bulletList(listItem(paragraph(text('titulo')), paragraph(text('hijo'))))),
    );
    const item = blockAt(blocks, 0);
    const child = blockAt(blocks, 1);

    expect(item.properties).toEqual({ title: [{ insert: 'titulo' }] });
    expect(item.children).toEqual([child.id]);
    expect(child.parentId).toBe(item.id);
    expect(child.type).toBe(BLOCK_TYPE.paragraph);
  });

  test('an ordered list order becomes the start of its first item only', () => {
    const { blocks } = convert(
      documentWithIds(orderedList(7, listItem(paragraph(text('a'))), listItem(paragraph(text('b'))))),
    );

    expect(blocks.map((block) => ('start' in block.format ? block.format.start : undefined))).toEqual([7, undefined]);
  });

  test('tables become table, row and cell blocks and a header cell is marked', () => {
    const { blocks } = convert(
      documentWithIds(table(row(cell('table_header', { colspan: 2, colwidth: [100, 50] }, paragraph(text('h')))))),
    );

    expect(blocks.map((block) => block.type)).toEqual([
      BLOCK_TYPE.table,
      BLOCK_TYPE.tableRow,
      BLOCK_TYPE.tableCell,
      BLOCK_TYPE.paragraph,
    ]);
    expect(blocks[2]?.properties).toEqual({ colspan: 2, isHeader: true });
    expect(blocks[2]?.format).toMatchObject({ colwidth: [100, 50] });
  });

  test('a toggle summary becomes its title', () => {
    const { blocks } = convert(
      documentWithIds({ attrs: { open: true, summary: 'Resumen' }, content: [paragraph()], type: 'toggle' }),
    );

    expect(blocks[0]?.properties).toEqual({ title: [{ insert: 'Resumen' }] });
    expect(blocks[0]?.format).toMatchObject({ open: true });
  });

  test('a nested block dissolves: the block gets the children', () => {
    const { blocks } = convert(documentWithIds(nestedBlock(paragraph(text('padre')), [paragraph(text('hijo'))])));
    const parent = blockAt(blocks, 0);
    const child = blockAt(blocks, 1);

    expect(blocks).toHaveLength(2);
    expect(parent.children).toEqual([child.id]);
    expect(child.parentId).toBe(parent.id);
  });

  test('colors go to the format of the block', () => {
    const { blocks } = convert(documentWithIds({ attrs: { ...ANNOTATIONS }, content: [text('x')], type: 'paragraph' }));

    expect(blockAt(blocks, 0).format).toMatchObject(ANNOTATIONS);
  });

  test('the comments an older document kept in a node are left out, because discussions hold them now', () => {
    const legacy = {
      attrs: { comments: [{ author: 'Ana', body: 'Revisar', createdAt: '2026-10-19T10:00:00Z', id: 'c-1' }] },
      content: [text('x')],
      type: 'paragraph',
    };

    const { blocks } = convert(documentWithIds(legacy));

    expect(blockAt(blocks, 0).format).toEqual({});
  });

  test('an unknown node becomes an unsupported block holding the raw node', () => {
    const unknown = { attrs: { id: 'future-1' }, content: ['raw'], type: 'sparkline' };

    const { blocks } = convert(documentWithIds(unknown));

    expect(blocks[0]?.type).toBe(BLOCK_TYPE.unsupported);
    expect(blocks[0]?.id).toBe('future-1');
    expect(blocks[0]?.properties).toEqual({ node: unknown });
  });
});

describe('documentToBlocks: ids', () => {
  test('keeps the id a node already has', () => {
    const { blocks } = convert(document({ attrs: { id: 'my-id' }, content: [text('x')], type: 'paragraph' }));

    expect(blocks[0]?.id).toBe('my-id');
  });

  test('derives from the page and the node path when a node has none', () => {
    const { blocks } = convert(document(paragraph(text('a')), bulletList(listItem(paragraph(text('b'))))));

    expect(blocks.map((block) => block.id)).toEqual([
      deriveBlockId(FIXTURE_PAGE_ID, [0]),
      deriveBlockId(FIXTURE_PAGE_ID, [1, 0]),
    ]);
  });

  test('gives the same ids when run twice on the same input', () => {
    const content = document(paragraph(text('a')), table(row(cell('table_cell', {}, paragraph()))), paragraph());

    const first = convert(content);
    const second = convert(content);

    expect(second).toEqual(first);
  });

  test('keeps every id unique', () => {
    const content = document(
      paragraph(),
      bulletList(listItem(paragraph(), bulletList(listItem(paragraph())))),
      nestedBlock(paragraph(), [paragraph(), paragraph()]),
    );

    const { blocks, page } = convert(content);
    const ids = [page.id, ...blocks.map((block) => block.id)];

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('reports two nodes sharing an id', () => {
    const content = document(
      { attrs: { id: 'same' }, content: [], type: 'paragraph' },
      { attrs: { id: 'same' }, content: [], type: 'paragraph' },
    );

    const result = documentToBlocks(toInput(content));

    expect(result.isFail()).toBe(true);
    expect(result.getError()).toBeInstanceOf(BlockDocumentError);
    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.duplicateBlockId });
  });

  test('reports a node whose id is the id of the page', () => {
    const content = document({ attrs: { id: FIXTURE_PAGE_ID }, content: [], type: 'paragraph' });

    expect(documentToBlocks(toInput(content)).getError()).toMatchObject({
      code: BLOCK_DOCUMENT_ERROR_CODE.duplicateBlockId,
    });
  });

  test('reports a derived id that collides with an id already used', () => {
    const colliding = deriveBlockId(FIXTURE_PAGE_ID, [1]);
    const content = document(
      { attrs: { id: colliding }, content: [], type: 'paragraph' },
      { content: [], type: 'paragraph' },
    );

    expect(documentToBlocks(toInput(content)).getError()).toMatchObject({
      code: BLOCK_DOCUMENT_ERROR_CODE.duplicateBlockId,
    });
  });
});

describe('documentToBlocks: what it refuses', () => {
  test('a toggle summary that looks like an HTML tag, which block text cannot hold', () => {
    const content = document({ attrs: { summary: 'a <b> c' }, content: [paragraph()], type: 'toggle' });

    const result = documentToBlocks(toInput(content));

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.invalidBlock });
  });
});
