'use client';

import type { PageIcon } from '../types/pages.icon.types';
import { PagesIconGlyph } from './pages.icon.glyph';

interface IProps {
  readonly icon: PageIcon | null;
  readonly label: string;
}

/** A page's mark for whoever may only read it: shown, never offered for changing. */
export const PagesIconDisplay = ({ icon, label }: IProps) => (
  <div aria-label={label} className="relative flex size-16 items-center justify-center text-4xl" role="img">
    {icon !== null && <PagesIconGlyph icon={icon} />}
  </div>
);
