import type { ComponentProps } from 'react';
import { DOCS_DIAGRAM_FENCE, DOCS_FORMULA_FENCE, DOCS_ICONS_FENCE } from '../constants/docs.reading.constants';
import { DOCS_INLINE_CODE_STYLE_CLASS } from '../constants/docs.style.constants';
import { readFenceLanguage, readFenceText } from '../lib/docs.fence.lib';
import { DocsDiagram } from './docs.diagram';
import { DocsFormula } from './docs.formula';
import { DocsIcons } from './docs.icons';

/** The document decides what a block shows through its language tag, so authors never touch this component. */
export const DocsFence = ({ children, className }: ComponentProps<'code'>) => {
  const language = readFenceLanguage(className);
  const written = readFenceText(children);

  if (language === DOCS_DIAGRAM_FENCE) return <DocsDiagram source={written} />;
  if (language === DOCS_ICONS_FENCE) return <DocsIcons named={written} />;
  if (language === DOCS_FORMULA_FENCE) return <DocsFormula source={written} />;
  if (language === null) return <code className={DOCS_INLINE_CODE_STYLE_CLASS}>{children}</code>;

  return <code>{children}</code>;
};
