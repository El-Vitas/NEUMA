'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { DIAGRAM_BOUNDED_STYLE_CLASS, DIAGRAM_ZOOM_BUTTON_STEP } from '@/shared/constants/diagram.constants';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { drawDiagram } from '@/shared/lib/diagram.drawing.lib';
import { watchTheDiagramGround } from '@/shared/lib/diagram.ground.lib';
import { letTheDrawingBeHandled } from '@/shared/lib/diagram.handling.lib';
import type { DiagramHandling } from '@/shared/types/diagram.types';
import { DOCS_DRAWING_STYLE_CLASS, DOCS_WRITING_STYLE_CLASS } from '../constants/docs.style.constants';
import { DocsDiagramZoom } from './docs.diagram.zoom';

interface IProps {
  readonly source: string;
}

/**
 * An example shown as what is written and what comes out of it.
 *
 * The drawing is made here and now, by the same hand that draws diagrams inside
 * a page: a manual that shows a picture of what the page used to do is a manual
 * that lies the day the page changes.
 *
 * It sits in a frame that never grows past the screen, fitted to it the first
 * time if it is larger, and is brought closer, pushed away or dragged around
 * inside it the same way a diagram on a page is.
 */
export const DocsDiagram = ({ source }: IProps) => {
  const t = useTranslations('docs');
  const drawingRef = useRef<HTMLElement>(null);
  const handlingRef = useRef<DiagramHandling | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const drawing = drawingRef.current;
    if (drawing === null) return;
    const handling = letTheDrawingBeHandled(drawing, setZoom);
    handlingRef.current = handling;
    return () => {
      handling.release();
      handlingRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isShown = true;
    const draw = (): void => {
      void drawDiagram(source).then((made) => {
        const drawing = drawingRef.current;
        if (!isShown || drawing === null || made.html === null) return;
        drawing.innerHTML = made.html;
        handlingRef.current?.showAtItsSize();
      });
    };

    draw();
    const stopWatchingTheGround = watchTheDiagramGround(draw);
    return () => {
      isShown = false;
      stopWatchingTheGround();
    };
  }, [source]);

  return (
    <div className="space-y-2">
      <pre className={DOCS_WRITING_STYLE_CLASS}>
        <code>{source}</code>
      </pre>
      <DocsDiagramZoom
        onActualSize={() => handlingRef.current?.showActualSize()}
        onFit={() => handlingRef.current?.fitToFrame()}
        onZoomIn={() => handlingRef.current?.zoomBy(DIAGRAM_ZOOM_BUTTON_STEP)}
        onZoomOut={() => handlingRef.current?.zoomBy(1 / DIAGRAM_ZOOM_BUTTON_STEP)}
        zoom={zoom}
      />
      <section
        aria-label={t('drawingRegion')}
        className={`${DOCS_DRAWING_STYLE_CLASS} ${DIAGRAM_BOUNDED_STYLE_CLASS} ${FOCUS_RING_CLASS}`}
        ref={drawingRef}
      />
    </div>
  );
};
