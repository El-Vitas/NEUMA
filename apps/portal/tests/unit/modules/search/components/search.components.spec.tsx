import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SearchForm } from '@/modules/search/components/search.form';
import en from '../../../../../messages/en.json';

const push = mock(() => undefined);

mock.module('../../../../../i18n/navigation', () => ({
  usePathname: () => '/search',
  useRouter: () => ({ push }),
}));

describe('SearchForm', () => {
  it('submits the query and filters through the localized route', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchForm
          initialValues={{
            contentType: undefined,
            query: '',
            sourceType: undefined,
            spaceId: undefined,
            tags: undefined,
            limit: 20,
          }}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your workspace' }), {
      target: { value: 'onboarding' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Source type' }), { target: { value: 'PAGE' } });
    fireEvent.submit(screen.getByRole('searchbox', { name: 'Search your workspace' }));

    expect(push).toHaveBeenCalledWith('/search?query=onboarding&sourceType=PAGE');
  });
});
