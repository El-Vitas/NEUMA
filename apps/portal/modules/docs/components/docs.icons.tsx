'use client';

import { useEffect, useState } from 'react';
import { DOCS_ICON_NAME_STYLE_CLASS, DOCS_ICON_SIZE, DOCS_ICON_STYLE_CLASS } from '../constants/docs.style.constants';
import { askForIconBooks, readIconDrawing, readNamedIcons } from '../lib/docs.icons.lib';
import type { DocsIconDrawing } from '../types/docs.types';
import { DocsIcon } from './docs.icon';

interface IProps {
  readonly named: string;
}

/** Icons are fetched from our own server, exactly as a diagram fetches them. */
export const DocsIcons = ({ named }: IProps) => {
  const [drawings, setDrawings] = useState<Readonly<Record<string, DocsIconDrawing>>>({});
  const wanted = readNamedIcons(named);

  useEffect(() => {
    let isShown = true;
    const books = [...new Set(readNamedIcons(named).map((icon) => icon.book))];

    const show = async (): Promise<void> => {
      const asked = await askForIconBooks(books);
      if (!isShown) return;
      const found: Record<string, DocsIconDrawing> = {};
      for (const icon of readNamedIcons(named)) {
        const drawing = readIconDrawing(asked[books.indexOf(icon.book)], icon.name);
        if (drawing !== null) found[icon.said] = drawing;
      }
      setDrawings(found);
    };

    void show();
    return () => {
      isShown = false;
    };
  }, [named]);

  return (
    <ul className="grid list-none grid-cols-2 gap-3 ps-0 sm:grid-cols-4">
      {wanted.map((icon) => (
        <li className={DOCS_ICON_STYLE_CLASS} key={icon.said}>
          <DocsIcon drawing={drawings[icon.said] ?? null} size={DOCS_ICON_SIZE} />
          <span className={DOCS_ICON_NAME_STYLE_CLASS}>{icon.said}</span>
        </li>
      ))}
    </ul>
  );
};
