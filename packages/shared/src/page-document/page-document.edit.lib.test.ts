import { describe, expect, test } from 'bun:test';
import { type PageContent, pageContentSchema } from '../schemas/page-content.schema.js';
import {
  findPageBlock,
  insertPageBlocks,
  movePageBlocks,
  removePageBlocks,
  replacePageBlock,
} from './page-document.edit.lib.js';

const paragraph = (id: string, text: string) => ({
  attrs: { id },
  content: [{ text, type: 'text' }],
  type: 'paragraph',
});
const item = (id: string, text: string) => ({
  attrs: { id },
  content: [paragraph(`${id}-line`, text)],
  type: 'list_item',
});
const bulletList = (id: string, ...items: readonly unknown[]) => ({
  attrs: { id },
  content: items,
  type: 'bullet_list',
});
const page = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const ids = (content: PageContent): readonly string[] =>
  content.content.map((node) => (node as { attrs: { id: string } }).attrs.id);

const intro = paragraph('intro', 'Intro');
const outro = paragraph('outro', 'Cierre');
const list = bulletList('list', item('one', 'Uno'), item('two', 'Dos'));

describe('findPageBlock', () => {
  test('finds a block at the top of the page', () => {
    expect(findPageBlock([intro, list], 'intro')).toEqual(intro);
  });

  test('finds a block however deep it sits', () => {
    expect(findPageBlock([intro, list], 'two')).toEqual(item('two', 'Dos'));
    expect(findPageBlock([intro, list], 'two-line')).toEqual(paragraph('two-line', 'Dos'));
  });

  test('finds nothing when no block has that id', () => {
    expect(findPageBlock([intro, list], 'gone')).toBeNull();
  });
});

/** Dos bloques con el mismo id no se distinguen: el que llega no puede traer uno que la página ya usa. */
describe('the ids a page already uses', () => {
  test('refuses to insert a block with an id another block already has', () => {
    expect(insertPageBlocks(page(intro), { at: 'end' }, [paragraph('intro', 'Otra')]).getError()).toContain(
      'already has a block intro',
    );
  });

  test('refuses a replacement that brings inside it the id of another block', () => {
    const replacement = bulletList('x', item('intro', 'Repetido'));

    expect(replacePageBlock(page(intro, list), 'list', replacement).getError()).toContain('already has a block intro');
  });

  test('lets a replacement keep the ids of what it replaces', () => {
    expect(replacePageBlock(page(intro, list), 'list', list).isOk()).toBe(true);
  });
});

describe('insertPageBlocks', () => {
  test('puts blocks after the one named, in the order given', () => {
    const edited = insertPageBlocks(page(intro, outro), { after: 'intro' }, [paragraph('a', 'A'), paragraph('b', 'B')]);

    expect(ids(edited.getValue())).toEqual(['intro', 'a', 'b', 'outro']);
  });

  test('puts blocks at the start or the end of the page', () => {
    expect(ids(insertPageBlocks(page(intro), { at: 'start' }, [paragraph('a', 'A')]).getValue())).toEqual([
      'a',
      'intro',
    ]);
    expect(ids(insertPageBlocks(page(intro), { at: 'end' }, [paragraph('a', 'A')]).getValue())).toEqual(['intro', 'a']);
  });

  /** Quien agrega ítems a una lista escribe una lista; lo que cae en ella son sus ítems, no una lista dentro de otra. */
  test('adds the items of a list to the list it lands in', () => {
    const edited = insertPageBlocks(page(list), { after: 'one' }, [bulletList('new', item('mid', 'Medio'))]);

    expect(JSON.stringify(edited.getValue().content)).toBe(
      JSON.stringify([bulletList('list', item('one', 'Uno'), item('mid', 'Medio'), item('two', 'Dos'))]),
    );
  });

  test('refuses a block that does not fit among the items of a list, saying where it would', () => {
    expect(insertPageBlocks(page(list), { after: 'one' }, [paragraph('a', 'A')]).getError()).toContain('list');
  });

  test('puts blocks under an item, after its own line', () => {
    const edited = insertPageBlocks(page(list), { at: 'start', inside: 'one' }, [
      bulletList('sub', item('nested', 'Sub')),
    ]);

    expect(edited.getValue().content[0]).toMatchObject({
      content: [{ content: [{ attrs: { id: 'one-line' } }, { attrs: { id: 'sub' }, type: 'bullet_list' }] }, {}],
    });
  });

  test('says which block it could not find', () => {
    expect(insertPageBlocks(page(intro), { after: 'missing' }, [paragraph('a', 'A')]).getError()).toContain('missing');
  });
});

describe('replacePageBlock', () => {
  test('replaces a block and keeps its id, so its links keep working', () => {
    const edited = replacePageBlock(page(intro, outro), 'intro', {
      content: [{ text: 'Nuevo', type: 'text' }],
      type: 'heading',
      attrs: { level: 2 },
    });

    expect(edited.getValue().content[0]).toEqual({
      attrs: { id: 'intro', level: 2 },
      content: [{ text: 'Nuevo', type: 'text' }],
      type: 'heading',
    });
  });

  test('replaces an item with the single item of the list written for it', () => {
    const edited = replacePageBlock(page(list), 'two', bulletList('x', item('ignored', 'Otro')));

    expect(edited.getValue().content[0]).toMatchObject({
      content: [{ attrs: { id: 'one' } }, { attrs: { id: 'two' } }],
    });
    expect(JSON.stringify(edited.getValue())).toContain('Otro');
  });
});

describe('removePageBlocks', () => {
  test('removes the blocks named and nothing else', () => {
    expect(ids(removePageBlocks(page(intro, list, outro), ['list']).getValue())).toEqual(['intro', 'outro']);
  });

  test('takes away a list left with no items', () => {
    expect(ids(removePageBlocks(page(intro, list), ['one', 'two']).getValue())).toEqual(['intro']);
  });

  test('leaves an empty page with one empty paragraph, as the editor does', () => {
    expect(removePageBlocks(page(intro), ['intro']).getValue().content).toEqual([{ content: [], type: 'paragraph' }]);
  });

  test('refuses, without removing anything, when one of the blocks is not there', () => {
    expect(removePageBlocks(page(intro, outro), ['intro', 'missing']).getError()).toContain('missing');
  });
});

describe('movePageBlocks', () => {
  test('moves blocks after another one, keeping their ids', () => {
    expect(ids(movePageBlocks(page(intro, list, outro), ['intro'], { after: 'outro' }).getValue())).toEqual([
      'list',
      'outro',
      'intro',
    ]);
  });

  test('refuses to move a block into itself', () => {
    expect(movePageBlocks(page(list), ['list'], { after: 'one' }).getError()).toContain('inside');
  });

  /** Nombrar un bloque y uno de los que lleva dentro no lo copia: el de dentro viaja una vez, con su padre. */
  test('moves a block named together with one inside it only once', () => {
    const moved = movePageBlocks(page(intro, list, outro), ['list', 'two'], { after: 'outro' }).getValue();

    expect(ids(moved)).toEqual(['intro', 'outro', 'list']);
    expect(JSON.stringify(moved).match(/"id":"two"/g)).toHaveLength(1);
  });
});
