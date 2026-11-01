import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import type { PageContentBlock } from '@/modules/pages/domain/page.block.domain.types';
import { buildPageDocument, buildPageTree } from '@/modules/pages/domain/page.document.domain';

const paragraph = (id: string, text: string) => ({
  attrs: { id },
  content: [{ text, type: 'text' as const }],
  type: 'paragraph' as const,
});

const document: PageContent = {
  content: [paragraph('block-a', 'Uno'), paragraph('block-b', 'Dos')],
  schemaVersion: 1,
  type: 'doc',
};

const treeOf = (content: PageContent) => {
  const tree = buildPageTree({
    content,
    cover: null,
    icon: null,
    pageId: 'page-1',
    parentId: null,
    propertyValues: null,
    spaceId: 'space-1',
    title: 'Plan',
  });
  if (tree.isFail()) throw tree.getError();
  return tree.getValue();
};

const firstDraftOf = (tree: ReturnType<typeof treeOf>) => {
  const [draft] = tree.blocks;
  if (draft === undefined) throw new Error('The tree has no block');
  return draft;
};

const toContentBlock = (draft: ReturnType<typeof treeOf>['blocks'][number]): PageContentBlock => ({
  children: draft.children,
  editedAt: new Date('2026-10-20T00:00:00.000Z'),
  editedById: 'user-1',
  format: draft.format,
  id: draft.id,
  parentId: draft.parentId,
  permissions: null,
  properties: draft.properties,
  type: draft.type,
});

describe('the document of a page', () => {
  it('gives back the document the blocks were made from', () => {
    const tree = treeOf(document);

    const rebuilt = buildPageDocument(tree.page, tree.blocks.map(toContentBlock));

    expect(rebuilt.getValue()).toEqual(document);
  });

  it('ignores the pages a page holds, which are listed after its own blocks', () => {
    const tree = treeOf(document);

    const rebuilt = buildPageDocument(
      { ...tree.page, children: [...tree.page.children, 'child-page'] },
      tree.blocks.map(toContentBlock),
    );

    expect(rebuilt.getValue()).toEqual(document);
  });

  it('leaves out a live block its parent does not list instead of failing the whole page', () => {
    const tree = treeOf(document);
    const orphan: PageContentBlock = { ...toContentBlock(firstDraftOf(tree)), id: 'orphan' };

    const rebuilt = buildPageDocument(tree.page, [...tree.blocks.map(toContentBlock), orphan]);

    expect(rebuilt.getValue()).toEqual(document);
  });

  it('refuses a block this version cannot read, naming the problem', () => {
    const tree = treeOf(document);
    const broken: PageContentBlock = { ...toContentBlock(firstDraftOf(tree)), properties: { title: 7 } };

    const rebuilt = buildPageDocument(tree.page, [broken, ...tree.blocks.slice(1).map(toContentBlock)]);

    expect(rebuilt.getError().code).toBe('PAGE_CONTENT_INVALID');
  });
});

describe('the blocks of a document', () => {
  it('gives the page a title, a parent and the ids its blocks had', () => {
    const tree = treeOf(document);

    expect(tree.page).toMatchObject({ id: 'page-1', parentId: null, type: 'page' });
    expect(tree.page.children).toEqual(['block-a', 'block-b']);
    expect(tree.blocks.map((draft) => draft.id)).toEqual(['block-a', 'block-b']);
  });

  it('names the problem when the document repeats an id', () => {
    const repeated = buildPageTree({
      content: { ...document, content: [paragraph('same', 'Uno'), paragraph('same', 'Dos')] },
      cover: null,
      icon: null,
      pageId: 'page-1',
      parentId: null,
      propertyValues: null,
      spaceId: 'space-1',
      title: 'Plan',
    });

    expect(repeated.getError().code).toBe('PAGE_CONTENT_INVALID');
  });
});
