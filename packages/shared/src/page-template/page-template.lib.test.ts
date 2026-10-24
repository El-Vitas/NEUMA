import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { PAGE_TEMPLATE_VARIABLE } from './page-template.constants.js';
import {
  findInvalidPageTemplateVariable,
  isPageContentBlank,
  isPageTemplate,
  readPageDefaultTemplateId,
  readPageTemplate,
  resolvePageTemplateVariables,
} from './page-template.lib.js';

const properties = [
  { key: 'title', type: PAGE_PROPERTY_TYPE.TITLE },
  { key: 'due', type: PAGE_PROPERTY_TYPE.DATE },
  { key: 'owners', type: PAGE_PROPERTY_TYPE.PERSON },
  { key: 'notes', type: PAGE_PROPERTY_TYPE.RICH_TEXT },
];

const viewer = { now: Date.parse('2026-10-21T03:30:00Z'), timeZone: 'America/Santiago', viewerId: 'user-1' };

describe('reading the template marker of a page', () => {
  test('a page with the marker is a template and keeps its variables', () => {
    const stored = { template: { variables: { due: '@today' } }, title: [] };

    expect(isPageTemplate(stored)).toBe(true);
    expect(readPageTemplate(stored)).toEqual({ variables: { due: '@today' } });
  });

  test('a page without it, or with something else in its place, is not a template', () => {
    expect(isPageTemplate({ title: [] })).toBe(false);
    expect(isPageTemplate({ template: 'yes' })).toBe(false);
    expect(isPageTemplate(null)).toBe(false);
    expect(readPageTemplate({})).toBeNull();
  });

  test('a variable this version does not know is left out', () => {
    expect(readPageTemplate({ template: { variables: { due: '@tomorrow', owners: '@me' } } })).toEqual({
      variables: { owners: '@me' },
    });
  });

  test('the default template of a collection is read only when it is a text', () => {
    expect(readPageDefaultTemplateId({ defaultTemplateId: 'abc' })).toBe('abc');
    expect(readPageDefaultTemplateId({ defaultTemplateId: 3 })).toBeNull();
    expect(readPageDefaultTemplateId({})).toBeNull();
  });
});

describe('telling a blank document from one with content', () => {
  const doc = (content: unknown[]) => ({ content, schemaVersion: 1, type: 'doc' }) as never;

  test('a document of empty paragraphs is blank', () => {
    expect(isPageContentBlank(doc([]))).toBe(true);
    expect(isPageContentBlank(doc([{ content: [], type: 'paragraph' }]))).toBe(true);
  });

  test('a document with text or any other block is not blank', () => {
    expect(isPageContentBlank(doc([{ content: [{ text: 'hi', type: 'text' }], type: 'paragraph' }]))).toBe(false);
    expect(isPageContentBlank(doc([{ type: 'divider' }]))).toBe(false);
  });
});

describe('checking the variables a template declares', () => {
  test('today fits a date and me fits a person', () => {
    expect(findInvalidPageTemplateVariable({ due: '@today', owners: '@me' }, properties)).toBeNull();
  });

  test('today on a person, me on a date, and an unknown column are refused with a message', () => {
    expect(findInvalidPageTemplateVariable({ owners: '@today' }, properties)).toContain('owners');
    expect(findInvalidPageTemplateVariable({ due: '@me' }, properties)).toContain('due');
    expect(findInvalidPageTemplateVariable({ missing: '@me' }, properties)).toContain('missing');
  });
});

describe('resolving the variables for whoever creates the row', () => {
  test('today is the day in the zone of the creator, and me is the creator', () => {
    const values = resolvePageTemplateVariables(
      { due: PAGE_TEMPLATE_VARIABLE.TODAY, owners: PAGE_TEMPLATE_VARIABLE.ME },
      properties,
      viewer,
    );

    expect(values).toEqual({ due: { start: '2026-10-21' }, owners: ['user-1'] });
  });

  test('the same instant is another day in another zone', () => {
    const values = resolvePageTemplateVariables({ due: '@today' }, properties, { ...viewer, timeZone: 'Asia/Tokyo' });

    expect(values).toEqual({ due: { start: '2026-10-21' } });
    const west = resolvePageTemplateVariables({ due: '@today' }, properties, {
      ...viewer,
      now: Date.parse('2026-10-21T01:00:00Z'),
      timeZone: 'America/Los_Angeles',
    });
    expect(west).toEqual({ due: { start: '2026-10-20' } });
  });

  test('a variable on a column that is not there any more is dropped', () => {
    expect(resolvePageTemplateVariables({ gone: '@me' }, properties, viewer)).toEqual({});
  });
});
