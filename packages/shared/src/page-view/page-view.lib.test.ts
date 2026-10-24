import { describe, expect, test } from 'bun:test';
import { PAGE_VIEW_SHAPE, PAGE_VIEW_TYPE, PAGE_VIEW_TYPE_VALUES } from '../types/page-schema.types.js';
import {
  getPageViewDefinition,
  getPageViewShape,
  pageViewRequiresGrouping,
  pageViewSupportsGrouping,
  readPageViewShape,
} from './page-view.lib.js';

describe('page view registry', () => {
  test('defines every view type exactly once', () => {
    const definedTypes = PAGE_VIEW_TYPE_VALUES.map((type) => getPageViewDefinition(type).type);

    expect(definedTypes).toEqual([...PAGE_VIEW_TYPE_VALUES]);
  });

  test('a board and a chart need a grouping property to render', () => {
    const typesRequiringGrouping = PAGE_VIEW_TYPE_VALUES.filter(pageViewRequiresGrouping);

    expect(typesRequiringGrouping).toEqual([PAGE_VIEW_TYPE.BOARD, PAGE_VIEW_TYPE.CHART]);
  });

  test('a view that requires grouping also supports it', () => {
    const inconsistentTypes = PAGE_VIEW_TYPE_VALUES.filter(
      (type) => pageViewRequiresGrouping(type) && !pageViewSupportsGrouping(type),
    );

    expect(inconsistentTypes).toEqual([]);
  });

  test('a timeline and a calendar are placed by dates, so neither groups', () => {
    expect(pageViewSupportsGrouping(PAGE_VIEW_TYPE.TIMELINE)).toBe(false);
    expect(pageViewSupportsGrouping(PAGE_VIEW_TYPE.CALENDAR)).toBe(false);
    expect(getPageViewShape(PAGE_VIEW_TYPE.TIMELINE)).toBe(PAGE_VIEW_SHAPE.FLAT);
  });

  test('a table reads its rows in a row, and a board in groups', () => {
    expect(getPageViewShape(PAGE_VIEW_TYPE.TABLE)).toBe(PAGE_VIEW_SHAPE.FLAT);
    expect(getPageViewShape(PAGE_VIEW_TYPE.BOARD)).toBe(PAGE_VIEW_SHAPE.GROUPED);
  });

  test('every view that arrives in groups requires a grouping property', () => {
    const groupedWithoutGrouping = PAGE_VIEW_TYPE_VALUES.filter(
      (type) => getPageViewShape(type) === PAGE_VIEW_SHAPE.GROUPED && !pageViewRequiresGrouping(type),
    );

    expect(groupedWithoutGrouping).toEqual([]);
  });

  test('a table asked to group reads its rows in groups, and reads them in a row when nobody asked', () => {
    expect(readPageViewShape(PAGE_VIEW_TYPE.TABLE, null)).toBe(PAGE_VIEW_SHAPE.FLAT);
    expect(readPageViewShape(PAGE_VIEW_TYPE.TABLE, 'status')).toBe(PAGE_VIEW_SHAPE.GROUPED);
  });

  test('a board reads its rows in groups whatever it was asked', () => {
    expect(readPageViewShape(PAGE_VIEW_TYPE.BOARD, null)).toBe(PAGE_VIEW_SHAPE.GROUPED);
    expect(readPageViewShape(PAGE_VIEW_TYPE.BOARD, 'status')).toBe(PAGE_VIEW_SHAPE.GROUPED);
  });
});
