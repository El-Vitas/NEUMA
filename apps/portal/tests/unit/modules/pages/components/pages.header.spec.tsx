import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesHeader } from '@/modules/pages/components/pages.header';
import en from '../../../../../messages/en.json';

describe('PagesHeader', () => {
  it('renders the space, parent path, current page, and saved state', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesHeader
          canEdit
          hasSaved
          isSaving={false}
          onTitleChange={() => undefined}
          parentPages={[
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
          ]}
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
    expect(screen.getByRole('status').textContent).toBe('Page updated');
  });
});
