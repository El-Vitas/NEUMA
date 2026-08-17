import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SearchErrorState } from '@/modules/search/components/search.error-state';
import en from '../../../../../messages/en.json';

describe('SearchErrorState', () => {
  it('offers a focused retry without discarding the active search route', () => {
    const retrySearch = mock(() => undefined);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchErrorState onRetry={retrySearch} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('alert').textContent).toBe(
      'Could not load search results. Check your connection and try again.',
    );
    expect(screen.getByRole('button', { name: 'Try again' }).parentElement?.className).toContain('justify-end');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(retrySearch).toHaveBeenCalledTimes(1);
  });
});
