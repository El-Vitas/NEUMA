import { DOCS_FRONT_MATTER_FENCE, DOCS_FRONT_MATTER_LINE, DOCS_LAST_ORDER } from '../constants/docs.reading.constants';
import type { DocsFrontMatter } from '../types/docs.types';

const readValue = (said: string): string => said.trim().replaceAll(/^["']|["']$/g, '');

/** Reads only title, summary and order; any other key is ignored. */
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

export const readDocsMarkdown = (file: string): string => file.replace(DOCS_FRONT_MATTER_FENCE, '').trimStart();
