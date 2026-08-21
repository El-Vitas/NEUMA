import { MARKDOWN_PAGE_MARKER } from './constants/page-markdown.constants.js';
import { writePageAsMarkdown } from './page-markdown.lib.js';
import type { PageContent } from './schemas/page-content.schema.js';

/** One page on its way out: what it says, what it is called, and who it hung from. */
export interface PageForExport {
  readonly content: PageContent;
  /** The names of the pages above it, from the top down. Empty for a page at the root of its space. */
  readonly path: readonly string[];
  readonly title: string;
}

/**
 * Several pages written into one file.
 *
 * A folder of files would need a way to pack it, and a way to unpack it on the
 * other side; one file needs neither and still says where each page lived. The
 * line that opens each page is an HTML comment, which every Markdown reader
 * already knows to leave alone — so it is invisible where the file is read and
 * plain where the file is read back.
 */
export const writePagesAsMarkdownFile = (pages: readonly PageForExport[], untitledLabel = 'Untitled'): string =>
  pages
    .map((page) => {
      const named = page.title.trim() === '' ? untitledLabel : page.title.trim();
      const whereItLived = [...page.path, named].join(' / ');
      const written = writePageAsMarkdown(page.content);
      return [`${MARKDOWN_PAGE_MARKER} ${whereItLived} -->`, `# ${named}`, written]
        .filter((part) => part !== '')
        .join('\n\n');
    })
    .join('\n\n');
