import { pointAtExportedFiles } from './page-export.links.lib.js';
import { writePageAsMarkdown } from './page-markdown.lib.js';
import type { PageContent } from './schemas/page-content.schema.js';

/** One page on its way out: what it says, what it is called, and who it hung from. */
export interface PageForExport {
  readonly content: PageContent;
  readonly id: string;
  /** The names of the pages above it, from the top down. Empty for a page at the root of its space. */
  readonly path: readonly string[];
  readonly title: string;
}

/** One page as a file: where it goes inside the archive, and what it holds. */
export interface ExportedPageFile {
  readonly contents: string;
  readonly path: string;
}

/** What a file name cannot carry: a slash would turn one page into a folder, and the rest some system refuses. */
const UNSAFE_IN_A_FILE_NAME = /[/\\:*?"<>|]/g;
const REPEATED_BLANKS = /\s+/g;
const TRAILING_DOTS_OR_BLANKS = /[\s.]+$/;

const nameOf = (page: PageForExport, untitledLabel: string): string => {
  const written = page.title.trim();
  return written === '' ? untitledLabel : written;
};

/**
 * A name a file system will accept, still recognizable as the page it came from.
 *
 * Only what would break a path comes out; accents and spaces stay, because a
 * file name carries them fine and a page called «Diseño y año» should arrive
 * called that. A name that ends in a dot or a space is refused outright by some
 * systems, so that ending is trimmed.
 */
const asFileName = (name: string): string => {
  const plain = name
    .replaceAll(UNSAFE_IN_A_FILE_NAME, ' ')
    .replaceAll(REPEATED_BLANKS, ' ')
    .trim()
    .replace(TRAILING_DOTS_OR_BLANKS, '');
  return plain === '' ? '-' : plain.slice(0, 120);
};

/** A page written on its own, opening with its name so the file says what it is. */
export const writePageAsMarkdownFile = (page: PageForExport, untitledLabel = 'Untitled'): string =>
  [`# ${nameOf(page, untitledLabel)}`, writePageAsMarkdown(page.content)].filter((part) => part !== '').join('\n\n');

/**
 * Several pages as several files, in folders that say what hung from what.
 *
 * A page with pages under it becomes both: the file that holds its own writing,
 * and the folder that holds its daughters. That is how a hierarchy is said
 * without inventing syntax for it, and it is what every tool that reads
 * Markdown already expects to find.
 *
 * Two sisters called the same thing would land on the same file, so the second
 * one keeps its name and gains a number.
 */
export const writePagesAsMarkdownFiles = (
  pages: readonly PageForExport[],
  untitledLabel = 'Untitled',
  whereEachAssetWent: ReadonlyMap<string, string> = new Map(),
): readonly ExportedPageFile[] => {
  const taken = new Set<string>();
  const whereEachPageWent = new Map<string, string>();

  /** Where every page lands is settled first, so a link written later can already point at it. */
  for (const page of pages) {
    const folder = page.path.map((above) => asFileName(above));
    const base = asFileName(nameOf(page, untitledLabel));
    let candidate = [...folder, `${base}.md`].join('/');
    let repeat = 2;
    while (taken.has(candidate.toLowerCase())) {
      candidate = [...folder, `${base} (${String(repeat)}).md`].join('/');
      repeat += 1;
    }
    taken.add(candidate.toLowerCase());
    whereEachPageWent.set(page.id, candidate);
  }

  return pages.map((page) => {
    const path = whereEachPageWent.get(page.id) ?? `${asFileName(nameOf(page, untitledLabel))}.md`;
    const written = writePageAsMarkdownFile(page, untitledLabel);
    return { contents: pointAtExportedFiles(written, path, whereEachPageWent, whereEachAssetWent), path };
  });
};
