'use client';

import { useTranslations } from 'next-intl';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  PORTAL_SIDEBAR_TREE_KEYBOARD_STEP_PX,
  PORTAL_SIDEBAR_TREE_MAX_WIDTH_PX,
  PORTAL_SIDEBAR_TREE_MIN_WIDTH_PX,
} from '@/modules/portal/constants/portal.sidebar.panel.constants';

interface IProps {
  readonly onChangeWidth: (width: number) => void;
  readonly onPointerDown: (event: ReactPointerEvent<HTMLInputElement>) => void;
  readonly width: number;
}

/**
 * A real range slider standing in for the resize line at the tree's edge.
 *
 * As `<input type="range">` it already has the slider role, already exposes
 * min/max/value for real, and already answers to the arrow keys, Home, End
 * and Page Up/Down without a line of code here. Its own pointer dragging is
 * switched off in `onPointerDown` — a native slider that size would be far
 * more sensitive than the pixel-for-pixel drag this handle has always had —
 * so the caller drives the drag instead, exactly as before.
 */
export const SidebarTreeResizeHandle = ({ onChangeWidth, onPointerDown, width }: IProps) => {
  const t = useTranslations('pages.treePanel');

  return (
    <div className="absolute inset-y-0 -right-5.5 z-20 flex w-11 items-center justify-center">
      <input
        aria-label={t('resizeHandle')}
        className="peer absolute inset-0 size-full cursor-col-resize touch-none appearance-none bg-transparent outline-none [&::-moz-range-thumb]:size-full [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-moz-range-track]:appearance-none [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:size-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
        max={PORTAL_SIDEBAR_TREE_MAX_WIDTH_PX}
        min={PORTAL_SIDEBAR_TREE_MIN_WIDTH_PX}
        onChange={(event) => onChangeWidth(event.currentTarget.valueAsNumber)}
        onPointerDown={onPointerDown}
        step={PORTAL_SIDEBAR_TREE_KEYBOARD_STEP_PX}
        title={t('resizeHandleHint')}
        type="range"
        value={width}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none h-full w-px bg-sidebar-border transition-[background-color,width] peer-hover:w-0.5 peer-hover:bg-primary/60 peer-focus-visible:w-0.5 peer-focus-visible:bg-primary motion-reduce:transition-none"
      />
    </div>
  );
};
