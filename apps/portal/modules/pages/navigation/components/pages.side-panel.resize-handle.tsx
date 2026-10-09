'use client';

import { useTranslations } from 'next-intl';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  PAGES_SIDE_PANEL_KEYBOARD_STEP_PX,
  PAGES_SIDE_PANEL_MAX_WIDTH_PX,
  PAGES_SIDE_PANEL_MIN_WIDTH_PX,
} from '../constants/pages.side-panel.constants';

interface IProps {
  readonly onChangeWidth: (width: number) => void;
  readonly onPointerDown: (event: ReactPointerEvent<HTMLInputElement>) => void;
  readonly width: number;
}

/**
 * A real `<input type="range">` so the keyboard works for free; pointer drag is disabled and driven by
 * the caller, since the native range would map the whole width onto an 11px thumb.
 */
export const PagesSidePanelResizeHandle = ({ onChangeWidth, onPointerDown, width }: IProps) => {
  const t = useTranslations('pages.sidePanel');

  return (
    <div className="absolute inset-y-0 -left-5.5 z-20 hidden w-11 items-center justify-center sm:flex">
      <input
        aria-label={t('resizeHandle')}
        className="peer absolute inset-0 size-full cursor-col-resize touch-none appearance-none bg-transparent outline-none [&::-moz-range-thumb]:size-full [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-moz-range-track]:appearance-none [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:size-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
        max={PAGES_SIDE_PANEL_MAX_WIDTH_PX}
        min={PAGES_SIDE_PANEL_MIN_WIDTH_PX}
        onChange={(event) => onChangeWidth(event.currentTarget.valueAsNumber)}
        onPointerDown={onPointerDown}
        step={PAGES_SIDE_PANEL_KEYBOARD_STEP_PX}
        title={t('resizeHandleHint')}
        type="range"
        value={width}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none h-full w-px bg-border transition-[background-color,width] peer-hover:w-0.5 peer-hover:bg-primary/60 peer-focus-visible:w-0.5 peer-focus-visible:bg-primary motion-reduce:transition-none"
      />
    </div>
  );
};
