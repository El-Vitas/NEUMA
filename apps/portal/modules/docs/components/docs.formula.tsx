'use client';

import { useEffect, useRef } from 'react';
import { drawFormula } from '@/shared/lib/formula.drawing.lib';
import { DOCS_FORMULA_STYLE_CLASS, DOCS_WRITING_STYLE_CLASS } from '../constants/docs.style.constants';

interface IProps {
  readonly source: string;
}

/**
 * An example shown as what is written and how it is set.
 *
 * It is set here and now by the same hand that sets formulas inside a page, so
 * what the manual shows is what somebody will get when they write the same
 * thing on a page of their own.
 */
export const DocsFormula = ({ source }: IProps) => {
  const settingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setting = settingRef.current;
    if (setting === null) return;
    const made = drawFormula(source);
    setting.innerHTML = made.html ?? '';
  }, [source]);

  return (
    <div className="space-y-2">
      <pre className={DOCS_WRITING_STYLE_CLASS}>
        <code>{source}</code>
      </pre>
      <div className={DOCS_FORMULA_STYLE_CLASS} ref={settingRef} />
    </div>
  );
};
