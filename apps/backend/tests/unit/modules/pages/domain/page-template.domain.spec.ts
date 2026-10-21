import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG, type PageContent } from '@neuma/shared';
import { applyRowTemplate } from '@/modules/pages/domain/page-template.domain';
import type { PageRowStart, PageRowTemplate } from '@/modules/pages/domain/page-template.domain.types';

const column = (key: string, type: DatabasePropertyType) => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key,
  label: key,
  options: null,
  required: false,
  type,
});

const columns = [
  column('title', DatabasePropertyType.TITLE),
  column('points', DatabasePropertyType.NUMBER),
  column('due', DatabasePropertyType.DATE),
  column('owner', DatabasePropertyType.PERSON),
];

const blank: PageContent = { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' };
const written: PageContent = {
  content: [{ content: [{ text: 'Mine', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};
const templateContent: PageContent = {
  content: [{ content: [{ text: 'From the template', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

const template: PageRowTemplate = {
  content: templateContent,
  propertyValues: { gone: 'a column that was removed', points: 3 },
  title: 'Weekly',
  variables: { due: '@today', owner: '@me' },
};

const viewer = { now: Date.parse('2026-10-21T15:00:00Z'), timeZone: 'UTC', viewerId: 'user-1' };

const start = (overrides: Partial<PageRowStart> = {}): PageRowStart => ({
  content: blank,
  propertyValues: null,
  title: '',
  ...overrides,
});

describe('applying a template to a new row', () => {
  it('copies the content, the known values and the variables of the template', () => {
    const applied = applyRowTemplate(start(), template, columns, viewer).getValue();

    expect(applied.content).toEqual(templateContent);
    expect(applied.propertyValues).toEqual({ due: { start: '2026-10-21' }, owner: ['user-1'], points: 3 });
    expect(applied.title).toBe('Weekly');
  });

  it('lets what the row brings win: title, content and values', () => {
    const applied = applyRowTemplate(
      start({ content: written, propertyValues: { points: 8 }, title: 'Mine' }),
      template,
      columns,
      viewer,
    ).getValue();

    expect(applied.content).toEqual(written);
    expect(applied.propertyValues).toMatchObject({ owner: ['user-1'], points: 8 });
    expect(applied.title).toBe('Mine');
  });

  it('fails when the content of the template is not a document', () => {
    const broken = { ...template, content: { nope: true } };

    expect(applyRowTemplate(start(), broken, columns, viewer).isFail()).toBe(true);
  });
});
