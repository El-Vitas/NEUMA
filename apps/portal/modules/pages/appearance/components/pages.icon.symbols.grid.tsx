'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { PAGE_ICON_SYMBOL_GRID_STEP } from '../constants/pages.icon.symbols.constants';
import type { PageIconColor } from '../types/pages.icon.types';
import { PagesIconSymbol } from './pages.icon.symbol';

interface IProps {
  readonly color: PageIconColor;
  readonly names: readonly string[];
  readonly onChoose: (name: string) => void;
}

/**
 * The symbols on offer, handed out a screenful at a time.
 *
 * Every symbol is fetched the moment it is drawn, so drawing all of them at
 * once would ask for close to two thousand files nobody has looked at yet. The
 * grid grows as the reader reaches its end instead, which is the same thing
 * they would have got by scrolling, minus the wait.
 *
 * Whoever renders this gives it a key tied to what is being searched for, so a
 * new search starts a new grid rather than one that remembers how far the last
 * one had been scrolled.
 */
export const PagesIconSymbolsGrid = ({ color, names, onChoose }: IProps) => {
  const t = useTranslations('pages.icon');
  const [shownCount, setShownCount] = useState(PAGE_ICON_SYMBOL_GRID_STEP);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const end = endRef.current;
    if (end === null) return;

    const watcher = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShownCount((current) => Math.min(current + PAGE_ICON_SYMBOL_GRID_STEP, names.length));
      }
    });
    watcher.observe(end);
    return () => watcher.disconnect();
  }, [names.length]);

  return (
    <fieldset aria-label={t('chooseSymbol')} className="mt-2 max-h-48 w-full overflow-y-auto border-0 p-0">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
        {names.slice(0, shownCount).map((name) => (
          <button
            aria-label={name}
            className="flex aspect-square min-h-11 w-full items-center justify-center text-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={name}
            onClick={() => onChoose(name)}
            type="button"
          >
            <PagesIconSymbol className="size-5" color={color} name={name} />
          </button>
        ))}
      </div>
      <div aria-hidden="true" ref={endRef} />
    </fieldset>
  );
};
