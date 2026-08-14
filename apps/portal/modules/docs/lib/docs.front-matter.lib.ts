import { DOCS_FRONT_MATTER_FENCE, DOCS_FRONT_MATTER_LINE, DOCS_LAST_ORDER } from '../constants/docs.reading.constants';
import type { DocsFrontMatter } from '../types/docs.types';

const readValue = (said: string): string => said.trim().replace(/^["']|["']$/g, '');

/**
 * What a document says about itself, written at the top of its own file.
 *
 * Three things are asked of it — what it is called, what it answers and where
 * it goes in the list — and nothing else is read, so that writing a document
 * stays writing and never becomes filling in a form.
 */
export const readDocsFrontMatter = (file: string): DocsFrontMatter => {
  const fenced = DOCS_FRONT_MATTER_FENCE.exec(file)?.[1] ?? '';
  const said: Record<string, string> = {};
  for (const line of fenced.split('\n')) {
    const named = DOCS_FRONT_MATTER_LINE.exec(line);
    if (named?.[1] === undefined || named[2] === undefined) continue;
    said[named[1].trim()] = readValue(named[2]);
  }
  const order = Number(said.order);
  return {
    order: Number.isFinite(order) ? order : DOCS_LAST_ORDER,
    summary: said.summary ?? '',
    title: said.title ?? '',
  };
};

/** Everything the document says, which is the file without what it says about itself. */
export const readDocsMarkdown = (file: string): string => file.replace(DOCS_FRONT_MATTER_FENCE, '').trimStart();
