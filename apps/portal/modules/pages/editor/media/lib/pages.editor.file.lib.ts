import type { PageFileDisplay } from '@company-brain/shared';
import {
  PAGE_EDITOR_DOCUMENT_MIME_TYPE,
  PAGE_EDITOR_DOCUMENT_NAME_ENDING,
  PAGE_EDITOR_FILE_NAME_ENDING,
  PAGE_EDITOR_FILE_SIZE_STEP,
  PAGE_EDITOR_FILE_SIZE_UNITS,
} from '../../blocks/constants/pages.editor.blocks.constants';

/** Formats in the largest fitting unit: 1.2 MB, not 1258291 bytes. */
export const describePageFileSize = (size: number): string => {
  const step = Math.min(
    Math.floor(Math.log(Math.max(size, 1)) / Math.log(PAGE_EDITOR_FILE_SIZE_STEP)),
    PAGE_EDITOR_FILE_SIZE_UNITS.length - 1,
  );
  const scaled = size / PAGE_EDITOR_FILE_SIZE_STEP ** step;
  return `${scaled.toFixed(step === 0 ? 0 : 1)} ${PAGE_EDITOR_FILE_SIZE_UNITS[step] ?? ''}`.trim();
};

/** The name extension wins; the MIME subtype is a fallback because it can read badly (`text/plain` gives PLAIN). */
const describePageFileKind = (name: unknown, mimeType: unknown): string | null => {
  const extension = typeof name === 'string' ? (PAGE_EDITOR_FILE_NAME_ENDING.exec(name)?.[1] ?? null) : null;
  if (extension !== null) return extension.toUpperCase();
  return typeof mimeType === 'string' ? (mimeType.split('/').pop() ?? mimeType).toUpperCase() : null;
};

/** Empty for files saved before kind and size were stored. */
export const describePageFile = (name: unknown, mimeType: unknown, size: unknown): string =>
  [describePageFileKind(name, mimeType), typeof size === 'number' ? describePageFileSize(size) : null]
    .filter((part): part is string => part !== null)
    .join(' · ');

/** The MIME type decides because the browser reads it; the name ending covers files saved without a type. */
export const showsPageFileInPlace = (name: unknown, mimeType: unknown): boolean => {
  if (typeof mimeType === 'string' && mimeType.length > 0)
    return mimeType.toLowerCase() === PAGE_EDITOR_DOCUMENT_MIME_TYPE;
  return typeof name === 'string' && PAGE_EDITOR_DOCUMENT_NAME_ENDING.test(name);
};

/** Defaults to `document` when it can be shown in place. A `document` choice for an undrawable file is ignored. */
export const readPageFileShape = (display: unknown, name: unknown, mimeType: unknown): PageFileDisplay => {
  if (!showsPageFileInPlace(name, mimeType)) return 'line';
  return display === 'line' ? 'line' : 'document';
};
