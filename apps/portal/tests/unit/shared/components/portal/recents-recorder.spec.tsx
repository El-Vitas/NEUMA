import { describe, expect, it, mock } from 'bun:test';
import { render } from '@testing-library/react';

const recordVisit = mock((_visit: unknown) => undefined);

mock.module('@/shared/hooks/use.recents-storage.hook', () => ({
  useRecentPages: () => ({ recordVisit }),
}));

const { RecentPageRecorder } = await import('@/shared/components/portal/recents-recorder');

describe('RecentPageRecorder', () => {
  it('records the visit for the page it mounts with, and renders nothing', () => {
    const { container } = render(
      <RecentPageRecorder pageId="page-1" spaceId="space-1" spaceName="Engineering" title="Roadmap" />,
    );

    expect(container.innerHTML).toBe('');
    expect(recordVisit).toHaveBeenCalledWith({
      pageId: 'page-1',
      spaceId: 'space-1',
      spaceName: 'Engineering',
      title: 'Roadmap',
    });
  });

  it('records the visit again when the page it mounts with changes', () => {
    recordVisit.mockClear();
    const { rerender } = render(
      <RecentPageRecorder pageId="page-1" spaceId="space-1" spaceName="Engineering" title="Roadmap" />,
    );

    rerender(<RecentPageRecorder pageId="page-2" spaceId="space-1" spaceName="Engineering" title="Handbook" />);

    expect(recordVisit).toHaveBeenCalledTimes(2);
    expect(recordVisit).toHaveBeenLastCalledWith({
      pageId: 'page-2',
      spaceId: 'space-1',
      spaceName: 'Engineering',
      title: 'Handbook',
    });
  });
});
