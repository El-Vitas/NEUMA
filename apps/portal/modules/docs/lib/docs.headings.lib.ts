import GithubSlugger from 'github-slugger';
import { DOCS_FENCED_CODE, DOCS_HEADING_LINE } from '../constants/docs.reading.constants';
import type { DocsHeading } from '../types/docs.types';

/**
 * The headings somebody can jump straight to, in the order they are written.
 *
 * Only the two levels below the title are taken: an index that lists everything
 * lists nothing, because it stops being a way of finding one thing and becomes
 * the document again, only harder to read.
 *
 * Names are made the way the page itself makes them, so that what the index
 * points at is what the heading answers to.
 */
export const readDocsHeadings = (markdown: string): readonly DocsHeading[] => {
  const slugger = new GithubSlugger();
  const headings: DocsHeading[] = [];
  let isFenced = false;

  for (const line of markdown.split('\n')) {
    if (DOCS_FENCED_CODE.test(line)) {
      isFenced = !isFenced;
      continue;
    }
    if (isFenced) continue;
    const written = DOCS_HEADING_LINE.exec(line);
    if (written?.[1] === undefined || written[2] === undefined) continue;
    const title = written[2].trim();
    headings.push({ depth: written[1].length, id: slugger.slug(title), title });
  }

  return headings;
};
