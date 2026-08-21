import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, waitFor } from '@testing-library/react';

const recordPageView = mock(async () => ({ data: undefined }));

mock.module('@/modules/pages/server/actions/pages.usage.actions', () => ({
  recordPageViewAction: recordPageView,
}));

const { PagesUsageRecorder } = await import('@/modules/pages/components/pages.usage.recorder');

describe('PagesUsageRecorder', () => {
  afterEach(() => {
    mock.clearAllMocks();
    cleanup();
  });

  it('records a view for the page it mounts on', async () => {
    render(<PagesUsageRecorder pageId="page-a" />);

    await waitFor(() => {
      expect(recordPageView).toHaveBeenCalledWith({ pageId: 'page-a' });
    });
  });

  it('records again when the mounted page changes', async () => {
    const { rerender } = render(<PagesUsageRecorder pageId="page-a" />);
    await waitFor(() => expect(recordPageView).toHaveBeenCalledWith({ pageId: 'page-a' }));

    rerender(<PagesUsageRecorder pageId="page-b" />);

    await waitFor(() => {
      expect(recordPageView).toHaveBeenCalledWith({ pageId: 'page-b' });
    });
  });

  it('renders nothing visible', () => {
    const { container } = render(<PagesUsageRecorder pageId="page-a" />);

    expect(container.textContent).toBe('');
  });
});
