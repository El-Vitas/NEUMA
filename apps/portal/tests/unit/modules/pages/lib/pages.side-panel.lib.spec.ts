import { describe, expect, it } from 'bun:test';
import {
  buildAddressWithSearch,
  buildPagesSidePanelQueryHref,
  clampPagesSidePanelWidth,
  resolveInternalPageHref,
  withoutPagesSidePanelParam,
  withPagesSidePanelParam,
} from '@/modules/pages/navigation/lib/pages.side-panel.lib';

const PAGE_ID = '22222222-2222-4222-8222-222222222222';
const SPACE_ID = '33333333-3333-4333-8333-333333333333';

describe('clampPagesSidePanelWidth', () => {
  it('keeps a width already inside the allowed range', () => {
    expect(clampPagesSidePanelWidth(500)).toBe(500);
  });

  it('never lets the panel narrow past its minimum', () => {
    expect(clampPagesSidePanelWidth(10)).toBe(360);
  });

  it('never lets the panel widen past its maximum', () => {
    expect(clampPagesSidePanelWidth(5000)).toBe(960);
  });
});

describe('withPagesSidePanelParam', () => {
  it('adds the panel parameter to an address that had none', () => {
    expect(withPagesSidePanelParam('', PAGE_ID)).toBe(`panel=${PAGE_ID}`);
  });

  it('keeps whatever else the address already asked, changing only the panel', () => {
    expect(withPagesSidePanelParam('search=quarterly&panel=old-id', PAGE_ID)).toBe(`search=quarterly&panel=${PAGE_ID}`);
  });
});

describe('withoutPagesSidePanelParam', () => {
  it('drops the panel and leaves the rest of the address untouched', () => {
    expect(withoutPagesSidePanelParam(`search=quarterly&panel=${PAGE_ID}`)).toBe('search=quarterly');
  });

  it('does nothing to an address that never named a panel', () => {
    expect(withoutPagesSidePanelParam('search=quarterly')).toBe('search=quarterly');
  });
});

describe('buildAddressWithSearch', () => {
  it('leaves nothing dangling when there is no search left to ask', () => {
    expect(buildAddressWithSearch('/spaces/space-1/pages/page-1', '')).toBe('/spaces/space-1/pages/page-1');
  });

  it('attaches the search it was given', () => {
    expect(buildAddressWithSearch('/spaces/space-1/pages/page-1', 'panel=page-2')).toBe(
      '/spaces/space-1/pages/page-1?panel=page-2',
    );
  });
});

describe('buildPagesSidePanelQueryHref', () => {
  it('is a relative address a row can point at', () => {
    expect(buildPagesSidePanelQueryHref('', PAGE_ID)).toBe(`?panel=${PAGE_ID}`);
  });

  it('keeps the view being looked at, so opening a row does not send the collection back to another one', () => {
    expect(buildPagesSidePanelQueryHref('view=Board', PAGE_ID)).toBe(`?view=Board&panel=${PAGE_ID}`);
  });

  it('replaces the row already open instead of naming two', () => {
    expect(buildPagesSidePanelQueryHref('view=Board&panel=old-id', PAGE_ID)).toBe(`?view=Board&panel=${PAGE_ID}`);
  });
});

describe('resolveInternalPageHref', () => {
  it('reads the space and the page out of a link this app wrote', () => {
    expect(resolveInternalPageHref(`/spaces/${SPACE_ID}/pages/${PAGE_ID}`)).toEqual({
      pageId: PAGE_ID,
      spaceId: SPACE_ID,
    });
  });

  it('still finds the page under a query string or a hash', () => {
    expect(resolveInternalPageHref(`/spaces/${SPACE_ID}/pages/${PAGE_ID}?panel=other#heading`)).toEqual({
      pageId: PAGE_ID,
      spaceId: SPACE_ID,
    });
  });

  it('says nothing for a link that does not name a page of this app', () => {
    expect(resolveInternalPageHref(`/spaces/${SPACE_ID}`)).toBeNull();
    expect(resolveInternalPageHref('https://example.com')).toBeNull();
  });
});
