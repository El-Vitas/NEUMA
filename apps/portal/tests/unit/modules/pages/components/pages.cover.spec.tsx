import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesCover } from '@/modules/pages/components/pages.cover';
import type { PageCoverValue, PagesCoverController } from '@/modules/pages/types/pages.cover.types';
import en from '../../../../../messages/en.json';

const buildController = (
  cover: PageCoverValue | null,
  overrides: Partial<PagesCoverController> = {},
): PagesCoverController => ({
  cancelReposition: () => undefined,
  cover,
  isPending: false,
  isRepositioning: false,
  remove: () => undefined,
  saveReposition: () => undefined,
  startReposition: () => undefined,
  upload: () => undefined,
  ...overrides,
});

const renderCover = (controller: PagesCoverController) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesCover controller={controller} />
    </NextIntlClientProvider>,
  );

describe('the picture at the head of a page', () => {
  it('shows nothing at all when the page has no cover', () => {
    const { container } = renderCover(buildController(null));

    expect(container.firstElementChild).toBeNull();
  });

  /** This is what made the old one read as a bug: the picture took the pointer without being asked. */
  it('is only a picture until somebody asks to reposition it', () => {
    renderCover(buildController({ assetId: 'asset-1', position: 50 }));

    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByText(en.pages.cover.repositionHelp)).toBeNull();
  });

  it('takes hold of the pointer only while repositioning, and says where the framing stands', () => {
    renderCover(buildController({ assetId: 'asset-1', position: 50 }, { isRepositioning: true }));

    const slider = screen.getByRole('slider', { name: en.pages.cover.reposition });
    expect(slider.getAttribute('aria-valuenow')).toBe('50');
    expect(slider.classList.contains('touch-none')).toBe(true);
    expect(screen.getByText(en.pages.cover.repositionHelp)).toBeDefined();
  });

  it('moves the framing with the arrow keys and keeps it only when asked', () => {
    const savedPositions: number[] = [];
    renderCover(
      buildController(
        { assetId: 'asset-1', position: 50 },
        { isRepositioning: true, saveReposition: (position) => savedPositions.push(position) },
      ),
    );

    const slider = screen.getByRole('slider', { name: en.pages.cover.reposition });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });

    expect(slider.getAttribute('aria-valuenow')).toBe('55');
    expect(savedPositions).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: en.pages.cover.repositionSave }));

    expect(savedPositions).toEqual([55]);
  });

  it('leaves the framing as it was when the repositioning is cancelled', () => {
    const savedPositions: number[] = [];
    let wasCancelled = false;
    renderCover(
      buildController(
        { assetId: 'asset-1', position: 50 },
        {
          cancelReposition: () => {
            wasCancelled = true;
          },
          isRepositioning: true,
          saveReposition: (position) => savedPositions.push(position),
        },
      ),
    );

    fireEvent.keyDown(screen.getByRole('slider', { name: en.pages.cover.reposition }), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('button', { name: en.pages.cover.repositionCancel }));

    expect(wasCancelled).toBe(true);
    expect(savedPositions).toEqual([]);
  });
});
