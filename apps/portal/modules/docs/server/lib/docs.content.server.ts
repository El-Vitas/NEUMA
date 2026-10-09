import 'server-only';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DOCS_CONTENT_FOLDER,
  DOCS_FALLBACK_LOCALE,
  DOCS_FILE_SUFFIX,
  DOCS_NOT_WRITTEN_CODE,
  DOCS_SLUG_SHAPE,
} from '../../constants/docs.reading.constants';
import { readDocsFrontMatter, readDocsMarkdown } from '../../lib/docs.front-matter.lib';
import type { DocsDocument, DocsEntry } from '../../types/docs.types';

const folderOf = (locale: string): string => join(process.cwd(), DOCS_CONTENT_FOLDER, locale);

/** A document or a language nobody wrote is expected; anything else that fails reading them is not, and is let through. */
const isNotWritten = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === DOCS_NOT_WRITTEN_CODE;

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
  } catch (error) {
    if (isNotWritten(error)) return null;
    throw error;
  }
};

const readNames = async (locale: string): Promise<readonly string[]> => {
  try {
    const files = await readdir(folderOf(locale));
    return files
      .filter((file) => file.endsWith(DOCS_FILE_SUFFIX))
      .map((file) => file.slice(0, -DOCS_FILE_SUFFIX.length));
  } catch (error) {
    if (isNotWritten(error)) return [];
    throw error;
  }
};

/** Everything there is to read, in the order the documents themselves ask for. */
export const readDocsEntries = async (locale: string): Promise<readonly DocsEntry[]> => {
  const [own, fallback] = await Promise.all([readNames(locale), readNames(DOCS_FALLBACK_LOCALE)]);
  const names = new Set([...own, ...fallback]);
  const written = await Promise.all([...names].map((slug) => readDocsDocument(locale, slug)));
  return written
    .filter((document): document is DocsDocument => document !== null)
    .map(({ markdown: _markdown, ...entry }) => entry)
    .sort((one, other) => one.order - other.order || one.title.localeCompare(other.title));
};

/** One document, read in the language asked for and otherwise in the one it was written in. */
export const readDocsDocument = async (locale: string, slug: string): Promise<DocsDocument | null> => {
  if (!DOCS_SLUG_SHAPE.test(slug)) return null;
  const file = (await readWritten(locale, slug)) ?? (await readWritten(DOCS_FALLBACK_LOCALE, slug));
  if (file === null) return null;
  return { ...readDocsFrontMatter(file), markdown: readDocsMarkdown(file), slug };
};
