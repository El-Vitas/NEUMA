import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesPreviewCard } from '@/modules/pages/components/pages.preview.card';
import type { PagePreviewOutcome } from '@/modules/pages/types/pages.preview.types';
import en from '../../../../../messages/en.json';

const SPACE_ID = '11111111-1111-4111-8111-111111111111';
const PAGE_ID = '22222222-2222-4222-8222-222222222222';

const renderCard = (outcome: PagePreviewOutcome | null) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesPreviewCard
        onHold={() => undefined}
        onLetGo={() => undefined}
        outcome={outcome}
        target={{ pageId: PAGE_ID, spaceId: SPACE_ID }}
      />
    </NextIntlClientProvider>,
  );

describe('PagesPreviewCard', () => {
  it('says it is still asking for the page while there is no outcome yet', () => {
    renderCard(null);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Loading the preview...')).toBeTruthy();
  });

  it('says nothing about a page it was refused, beyond that it was refused', () => {
    renderCard({ kind: 'denied' });

    expect(screen.getByText('This preview cannot be shown because you do not have access')).toBeTruthy();
  });

  it('shows the mark, the name, the properties and a fragment of a page it could read', () => {
    renderCard({
      content: {
        fragment: 'The plan starts here.',
        icon: { kind: 'emoji', value: '🚀' },
        properties: [{ key: 'status', label: 'Status', value: 'Done' }],
        title: 'Launch plan',
      },
      kind: 'found',
    });

    expect(screen.getByText('🚀')).toBeTruthy();
    expect(screen.getByText('Launch plan')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('The plan starts here.')).toBeTruthy();
  });

  it('names an untitled page the same way the rest of the app does', () => {
    renderCard({
      content: { fragment: '', icon: null, properties: [], title: '' },
      kind: 'found',
    });

    expect(screen.getByText('Untitled')).toBeTruthy();
  });

  it('says a page has nothing written yet rather than showing a blank fragment', () => {
    renderCard({
      content: { fragment: '', icon: null, properties: [], title: 'Empty page' },
      kind: 'found',
    });

    expect(screen.getByText('This page has nothing written yet')).toBeTruthy();
  });

  it('shows no properties when the page carries none', () => {
    renderCard({
      content: { fragment: 'Nothing more to say.', icon: null, properties: [], title: 'Plain page' },
      kind: 'found',
    });

    expect(screen.queryByText('Status')).toBeNull();
  });

  it('offers the page itself, so what the card shows can be opened from the card', () => {
    renderCard({
      content: { fragment: 'The plan starts here.', icon: null, properties: [], title: 'Launch plan' },
      kind: 'found',
    });

    const wayIn = screen.getByRole('link', { name: 'Launch plan' });

    expect(wayIn.getAttribute('href')).toBe(`/spaces/${SPACE_ID}/pages/${PAGE_ID}`);
  });
});
