'use client';

import { Scan, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DIAGRAM_ZOOM_PERCENT } from '@/shared/constants/diagram.constants';
import { DOCS_SIZE_BUTTON_STYLE_CLASS, DOCS_ZOOM_ICON_SIZE } from '../constants/docs.style.constants';

interface IProps {
  readonly onActualSize: () => void;
  readonly onFit: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly zoom: number;
}

/**
 * The buttons an example's drawing is brought closer and pushed away by:
 * closer, further, fitted to its frame, and how close it is now, which takes
 * it back to its own size when pressed.
 */
export const DocsDiagramZoom = ({ onActualSize, onFit, onZoomIn, onZoomOut, zoom }: IProps) => {
  const t = useTranslations('docs');

  return (
    <div className="flex justify-end gap-1">
      <button
        aria-label={t('drawingZoomOut')}
        className={DOCS_SIZE_BUTTON_STYLE_CLASS}
        onClick={onZoomOut}
        type="button"
      >
        <ZoomOut aria-hidden size={DOCS_ZOOM_ICON_SIZE} />
      </button>
      <button
        aria-label={t('drawingActualSize')}
        className={`${DOCS_SIZE_BUTTON_STYLE_CLASS} min-w-14 tabular-nums`}
        onClick={onActualSize}
        title={t('drawingActualSize')}
        type="button"
      >
        {`${String(Math.round(zoom * DIAGRAM_ZOOM_PERCENT))} %`}
      </button>
      <button aria-label={t('drawingZoomIn')} className={DOCS_SIZE_BUTTON_STYLE_CLASS} onClick={onZoomIn} type="button">
        <ZoomIn aria-hidden size={DOCS_ZOOM_ICON_SIZE} />
      </button>
      <button
        aria-label={t('drawingFit')}
        className={DOCS_SIZE_BUTTON_STYLE_CLASS}
        onClick={onFit}
        title={t('drawingFit')}
        type="button"
      >
        <Scan aria-hidden size={DOCS_ZOOM_ICON_SIZE} />
      </button>
    </div>
  );
};
