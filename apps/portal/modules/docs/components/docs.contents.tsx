'use client';

import { useEffect, useState } from 'react';
import { watchWhatIsBeingRead } from '@/shared/lib/reading.lib';
import { DOCS_READING_LINE } from '../constants/docs.reading.constants';
import {
  DOCS_CONTENTS_LINK_STYLE_CLASS,
  DOCS_CONTENTS_READING_STYLE_CLASS,
  DOCS_CONTENTS_STYLE_CLASS,
  DOCS_CONTENTS_TITLE_STYLE_CLASS,
} from '../constants/docs.style.constants';
import type { DocsHeading } from '../types/docs.types';

interface IProps {
  readonly headings: readonly DocsHeading[];
  readonly title: string;
}

export const DocsContents = ({ headings, title }: IProps) => {
  const [beingRead, setBeingRead] = useState<string | null>(null);

  useEffect(
    () =>
      watchWhatIsBeingRead(
        headings.map((heading) => document.getElementById(heading.id)).filter((heading) => heading !== null),
        (being) => setBeingRead(being?.id ?? null),
        DOCS_READING_LINE,
      ),
    [headings],
  );

  if (headings.length === 0) return null;

  return (
    <nav aria-label={title} className={DOCS_CONTENTS_STYLE_CLASS}>
      <p className={DOCS_CONTENTS_TITLE_STYLE_CLASS}>{title}</p>
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li className={heading.depth > 2 ? 'ps-3' : ''} key={heading.id}>
            <a
              aria-current={heading.id === beingRead ? 'true' : undefined}
              className={heading.id === beingRead ? DOCS_CONTENTS_READING_STYLE_CLASS : DOCS_CONTENTS_LINK_STYLE_CLASS}
              href={`#${heading.id}`}
            >
              {heading.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
