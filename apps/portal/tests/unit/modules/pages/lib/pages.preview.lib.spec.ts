import { describe, expect, it } from 'bun:test';
import type { PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import {
  isWithinThePagePreviewCard,
  readInternalPageTarget,
  readPagePreviewFragment,
  readPagePreviewIcon,
  readPagePreviewLink,
  readPagePreviewProperties,
  readPagePreviewSpot,
  readPagePreviewTitle,
} from '@/modules/pages/links/lib/pages.preview.lib';
import type { PageContent } from '@/modules/pages/types/pages.types';
import { asPropertyOptions } from './pages.options.fixture';

describe('readInternalPageTarget', () => {
  it('reads the space and the page a link to this app names', () => {
    expect(readInternalPageTarget('/spaces/space-1/pages/page-1')).toEqual({ pageId: 'page-1', spaceId: 'space-1' });
  });

  it('refuses a link to a page that is not written yet', () => {
    expect(readInternalPageTarget('/spaces/space-1/pages/new')).toBeNull();
  });

  it('refuses anything that does not name a single page of this app', () => {
    expect(readInternalPageTarget('/spaces/space-1')).toBeNull();
    expect(readInternalPageTarget('https://example.com')).toBeNull();
    expect(readInternalPageTarget('/spaces/space-1/pages/page-1/extra')).toBeNull();
  });
});

describe('readPagePreviewIcon and readPagePreviewTitle', () => {
  it('sets apart the mark a title wears at its own front', () => {
    expect(readPagePreviewIcon('🚀 Launch plan')).toBe('🚀');
    expect(readPagePreviewTitle('🚀 Launch plan')).toBe('Launch plan');
  });

  it('invents no mark for a title that wears none', () => {
    expect(readPagePreviewIcon('Launch plan')).toBeNull();
    expect(readPagePreviewTitle('Launch plan')).toBe('Launch plan');
  });

  it('leaves nothing behind when the title is only its own mark', () => {
    expect(readPagePreviewTitle('🚀')).toBe('');
  });
});

describe('readPagePreviewFragment', () => {
  const aDoc = (content: PageContent['content']): PageContent => ({ content, schemaVersion: 1, type: 'doc' });

  it('reads the writing across paragraphs, in order', () => {
    const content = aDoc([
      { content: [{ text: 'First line.', type: 'text' }], type: 'paragraph' },
      { content: [{ text: 'Second line.', type: 'text' }], type: 'paragraph' },
    ]);

    expect(readPagePreviewFragment(content)).toBe('First line. Second line.');
  });

  it('reads nothing out of a page with nothing written', () => {
    expect(readPagePreviewFragment(aDoc([{ content: [], type: 'paragraph' }]))).toBe('');
  });

  it('keeps a fragment short even when the page is long', () => {
    const content = aDoc([{ content: [{ text: 'a'.repeat(500), type: 'text' }], type: 'paragraph' }]);

    expect(readPagePreviewFragment(content).length).toBeLessThanOrEqual(240);
  });
});

describe('readPagePreviewProperties', () => {
  const titleProperty: PageSchemaProperty = {
    key: 'title',
    label: 'Title',
    options: null,
    required: true,
    type: 'TITLE',
  };
  const statusProperty: PageSchemaProperty = {
    key: 'status',
    label: 'Status',
    options: asPropertyOptions('todo', 'done'),
    required: true,
    type: 'SELECT',
  };
  const teamProperty: PageSchemaProperty = {
    key: 'team',
    label: 'Team',
    options: asPropertyOptions('design', 'engineering'),
    required: false,
    type: 'MULTI_SELECT',
  };
  const schema: PageSchema = {
    pageId: 'collection-1',
    properties: [titleProperty, statusProperty, teamProperty],
    spaceId: 'space-1',
    views: [],
  };

  it('formats the properties a page carries, leaving its own title property out', () => {
    expect(readPagePreviewProperties(schema, { status: 'done', team: [] })).toEqual([
      { key: 'status', label: 'Status', value: 'Done' },
    ]);
  });

  it('carries nothing when the page has no schema of its own', () => {
    expect(readPagePreviewProperties(null, { status: 'done' })).toEqual([]);
  });

  it('carries nothing when the page has no values of its own', () => {
    expect(readPagePreviewProperties(schema, null)).toEqual([]);
  });
});

describe('readPagePreviewLink', () => {
  it('names the page a link inside the surface points at, without measuring anything', () => {
    const container = document.createElement('div');
    const anchor = document.createElement('a');
    anchor.href = '/spaces/space-1/pages/page-1';
    container.append(anchor);

    const link = readPagePreviewLink(container, anchor);

    expect(link?.anchor).toBe(anchor);
    expect(link?.target).toEqual({ pageId: 'page-1', spaceId: 'space-1' });
  });

  it('answers nothing for a link outside the surface', () => {
    const container = document.createElement('div');
    const outsideAnchor = document.createElement('a');
    outsideAnchor.href = '/spaces/space-1/pages/page-1';

    expect(readPagePreviewLink(container, outsideAnchor)).toBeNull();
  });

  it('answers nothing for a link that does not name a page of this app', () => {
    const container = document.createElement('div');
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com';
    container.append(anchor);

    expect(readPagePreviewLink(container, anchor)).toBeNull();
  });

  it('answers nothing when the pointer is not on a link at all', () => {
    const container = document.createElement('div');
    const paragraph = document.createElement('p');
    container.append(paragraph);

    expect(readPagePreviewLink(container, paragraph)).toBeNull();
  });
});

describe('readPagePreviewSpot', () => {
  it('begins right under the link, carrying the gap inside its own box', () => {
    const anchor = document.createElement('a');
    anchor.getBoundingClientRect = () => ({
      bottom: 220,
      height: 20,
      left: 100,
      right: 200,
      top: 200,
      width: 100,
      x: 100,
      y: 200,
      toJSON: () => ({}),
    });

    const spot = readPagePreviewSpot(anchor, { left: 50, top: 150, width: 800 });

    expect(spot.left).toBe(100 - 50);
    expect(spot.top).toBe(220 - 150);
  });
});

describe('isWithinThePagePreviewCard', () => {
  it('recognises anything drawn inside the preview card', () => {
    const card = document.createElement('div');
    card.setAttribute('data-page-preview-card', 'true');
    const inner = document.createElement('p');
    card.append(inner);

    expect(isWithinThePagePreviewCard(inner)).toBe(true);
  });

  it('refuses anything drawn outside it', () => {
    expect(isWithinThePagePreviewCard(document.createElement('span'))).toBe(false);
    expect(isWithinThePagePreviewCard(null)).toBe(false);
  });

  it('does not read the link inside the preview card as one more link to preview', () => {
    const container = document.createElement('div');
    const card = document.createElement('div');
    card.setAttribute('data-page-preview-card', 'true');
    const anchor = document.createElement('a');
    anchor.href = '/spaces/space-1/pages/page-1';
    card.append(anchor);
    container.append(card);

    expect(readPagePreviewLink(container, anchor)).toBeNull();
  });
});
