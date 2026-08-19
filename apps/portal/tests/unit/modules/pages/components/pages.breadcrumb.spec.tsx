import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesBreadcrumb } from '@/modules/pages/components/pages.breadcrumb';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import en from '../../../../../messages/en.json';

const SPACE_ID = '33333333-3333-4333-8333-333333333333';

const buildPageSummary = (id: string, title: string): PageSummary => ({
  content: { content: [], schemaVersion: 1, type: 'doc' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: SPACE_ID,
  title,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
});

const renderBreadcrumb = (props: Partial<Parameters<typeof PagesBreadcrumb>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesBreadcrumb parentPages={[]} spaceId={SPACE_ID} title="Policies" {...props} />
    </NextIntlClientProvider>,
  );

describe('PagesBreadcrumb', () => {
  it('falls back to the generic space label when no space name is given', () => {
    renderBreadcrumb();

    expect(screen.getByRole('link', { name: 'Space root' })).toBeDefined();
  });

  it('shows the space name once it is given', () => {
    renderBreadcrumb({ spaceName: 'Engineering' });

    expect(screen.getByRole('link', { name: 'Engineering' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Space root' })).toBeNull();
  });

  it('makes every parent segment a link to that page', () => {
    const parentPages = [buildPageSummary('1', 'Handbook')];
    renderBreadcrumb({ parentPages });

    const link = screen.getByRole('link', { name: 'Handbook' });
    expect(link.getAttribute('href')).toBe(`/spaces/${SPACE_ID}/pages/1`);
  });

  it('shows Untitled for a page with no title', () => {
    renderBreadcrumb({ title: '' });

    expect(screen.getByText('Untitled')).toBeDefined();
  });

  it('keeps every parent visible when the trail is shallow', () => {
    const parentPages = [buildPageSummary('1', 'Handbook'), buildPageSummary('2', 'Policies')];
    renderBreadcrumb({ parentPages });

    expect(screen.getByRole('link', { name: 'Handbook' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Policies' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Show intermediate segments' })).toBeNull();
  });

  it('collapses a deep trail behind a keyboard-reachable control that reveals the hidden segments', () => {
    const parentPages = [
      buildPageSummary('1', 'Handbook'),
      buildPageSummary('2', 'Onboarding'),
      buildPageSummary('3', 'Benefits'),
      buildPageSummary('4', 'Policies'),
    ];
    renderBreadcrumb({ parentPages });

    expect(screen.queryByRole('link', { name: 'Handbook' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Benefits' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Policies' })).toBeDefined();

    const expandControl = screen.getByRole('button', { name: 'Show intermediate segments' });
    expect(expandControl.textContent).toBe('…');

    fireEvent.pointerDown(expandControl, new PointerEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }));

    const hiddenLink = screen.getByRole('menuitem', { name: 'Handbook' });
    expect(hiddenLink.getAttribute('href')).toBe(`/spaces/${SPACE_ID}/pages/1`);
    expect(screen.getByRole('menuitem', { name: 'Onboarding' })).toBeDefined();
  });
});
