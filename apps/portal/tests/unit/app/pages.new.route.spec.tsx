import { describe, expect, it, mock } from 'bun:test';
import type { UserRole } from '@company-brain/shared';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';

const currentUser = mock(async (): Promise<{ readonly role: UserRole }> => ({ role: 'CLIENT' }));
const pagesResult = { isOk: () => true, getValue: () => [] };
const spacesResult = {
  isOk: () => true,
  getValue: () => [{ id: '33333333-3333-4333-8333-333333333333', name: 'Company Brain' }],
};
const notFound = mock(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const workspace = mock(() => createElement('div', { 'data-testid': 'new-page-workspace' }));

mock.module('next/navigation', () => ({ notFound }));
mock.module('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));
mock.module('@/modules/auth/server/lib/get.current.user.server', () => ({ getCurrentUser: currentUser }));
mock.module('@/modules/pages/components/pages.workspace', () => ({ PagesWorkspace: workspace }));
mock.module('@/modules/pages/server/queries/pages.queries', () => ({
  getPages: async () => pagesResult,
}));
mock.module('@/modules/spaces/server/queries/spaces.queries', () => ({
  getSpaces: async () => spacesResult,
}));
mock.module('@/shared/components/ui/page-header', () => ({ PageHeader: () => null }));
mock.module('@/shared/components/ui/form-error-banner', () => ({ FormErrorBanner: () => null }));

const { default: NewPage } = await import('@/app/[locale]/(portal)/spaces/[spaceId]/pages/new/page');

describe('new page route authorization', () => {
  it('does not render the creation workspace for viewers', async () => {
    currentUser.mockResolvedValueOnce({ role: 'CLIENT' });

    await expect(
      NewPage({ params: Promise.resolve({ spaceId: '33333333-3333-4333-8333-333333333333' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(workspace).not.toHaveBeenCalled();
  });

  it('renders the creation workspace for editors', async () => {
    currentUser.mockResolvedValueOnce({ role: 'WORKER' });

    const result = await NewPage({ params: Promise.resolve({ spaceId: '33333333-3333-4333-8333-333333333333' }) });

    render(result);

    expect(screen.getByTestId('new-page-workspace')).toBeDefined();
  });
});
