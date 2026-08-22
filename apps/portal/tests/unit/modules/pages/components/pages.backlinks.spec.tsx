import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesBacklinks } from '@/modules/pages/links/components/pages.backlinks';
import en from '../../../../../messages/en.json';

describe('PagesBacklinks', () => {
  it('renders the readable backlinks with links to their own space', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesBacklinks
          backlinks={{
            count: 1,
            items: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                spaceId: '22222222-2222-4222-8222-222222222222',
                title: 'Handbook',
              },
            ],
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: 'Handbook' }).getAttribute('href')).toBe(
      '/spaces/22222222-2222-4222-8222-222222222222/pages/11111111-1111-4111-8111-111111111111',
    );
  });

  it('renders nothing when there are no readable backlinks', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesBacklinks backlinks={{ count: 0, items: [] }} />
      </NextIntlClientProvider>,
    );

    expect(container.firstChild).toBeNull();
  });
});
