import { describe, expect, test } from 'bun:test';
import {
  PAGE_PROPERTY_TYPE,
  PAGE_PROPERTY_TYPE_VALUES,
  PAGE_VIEW_OUTCOME_KIND,
  PAGE_VIEW_TYPE,
  PAGE_VIEW_TYPE_VALUES,
} from './page-schema.types.js';

describe('page schema contracts', () => {
  test('exposes the canonical property type values', () => {
    expect(PAGE_PROPERTY_TYPE_VALUES).toEqual([
      PAGE_PROPERTY_TYPE.TITLE,
      PAGE_PROPERTY_TYPE.RICH_TEXT,
      PAGE_PROPERTY_TYPE.SELECT,
      PAGE_PROPERTY_TYPE.MULTI_SELECT,
      PAGE_PROPERTY_TYPE.PERSON,
      PAGE_PROPERTY_TYPE.DATE,
      PAGE_PROPERTY_TYPE.CHECKBOX,
      PAGE_PROPERTY_TYPE.NUMBER,
      PAGE_PROPERTY_TYPE.STATUS,
      PAGE_PROPERTY_TYPE.RELATION,
      PAGE_PROPERTY_TYPE.URL,
      PAGE_PROPERTY_TYPE.EMAIL,
      PAGE_PROPERTY_TYPE.PHONE,
      PAGE_PROPERTY_TYPE.FILES,
      PAGE_PROPERTY_TYPE.CREATED_TIME,
      PAGE_PROPERTY_TYPE.EDITED_TIME,
      PAGE_PROPERTY_TYPE.CREATED_BY,
      PAGE_PROPERTY_TYPE.EDITED_BY,
      PAGE_PROPERTY_TYPE.UNIQUE_ID,
    ]);
  });

  test('exposes the canonical view type values', () => {
    expect(PAGE_VIEW_TYPE_VALUES).toEqual([
      PAGE_VIEW_TYPE.TABLE,
      PAGE_VIEW_TYPE.BOARD,
      PAGE_VIEW_TYPE.LIST,
      PAGE_VIEW_TYPE.GALLERY,
      PAGE_VIEW_TYPE.CALENDAR,
      PAGE_VIEW_TYPE.CHART,
      PAGE_VIEW_TYPE.TIMELINE,
    ]);
  });

  test('exposes the canonical view outcome kinds', () => {
    expect(Object.values(PAGE_VIEW_OUTCOME_KIND)).toEqual([
      'BANDED_ROWS',
      'FLAT_ROWS',
      'GROUPED_ROWS',
      'MISSING_GROUPING_PROPERTY',
    ]);
  });
});
