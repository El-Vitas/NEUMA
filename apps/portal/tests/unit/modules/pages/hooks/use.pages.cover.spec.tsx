import { describe, expect, it, mock } from 'bun:test';
import { act, renderHook, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import en from '../../../../../messages/en.json';

const uploadPageCoverImageAction = mock(
  async (): Promise<{ readonly serverError: string }> => ({
    serverError: 'locked',
  }),
);

mock.module('server-only', () => ({}));
mock.module('@/modules/pages/appearance/server/actions/pages.cover.actions', () => ({
  removePageCoverAction: async () => ({ data: undefined }),
  repositionPageCoverAction: async () => ({ data: undefined }),
  uploadPageCoverImageAction,
}));

const { usePagesCover } = await import('@/modules/pages/appearance/hooks/use.pages.cover');

const Providers = ({ children }: { readonly children: ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <Toaster />
    {children}
  </NextIntlClientProvider>
);

const uploadCover = async (): Promise<void> => {
  const { result } = renderHook(() => usePagesCover(null, 'page-1', 'space-1'), { wrapper: Providers });
  await act(async () => {
    result.current.upload(new File(['image'], 'cover.png', { type: 'image/png' }));
  });
};

describe('usePagesCover when the API refuses', () => {
  it('says the page is locked, not that the upload failed, when the page is locked', async () => {
    await uploadCover();

    expect(await screen.findByText(en.errors.reasons.locked)).toBeDefined();
    expect(screen.queryByText(en.pages.cover.uploadError)).toBeNull();
  });

  it('keeps the upload message for any other refusal', async () => {
    uploadPageCoverImageAction.mockImplementationOnce(async () => ({ serverError: 'unexpected' }));

    await uploadCover();

    expect(await screen.findByText(en.pages.cover.uploadError)).toBeDefined();
  });
});
