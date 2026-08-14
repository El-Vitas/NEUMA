import 'server-only';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DOCS_CONTENT_FOLDER, DOCS_FALLBACK_LOCALE, DOCS_FILE_SUFFIX } from '../../constants/docs.reading.constants';
import { readDocsFrontMatter, readDocsMarkdown } from '../../lib/docs.front-matter.lib';
import type { DocsDocument, DocsEntry } from '../../types/docs.types';

const folderOf = (locale: string): string => join(process.cwd(), DOCS_CONTENT_FOLDER, locale);

/**
 * Reads a document as it was written, or nothing when nobody wrote it.
 *
 * A document not written in the language being read is read in the language the
 * manual is kept in: half a manual in the reader's language and half of it
 * missing is worse than a manual in one language.
 */
const readWritten = async (locale: string, slug: string): Promise<string | null> => {
  try {
    return await readFile(join(folderOf(locale), `${slug}${DOCS_FILE_SUFFIX}`), 'utf8');
  } catch {
    return null;
  }
};

const readNames = async (locale: string): Promise<readonly string[]> => {
  try {
    const files = await readdir(folderOf(locale));
    return files
      .filter((file) => file.endsWith(DOCS_FILE_SUFFIX))
      .map((file) => file.slice(0, -DOCS_FILE_SUFFIX.length));
  } catch {
    return [];
  }
};

/** Everything there is to read, in the order the documents themselves ask for. */
export const readDocsEntries = async (locale: string): Promise<readonly DocsEntry[]> => {
  const names = new Set([...(await readNames(locale)), ...(await readNames(DOCS_FALLBACK_LOCALE))]);
  const written = await Promise.all([...names].map((slug) => readDocsDocument(locale, slug)));
  return written
    .filter((document): document is DocsDocument => document !== null)
    .map(({ markdown: _markdown, ...entry }) => entry)
    .sort((one, other) => one.order - other.order || one.title.localeCompare(other.title));
};

/** One document, read in the language asked for and otherwise in the one it was written in. */
export const readDocsDocument = async (locale: string, slug: string): Promise<DocsDocument | null> => {
  const file = (await readWritten(locale, slug)) ?? (await readWritten(DOCS_FALLBACK_LOCALE, slug));
  if (file === null) return null;
  return { ...readDocsFrontMatter(file), markdown: readDocsMarkdown(file), slug };
};
