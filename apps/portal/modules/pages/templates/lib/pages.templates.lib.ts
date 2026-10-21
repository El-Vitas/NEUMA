import { PAGE_PROPERTY_TYPE, type PagePropertyType } from '@neuma/shared';
import type { PageTemplateListing, PageTemplateWord } from '../types/pages.templates.types';

/** The title a new row starts with: the template names it, and a blank row needs a name to be accepted. */
export const readNewRowTitle = (
  listing: PageTemplateListing,
  templateId: null | string | undefined,
  untitled: string,
): string => {
  if (typeof templateId === 'string') return '';
  if (templateId === undefined && listing.defaultTemplateId !== null) return '';
  return untitled;
};

/** A button row takes the title its button wrote; with none, the template names it, or it stays untitled. */
export const readButtonRowTitle = (
  written: string,
  templateId: null | string,
  listing: PageTemplateListing | null,
  untitled: string,
): string => {
  if (written !== '') return written;
  const hasTemplate = templateId !== null || (listing !== null && listing.defaultTemplateId !== null);
  return hasTemplate ? '' : untitled;
};

/** Today fits a date and the creator fits a person: the only two words a template can leave in a column. */
export const readTemplateWordFor = (type: PagePropertyType): PageTemplateWord | null => {
  if (type === PAGE_PROPERTY_TYPE.DATE) return '@today';
  return type === PAGE_PROPERTY_TYPE.PERSON ? '@me' : null;
};

/** The variables with one column set to its word, or without it when the word is taken away. */
export const toggleTemplateVariable = (
  variables: Readonly<Record<string, PageTemplateWord>>,
  key: string,
  word: PageTemplateWord | null,
): Record<string, PageTemplateWord> => {
  const rest = Object.fromEntries(Object.entries(variables).filter(([candidate]) => candidate !== key));
  return word === null ? rest : { ...rest, [key]: word };
};
