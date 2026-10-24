import { describe, expect, it } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '@neuma/shared';
import {
  readButtonRowTitle,
  readNewRowTitle,
  readTemplateWordFor,
  toggleTemplateVariable,
} from '@/modules/pages/templates/lib/pages.templates.lib';
import type { PageTemplateListing } from '@/modules/pages/templates/types/pages.templates.types';

const withDefault: PageTemplateListing = { defaultTemplateId: 'template-1', templates: [] };
const withoutDefault: PageTemplateListing = { defaultTemplateId: null, templates: [] };

describe('the title a new row starts with', () => {
  it('leaves the title to the template that applies', () => {
    expect(readNewRowTitle(withDefault, undefined, 'Untitled')).toBe('');
    expect(readNewRowTitle(withoutDefault, 'template-2', 'Untitled')).toBe('');
  });

  it('names a blank row, because a row without a title is refused', () => {
    expect(readNewRowTitle(withDefault, null, 'Untitled')).toBe('Untitled');
    expect(readNewRowTitle(withoutDefault, undefined, 'Untitled')).toBe('Untitled');
  });
});

describe('the title of a row a button makes', () => {
  it('keeps what the button wrote', () => {
    expect(readButtonRowTitle('Incident', null, withoutDefault, 'Untitled')).toBe('Incident');
  });

  it('lets a template name the row when the button wrote nothing', () => {
    expect(readButtonRowTitle('', 'template-1', null, 'Untitled')).toBe('');
    expect(readButtonRowTitle('', null, withDefault, 'Untitled')).toBe('');
  });

  it('is untitled when nothing writes the title', () => {
    expect(readButtonRowTitle('', null, withoutDefault, 'Untitled')).toBe('Untitled');
    expect(readButtonRowTitle('', null, null, 'Untitled')).toBe('Untitled');
  });
});

describe('the words a template can leave in a column', () => {
  it('offers today for a date and the creator for a person, and nothing else', () => {
    expect(readTemplateWordFor(PAGE_PROPERTY_TYPE.DATE)).toBe('@today');
    expect(readTemplateWordFor(PAGE_PROPERTY_TYPE.PERSON)).toBe('@me');
    expect(readTemplateWordFor(PAGE_PROPERTY_TYPE.NUMBER)).toBeNull();
  });

  it('sets one column without touching the others, and takes it away', () => {
    const set = toggleTemplateVariable({ owner: '@me' }, 'due', '@today');
    const removed = toggleTemplateVariable(set, 'owner', null);

    expect(set).toEqual({ due: '@today', owner: '@me' });
    expect(removed).toEqual({ due: '@today' });
  });
});
