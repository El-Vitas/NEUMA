import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import type { PageUsageSettings, PageUsageSummary } from '@/modules/pages/types/pages.usage.types';
import en from '../../../../../messages/en.json';

/** What each action really answers: what was asked for, or a reason it could not be given. */
type UsageSettingsResult = { data: { enabled: boolean } } | { serverError: string };
type UsageReportResult = { data: { settings: PageUsageSettings; summary: PageUsageSummary } } | { serverError: string };

const updatePageUsageSettings = mock(
  async (input: { enabled: boolean }): Promise<UsageSettingsResult> => ({ data: { enabled: input.enabled } }),
);
const readUsageReport = mock(
  async (): Promise<UsageReportResult> => ({ data: { settings: { enabled: true }, summary } }),
);

mock.module('@/modules/pages/server/actions/pages.usage.actions', () => ({
  getPageUsageReportAction: readUsageReport,
  updatePageUsageSettingsAction: updatePageUsageSettings,
}));

const { PagesUsagePanel } = await import('@/modules/pages/components/pages.usage.panel');

const summary: PageUsageSummary = {
  viewCount: 2,
  viewers: [
    { id: 'user-a', name: 'Ana Pérez', viewedAt: new Date('2026-08-19T10:00:00.000Z') },
    { id: 'user-b', name: 'Beto Ruiz', viewedAt: new Date('2026-08-20T11:00:00.000Z') },
  ],
};

const settings: PageUsageSettings = { enabled: true };

const renderPanel = (report: { settings: PageUsageSettings; summary: PageUsageSummary } = { settings, summary }) => {
  readUsageReport.mockImplementation(async () => ({ data: report }));
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <PagesUsagePanel pageId="page-a" />
    </NextIntlClientProvider>,
  );
};

const openPanel = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Page views' }));
};

describe('PagesUsagePanel', () => {
  afterEach(() => {
    mock.clearAllMocks();
    cleanup();
    toast.dismiss();
  });

  it('shows the view count and who viewed the page', async () => {
    renderPanel();

    openPanel();

    await waitFor(() => {
      expect(screen.getByText('2 views')).toBeDefined();
      expect(screen.getByText('Ana Pérez')).toBeDefined();
      expect(screen.getByText('Beto Ruiz')).toBeDefined();
    });
  });

  it('says nobody has viewed the page yet when the list is empty', async () => {
    renderPanel({ settings, summary: { viewCount: 0, viewers: [] } });

    openPanel();

    await waitFor(() => {
      expect(screen.getByText('No views yet')).toBeDefined();
      expect(screen.getByText('Nobody has viewed this page yet.')).toBeDefined();
    });
  });

  it('turns tracking off and reports the change', async () => {
    renderPanel();
    openPanel();

    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(updatePageUsageSettings).toHaveBeenCalledWith({ enabled: false });
      expect(checkbox.getAttribute('data-state')).toBe('unchecked');
    });
  });

  it('reverts the toggle and warns when the change fails', async () => {
    updatePageUsageSettings.mockImplementation(async () => ({ serverError: 'unexpected' }));
    renderPanel();
    openPanel();

    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox.getAttribute('data-state')).toBe('checked');
      expect(screen.getByText('Could not update the page view setting.')).toBeDefined();
    });
  });
});
