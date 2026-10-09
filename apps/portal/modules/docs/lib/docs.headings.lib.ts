import GithubSlugger from 'github-slugger';
import { DOCS_FENCED_CODE, DOCS_HEADING_LINE } from '../constants/docs.reading.constants';
import type { DocsHeading } from '../types/docs.types';

/** Only levels 2 and 3 are indexed. Ids come from the same slugger the page uses, so index links match the headings. */
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
