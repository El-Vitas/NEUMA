import { describe, expect, it } from 'bun:test';
import {
  resolveBreadcrumbLabel,
  splitBreadcrumbParentPages,
} from '@/modules/pages/navigation/lib/pages.breadcrumb.lib';
import type { PageSummary } from '@/modules/pages/types/pages.types';

const buildPageSummary = (id: string, title: string): PageSummary => ({
  content: { content: [], schemaVersion: 1, type: 'doc' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: '33333333-3333-4333-8333-333333333333',
  title,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
});

describe('splitBreadcrumbParentPages', () => {
  it('keeps every parent visible when there are none to collapse', () => {
    const parentPages = [buildPageSummary('1', 'Handbook'), buildPageSummary('2', 'Policies')];

    const result = splitBreadcrumbParentPages(parentPages);

    expect(result.collapsedParentPages).toEqual([]);
    expect(result.visibleParentPages).toEqual(parentPages);
  });

  it('collapses the segments furthest from the current page, keeping the tail visible', () => {
    const parentPages = [
      buildPageSummary('1', 'Handbook'),
      buildPageSummary('2', 'Policies'),
      buildPageSummary('3', 'Onboarding'),
      buildPageSummary('4', 'Benefits'),
    ];

    const result = splitBreadcrumbParentPages(parentPages);

    expect(result.collapsedParentPages).toEqual([parentPages[0], parentPages[1]]);
    expect(result.visibleParentPages).toEqual([parentPages[2], parentPages[3]]);
  });
});

describe('resolveBreadcrumbLabel', () => {
  it('falls back when the value is undefined', () => {
    expect(resolveBreadcrumbLabel(undefined, 'Space root')).toBe('Space root');
  });

  it('falls back when the value is empty', () => {
    expect(resolveBreadcrumbLabel('', 'Untitled')).toBe('Untitled');
  });

  it('keeps the value when it is present', () => {
    expect(resolveBreadcrumbLabel('Engineering', 'Space root')).toBe('Engineering');
  });
});
