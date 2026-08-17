import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { SearchForm } from '@/modules/search/components/search.form';
import en from '../../../../../messages/en.json';

const push = mock(() => undefined);

mock.module('../../../../../i18n/navigation', () => ({
  Link: ({ href, ...props }: ComponentProps<'a'>) => <a href={href} {...props} />,
  usePathname: () => '/search',
  useRouter: () => ({ push }),
}));

const spaces = [{ id: 'space-1', name: 'Engineering' }];

describe('SearchForm', () => {
  it('submits the query through the localized route when no filters are selected', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchForm
          initialFilters={{}}
          initialValues={{
            contentType: undefined,
            query: '',
            sourceType: undefined,
            spaceId: undefined,
            tags: undefined,
            limit: 20,
          }}
          spaces={spaces}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your workspace' }), {
      target: { value: 'onboarding' },
    });
    fireEvent.submit(screen.getByRole('searchbox', { name: 'Search your workspace' }));

    expect(push).toHaveBeenCalledWith('/search?query=onboarding');
  });

  it('submits the previously selected space and content type as real filter values', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchForm
          initialFilters={{}}
          initialValues={{
            contentType: undefined,
            query: 'onboarding',
            sourceType: 'PAGE',
            spaceId: 'space-1',
            tags: undefined,
            limit: 20,
          }}
          spaces={spaces}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.submit(screen.getByRole('searchbox', { name: 'Search your workspace' }));

    expect(push).toHaveBeenCalledWith('/search?query=onboarding&sourceType=PAGE&spaceId=space-1');
  });

  it('exposes the space and content type filters as labeled selects instead of free-text inputs', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchForm
          initialFilters={{}}
          initialValues={{
            contentType: undefined,
            query: '',
            sourceType: undefined,
            spaceId: undefined,
            tags: undefined,
            limit: 20,
          }}
          spaces={spaces}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('combobox', { name: 'Space' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Content type' })).toBeDefined();
    expect(screen.queryByPlaceholderText('Filter by space ID')).toBeNull();
    expect(screen.queryByPlaceholderText('Filter by content type')).toBeNull();
  });

  it('exposes author and edited date as additional filter controls', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchForm
          initialFilters={{}}
          initialValues={{
            contentType: undefined,
            query: '',
            sourceType: undefined,
            spaceId: undefined,
            tags: undefined,
            limit: 20,
          }}
          spaces={spaces}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByPlaceholderText('Filter by author')).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Filter by edited date' })).toBeDefined();
  });

  it('submits an author query and an edited range alongside the base filters', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchForm
          initialFilters={{ authorQuery: 'Ada', editedRange: 'LAST_SEVEN_DAYS' }}
          initialValues={{
            contentType: undefined,
            query: 'roadmap',
            sourceType: undefined,
            spaceId: undefined,
            tags: undefined,
            limit: 20,
          }}
          spaces={spaces}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.submit(screen.getByRole('searchbox', { name: 'Search your workspace' }));

    expect(push).toHaveBeenCalledWith('/search?query=roadmap&authorQuery=Ada&editedRange=LAST_SEVEN_DAYS');
  });

  it('shows a removable chip for each applied filter', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchForm
          initialFilters={{ authorQuery: 'Ada' }}
          initialValues={{
            contentType: undefined,
            query: 'roadmap',
            sourceType: undefined,
            spaceId: 'space-1',
            tags: undefined,
            limit: 20,
          }}
          spaces={spaces}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: 'Remove the Space filter' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Remove the Author filter' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Clear all filters' })).toBeDefined();
  });
});
