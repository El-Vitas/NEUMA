import { pointAtExportedFiles } from './page-export.links.lib.js';
import { writePageAsMarkdown } from './page-markdown.lib.js';
import type { PageContent } from './schemas/page-content.schema.js';

export interface PageForExport {
  readonly content: PageContent;
  readonly id: string;
  /** Names of the ancestor pages, top down; empty at the root of the space. */
  readonly path: readonly string[];
  readonly title: string;
}

export interface ExportedPageFile {
  readonly contents: string;
  readonly path: string;
}

/** A slash would turn the page into a folder; the other characters are refused by some file systems. */
const UNSAFE_IN_A_FILE_NAME = /[/\\:*?"<>|]/g;
const REPEATED_BLANKS = /\s+/g;
const DOT_OR_BLANK = /^[\s.]$/;

/** Scans once from the end: a regex would retry each run of dots from every dot, quadratic on dot-heavy titles. */
const trimTrailingDotsAndBlanks = (name: string): string => {
  let end = name.length;
  while (end > 0 && DOT_OR_BLANK.test(name.charAt(end - 1))) end -= 1;
  return name.slice(0, end);
};

const nameOf = (page: PageForExport, untitledLabel: string): string => {
  const written = page.title.trim();
  return written === '' ? untitledLabel : written;
};

/** Accents and spaces stay. A trailing dot or space is trimmed because some systems refuse it. */
const asFileName = (name: string): string => {
  const plain = trimTrailingDotsAndBlanks(
    name.replaceAll(UNSAFE_IN_A_FILE_NAME, ' ').replaceAll(REPEATED_BLANKS, ' ').trim(),
  );
  return plain === '' ? '-' : plain.slice(0, 120);
};

export const writePageAsMarkdownFile = (page: PageForExport, untitledLabel = 'Untitled'): string =>
  [`# ${nameOf(page, untitledLabel)}`, writePageAsMarkdown(page.content)].filter((part) => part !== '').join('\n\n');

/**
 * A page with children becomes both a file and a folder, the layout Markdown
 * tools already expect. Siblings with the same name get a numeric suffix.
 */
export const writePagesAsMarkdownFiles = (
  pages: readonly PageForExport[],
  untitledLabel = 'Untitled',
  whereEachAssetWent: ReadonlyMap<string, string> = new Map(),
): readonly ExportedPageFile[] => {
  const taken = new Set<string>();
  const whereEachPageWent = new Map<string, string>();

  // Paths are settled first so links written later can already point at them.
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
