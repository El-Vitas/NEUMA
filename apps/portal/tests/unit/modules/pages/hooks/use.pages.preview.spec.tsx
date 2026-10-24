import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import {
  PAGE_PREVIEW_CLOSE_DELAY_MS,
  PAGE_PREVIEW_OPEN_DELAY_MS,
} from '@/modules/pages/links/constants/pages.preview.constants';

const network = { isDown: false };

mock.module('@/modules/pages/links/server/actions/pages.preview.actions', () => ({
  getPagePreviewAction: () =>
    network.isDown
      ? Promise.reject(new Error('offline'))
      : Promise.resolve({ data: { fragment: 'Un fragmento', icon: null, properties: [], title: 'Página' } }),
}));

const { usePagesPreview } = await import('@/modules/pages/links/hooks/use.pages.preview');

const SPACE_ID = '11111111-1111-4111-8111-111111111111';
const PAGE_ID = '22222222-2222-4222-8222-222222222222';

interface Surface {
  readonly card: HTMLElement;
  readonly link: HTMLAnchorElement;
  readonly surface: HTMLElement;
  readonly writing: HTMLElement;
}

const buildSurface = (): Surface => {
  const surface = document.createElement('div');
  const link = document.createElement('a');
  link.href = `/spaces/${SPACE_ID}/pages/${PAGE_ID}`;
  const writing = document.createElement('p');
  const card = document.createElement('div');
  card.setAttribute('data-page-preview-card', 'true');
  surface.append(link, writing, card);
  document.body.append(surface);
  return { card, link, surface, writing };
};

const hoverOver = (element: HTMLElement): void => {
  act(() => {
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
};

// The card stands past the edge of the writing, so reaching it also leaves the surface.
const leaveSurfaceTowards = (surface: HTMLElement, entered: HTMLElement): void => {
  act(() => {
    surface.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: entered }));
  });
};

const renderPreview = (surface: HTMLElement) =>
  renderHook(() => {
    const surfaceRef = useRef<HTMLElement | null>(surface);
    return usePagesPreview(surfaceRef, () => ({ height: 400, left: 0, top: 0, width: 600 }));
  });

describe('usePagesPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    document.body.replaceChildren();
  });

  it('keeps the preview while the pointer crosses the gap and rests on the card itself', () => {
    const { card, link, surface, writing } = buildSurface();
    const { result } = renderPreview(surface);

    hoverOver(link);
    act(() => {
      jest.advanceTimersByTime(PAGE_PREVIEW_OPEN_DELAY_MS);
    });
    expect(result.current.atHand).not.toBeNull();

    hoverOver(writing);
    hoverOver(card);
    act(() => {
      jest.advanceTimersByTime(PAGE_PREVIEW_CLOSE_DELAY_MS * 4);
    });

    expect(result.current.atHand).not.toBeNull();
  });

  it('lets the preview go once the pointer leaves the card for the writing', () => {
    const { card, link, surface, writing } = buildSurface();
    const { result } = renderPreview(surface);

    hoverOver(link);
    act(() => {
      jest.advanceTimersByTime(PAGE_PREVIEW_OPEN_DELAY_MS);
    });
    hoverOver(card);
    hoverOver(writing);
    act(() => {
      jest.advanceTimersByTime(PAGE_PREVIEW_CLOSE_DELAY_MS * 2);
    });

    expect(result.current.atHand).toBeNull();
  });

  it('keeps the preview when reaching the card means leaving the writing behind', () => {
    const { card, link, surface } = buildSurface();
    const { result } = renderPreview(surface);

    hoverOver(link);
    act(() => {
      jest.advanceTimersByTime(PAGE_PREVIEW_OPEN_DELAY_MS);
    });

    leaveSurfaceTowards(surface, card);
    hoverOver(card);
    act(() => {
      jest.advanceTimersByTime(PAGE_PREVIEW_CLOSE_DELAY_MS * 4);
    });

    expect(result.current.atHand).not.toBeNull();
  });

  it('holds the preview open for as long as the card says the pointer is on it', () => {
    const { link, surface } = buildSurface();
    const { result } = renderPreview(surface);

    hoverOver(link);
    act(() => {
      jest.advanceTimersByTime(PAGE_PREVIEW_OPEN_DELAY_MS);
    });

    act(() => {
      result.current.letGo();
      result.current.hold();
      jest.advanceTimersByTime(PAGE_PREVIEW_CLOSE_DELAY_MS * 4);
    });

    expect(result.current.atHand).not.toBeNull();
  });

  it('answers as denied, instead of leaving the card loading, when the network is down', async () => {
    network.isDown = true;
    const { link, surface } = buildSurface();
    const { result } = renderPreview(surface);

    hoverOver(link);
    await act(async () => {
      jest.advanceTimersByTime(PAGE_PREVIEW_OPEN_DELAY_MS);
      await Promise.resolve();
      await Promise.resolve();
    });
    network.isDown = false;

    expect(result.current.outcome).toEqual({ kind: 'denied' });
  });

  it('lets the preview go when the card says the pointer left it', () => {
    const { link, surface } = buildSurface();
    const { result } = renderPreview(surface);

    hoverOver(link);
    act(() => {
      jest.advanceTimersByTime(PAGE_PREVIEW_OPEN_DELAY_MS);
    });

    act(() => {
      result.current.hold();
      result.current.letGo();
      jest.advanceTimersByTime(PAGE_PREVIEW_CLOSE_DELAY_MS * 2);
    });

    expect(result.current.atHand).toBeNull();
  });
});
