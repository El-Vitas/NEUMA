'use client';

import { useEffect, useState } from 'react';
import {
  DOCS_CONTENTS_LINK_STYLE_CLASS,
  DOCS_CONTENTS_READING_STYLE_CLASS,
  DOCS_CONTENTS_STYLE_CLASS,
  DOCS_CONTENTS_TITLE_STYLE_CLASS,
} from '../constants/docs.style.constants';
import { watchWhatIsBeingRead } from '../lib/docs.reading.lib';
import type { DocsHeading } from '../types/docs.types';

interface IProps {
  readonly headings: readonly DocsHeading[];
  readonly title: string;
}

/**
 * Where everything in a document is, and where the reader is in it.
 *
 * Each heading answers to a name of its own, so this is also how one stretch of
 * a document is sent to somebody else: the address of the page ending in the
 * name of the heading lands on the heading. The one being read is marked, which
 * is what turns a list of names into a place to stand.
 */
export const DocsContents = ({ headings, title }: IProps) => {
  const [beingRead, setBeingRead] = useState<string | null>(null);

  useEffect(
    () =>
      watchWhatIsBeingRead(
        headings.map((heading) => heading.id),
        setBeingRead,
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
