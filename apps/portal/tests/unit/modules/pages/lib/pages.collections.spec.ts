import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { PAGE_PROPERTY_TYPE, PAGE_VIEW_TYPE } from '@company-brain/shared';
import { NodeSelection } from 'prosemirror-state';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import {
  createPageShapeCommand,
  readPageShapeTarget,
} from '@/modules/pages/editor/menus/lib/pages.editor.page-shape.lib';
import { describeANewCollection, readTheViewToShow } from '@/modules/pages/lib/pages.collections.lib';

const wording = { firstProperty: 'Notas', firstView: 'Tabla', titleProperty: 'Nombre' };

const pageWithACollection: PageContent = {
  content: [{ attrs: { pageId: 'page-2', spaceId: 'space-1' }, type: 'collection' }],
  schemaVersion: 1,
  type: 'doc',
};

const stateOf = (content: PageContent) =>
  createPageEditorState(content, 'Select', 'Insert', 'Comments', 'Write here', 'Fold');

describe('describeANewCollection', () => {
  it('starts a collection with the one name every row must have, and one table', () => {
    const shape = describeANewCollection(wording);

    expect(shape.properties.filter((property) => property.type === PAGE_PROPERTY_TYPE.TITLE)).toHaveLength(1);
    expect(shape.properties.map((property) => property.label)).toEqual(['Nombre', 'Notas']);
    expect(shape.views).toEqual([{ configuration: {}, isDefault: true, name: 'Tabla', type: PAGE_VIEW_TYPE.TABLE }]);
  });
});

describe('readTheViewToShow', () => {
  it('shows the view the collection leads with, and the first one when none leads', () => {
    expect(
      readTheViewToShow([
        { isDefault: false, name: 'Tabla' },
        { isDefault: true, name: 'Tablero' },
      ]),
    ).toBe('Tablero');
    expect(readTheViewToShow([{ isDefault: false, name: 'Tabla' }])).toBe('Tabla');
    expect(readTheViewToShow([])).toBeNull();
  });
});

describe('createPageShapeCommand', () => {
  it('turns the collection kept in sight into the line that leads to it, and back', () => {
    const state = stateOf(pageWithACollection);
    const selected = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)));
    const target = readPageShapeTarget(selected);

    expect(target?.chosen).toBe('collection');
    expect(target?.pageId).toBe('page-2');

    let kept: PageContent | null = null;
    if (target !== null) {
      createPageShapeCommand(
        pageEditorSchema,
        'link',
        target,
        null,
      )(selected, (transaction) => {
        kept = serializePageEditorState(selected.apply(transaction));
      });
    }

    expect(JSON.stringify(kept)).toContain('"type":"subpage"');
    expect(JSON.stringify(kept)).toContain('"pageId":"page-2"');
  });
});
