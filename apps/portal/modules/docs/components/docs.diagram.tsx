'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { drawDiagram } from '@/shared/lib/diagram.drawing.lib';
import { watchTheDiagramGround } from '@/shared/lib/diagram.ground.lib';
import { fitTheDrawingToItsBox, showTheDrawingAtItsSize } from '@/shared/lib/diagram.size.lib';
import {
  DOCS_DRAWING_STYLE_CLASS,
  DOCS_SIZE_BUTTON_STYLE_CLASS,
  DOCS_WRITING_STYLE_CLASS,
} from '../constants/docs.style.constants';

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
 * One drawn wider than the column is fitted to it, so it can be taken in whole
 * at a glance, and can be let out to the size it was drawn at, where the box
 * scrolls and every word in it is readable again.
 */
export const DocsDiagram = ({ source }: IProps) => {
  const t = useTranslations('docs');
  const drawingRef = useRef<HTMLDivElement>(null);
  const [isWiderThanTheBox, setIsWiderThanTheBox] = useState(false);
  /** A drawing is shown at the size it was drawn, where every word in it is readable, and fitted only if asked. */
  const [isFitted, setIsFitted] = useState(false);

  const show = useCallback((fitted: boolean): void => {
    const drawing = drawingRef.current;
    if (drawing === null) return;
    const reaches = showTheDrawingAtItsSize(drawing);
    setIsWiderThanTheBox(reaches);
    if (reaches && fitted) fitTheDrawingToItsBox(drawing);
  }, []);

  useEffect(() => {
    let isShown = true;
    const draw = (): void => {
      void drawDiagram(source).then((made) => {
        const drawing = drawingRef.current;
        if (!isShown || drawing === null || made.svg === null) return;
        drawing.innerHTML = made.svg;
        show(isFitted);
      });
    };

    draw();
    const stopWatchingTheGround = watchTheDiagramGround(draw);
    return () => {
      isShown = false;
      stopWatchingTheGround();
    };
  }, [isFitted, show, source]);

  return (
    <div className="space-y-2">
      <pre className={DOCS_WRITING_STYLE_CLASS}>
        <code>{source}</code>
      </pre>
      {isWiderThanTheBox && (
        <div className="flex justify-end">
          <button
            className={DOCS_SIZE_BUTTON_STYLE_CLASS}
            onClick={() => setIsFitted((fitted) => !fitted)}
            type="button"
          >
            {isFitted ? t('drawingActualSize') : t('drawingFit')}
          </button>
        </div>
      )}
      <div className={DOCS_DRAWING_STYLE_CLASS} ref={drawingRef} />
    </div>
  );
};
