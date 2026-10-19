import { describe, expect, test } from 'bun:test';
import { pageContentSchema } from '../schemas/page-content.schema.js';
import { BLOCK_DOCUMENT_ERROR_CODE } from './block-document.constants.js';
import {
  blockAt,
  bulletList,
  documentWithIds,
  listItem,
  nestedBlock,
  paragraph,
  text,
  toInput,
  unwrap,
} from './block-document.fixtures.js';
import { documentToBlocks } from './block-document.to-blocks.lib.js';
import { blocksToDocument } from './block-document.to-document.lib.js';
import { BLOCK_TYPE } from './block-type.constants.js';

const build = () => {
  const content = documentWithIds(
    paragraph(text('uno')),
    bulletList(listItem(paragraph(text('a'))), listItem(paragraph(text('b')))),
  );
  return unwrap(documentToBlocks(toInput(content)));
};

describe('blocksToDocument', () => {
  test('writes a document the page schema accepts', () => {
    const { blocks, page } = build();

    const result = unwrap(blocksToDocument(page, blocks));

    expect(pageContentSchema.safeParse(result).success).toBe(true);
  });

  test('re-creates one list wrapper for consecutive items of one kind', () => {
    const { blocks, page } = build();

    const result = unwrap(blocksToDocument(page, blocks));

    expect(result.content.map((node) => node.type)).toEqual(['paragraph', 'bullet_list']);
  });

  test('splits a list where the editor starts another item kind', () => {
    const { blocks, page } = build();
    const asTask = { ...blockAt(blocks, 2), properties: { title: [{ insert: 'b' }] }, type: BLOCK_TYPE.toDo };

    const result = blocksToDocument(page, [blockAt(blocks, 0), blockAt(blocks, 1), asTask]);

    expect(unwrap(result).content.map((node) => node.type)).toEqual(['paragraph', 'bullet_list', 'task_list']);
  });

  test('refuses a page row that is not a page', () => {
    const { blocks } = build();

    const result = blocksToDocument(blockAt(blocks, 0), blocks.slice(1));

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.brokenTree });
  });

  test('refuses a child that is missing', () => {
    const { blocks, page } = build();

    const result = blocksToDocument(page, blocks.slice(1));

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.brokenTree });
  });

  test('refuses a block that no one reaches', () => {
    const { blocks, page } = build();
    const orphan = {
      children: [],
      format: {},
      id: 'orphan',
      parentId: page.id,
      properties: { title: [] },
      type: BLOCK_TYPE.paragraph,
    };

    const result = blocksToDocument(page, [...blocks, orphan]);

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.brokenTree });
  });

  test('refuses a block that two parents claim', () => {
    const { blocks, page } = build();
    const claimed = { ...page, children: [...page.children, blockAt(blocks, 0).id] };

    const result = blocksToDocument(claimed, blocks);

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.brokenTree });
  });

  test('refuses a child whose parent id disagrees', () => {
    const { blocks, page } = build();
    const moved = blocks.map((block, index) => (index === 0 ? { ...block, parentId: 'elsewhere' } : block));

    const result = blocksToDocument(page, moved);

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.brokenTree });
  });

  test('refuses a row the schema of its type does not accept', () => {
    const { blocks, page } = build();
    const broken = blocks.map((block, index) =>
      index === 0 ? { ...block, properties: { title: 'plain text' } } : block,
    );

    const result = blocksToDocument(page, broken);

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.invalidBlock });
  });

  test('refuses a page without content, which a document cannot be', () => {
    const { page } = build();

    const result = blocksToDocument({ ...page, children: [] }, []);

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.invalidDocument });
  });

  test('refuses a toggle title the document summary cannot hold', () => {
    const toggle = documentWithIds({ attrs: { summary: 'plain' }, content: [paragraph()], type: 'toggle' });
    const { blocks, page } = unwrap(documentToBlocks(toInput(toggle)));
    const marked = { ...blockAt(blocks, 0), properties: { title: [{ attributes: { strong: true }, insert: 'bold' }] } };

    const result = blocksToDocument(page, [marked, ...blocks.slice(1)]);

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.unsupportedText });
  });

  test('refuses nested layers that point past the children', () => {
    const content = documentWithIds(nestedBlock(paragraph(text('padre')), [paragraph(text('hijo'))]));
    const { blocks, page } = unwrap(documentToBlocks(toInput(content)));
    const broken = { ...blockAt(blocks, 0), format: { nested: [{ from: 9 }] } };

    const result = blocksToDocument(page, [broken, ...blocks.slice(1)]);

    expect(result.getError()).toMatchObject({ code: BLOCK_DOCUMENT_ERROR_CODE.brokenTree });
  });
});
