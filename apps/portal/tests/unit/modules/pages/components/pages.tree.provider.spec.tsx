import { afterEach, describe, expect, it, mock } from 'bun:test';
import { render } from '@testing-library/react';
import type { PageTreeChildren, PageTreeEntry } from '@/modules/pages/tree/types/pages.tree.types';

const readWindows = mock(async (): Promise<readonly PageTreeChildren[] | null> => null);

/** The provider reaches server actions for its reads, which refuse to load outside a server. */
mock.module('@/modules/pages/tree/lib/pages.tree.client.lib', () => ({
  readTreeWindowsFromServer: readWindows,
  requestPageTreeLiveToken: async () => null,
}));

const { PagesTreeProvider } = await import('@/modules/pages/tree/components/pages.tree.provider');

const entry = (id: string, version: number): PageTreeEntry => ({
  hasChildren: false,
  hasOwnPermissions: false,
  icon: null,
  id,
  isCollection: false,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  title: id,
  version,
});

const spacesWith = (version: number) => [{ id: 'space-1', roots: { entries: [entry('a', version)], total: 1 } }];

describe('PagesTreeProvider', () => {
  afterEach(() => {
    mock.clearAllMocks();
  });

  it('does not read the open branches again when the server draws the same pages again', () => {
    const { rerender } = render(<PagesTreeProvider spaces={spacesWith(1)}>x</PagesTreeProvider>);

    rerender(<PagesTreeProvider spaces={spacesWith(1)}>x</PagesTreeProvider>);

    expect(readWindows).not.toHaveBeenCalled();
  });

  it('reads the open branches again when the pages at the top are not the same', () => {
    const { rerender } = render(<PagesTreeProvider spaces={spacesWith(1)}>x</PagesTreeProvider>);

    rerender(<PagesTreeProvider spaces={spacesWith(2)}>x</PagesTreeProvider>);

    expect(readWindows).toHaveBeenCalledTimes(1);
  });
});
