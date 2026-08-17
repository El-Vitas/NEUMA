import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesHeader } from '@/modules/pages/components/pages.header';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { APP_TIME_ZONE } from '@/shared/constants/date.constants';
import en from '../../../../../messages/en.json';

const PARENT_PAGES: readonly PageSummary[] = [
  {
    content: { content: [], schemaVersion: 1, type: 'doc' },
    id: '22222222-2222-4222-8222-222222222222',
    lifecycle: 'ACTIVE',
    order: 0,
    parentId: null,
    propertyValues: null,
    spaceId: '33333333-3333-4333-8333-333333333333',
    title: 'Handbook',
    version: 1,
  },
];

describe('PagesHeader', () => {
  it('renders the space, parent path, current page, and when it finished saving', () => {
    const savedAt = new Date('2026-08-15T14:32:00Z');
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesHeader
          canEdit
          displayState="saved"
          onTitleChange={() => undefined}
          parentPages={PARENT_PAGES}
          savedAt={savedAt}
          spaceId="33333333-3333-4333-8333-333333333333"
          title="Policies"
          titleInputRef={{ current: null }}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('navigation', { name: 'Location' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Space root' }).getAttribute('href')).toBe(
      '/spaces/33333333-3333-4333-8333-333333333333',
    );
    expect(screen.getByRole('link', { name: 'Handbook' }).getAttribute('href')).toBe(
      '/spaces/33333333-3333-4333-8333-333333333333/pages/22222222-2222-4222-8222-222222222222',
    );
    expect(screen.getByTitle('Policies').closest('[aria-current="page"]')).not.toBeNull();

    const expectedTime = new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: APP_TIME_ZONE,
    }).format(savedAt);
    expect(screen.getByRole('status').textContent).toBe(`Saved at ${expectedTime}`);
  });

  it('says it is saving, with a single live region, one answer to the reader', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesHeader
          canEdit
          displayState="saving"
          onTitleChange={() => undefined}
          parentPages={PARENT_PAGES}
          savedAt={null}
          spaceId="33333333-3333-4333-8333-333333333333"
          title="Policies"
          titleInputRef={{ current: null }}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toBe('Saving…');
  });
});
