import type { PageFileDisplay } from '@company-brain/shared';
import {
  PAGE_EDITOR_DOCUMENT_MIME_TYPE,
  PAGE_EDITOR_DOCUMENT_NAME_ENDING,
  PAGE_EDITOR_FILE_NAME_ENDING,
  PAGE_EDITOR_FILE_SIZE_STEP,
  PAGE_EDITOR_FILE_SIZE_UNITS,
} from '../../blocks/constants/pages.editor.blocks.constants';

/**
 * How heavy a file is, said in the largest unit that still leaves a number a
 * person can hold in their head: 1.2 MB rather than 1 258 291 bytes.
 */
export const describePageFileSize = (size: number): string => {
  const step = Math.min(
    Math.floor(Math.log(Math.max(size, 1)) / Math.log(PAGE_EDITOR_FILE_SIZE_STEP)),
    PAGE_EDITOR_FILE_SIZE_UNITS.length - 1,
  );
  const scaled = size / PAGE_EDITOR_FILE_SIZE_STEP ** step;
  return `${scaled.toFixed(step === 0 ? 0 : 1)} ${PAGE_EDITOR_FILE_SIZE_UNITS[step] ?? ''}`.trim();
};

/**
 * What kind of file it is, in the words people use for it.
 *
 * The end of the name is what anyone recognises — TXT, PDF, DOCX — and the type
 * it was sent as answers only when the name says nothing: `text/plain` read as
 * PLAIN, which names no file anyone has ever saved.
 */
const describePageFileKind = (name: unknown, mimeType: unknown): string | null => {
  const extension = typeof name === 'string' ? (PAGE_EDITOR_FILE_NAME_ENDING.exec(name)?.[1] ?? null) : null;
  if (extension !== null) return extension.toUpperCase();
  return typeof mimeType === 'string' ? (mimeType.split('/').pop() ?? mimeType).toUpperCase() : null;
};

/**
 * The line beside a file's name. A file saved before a page kept its kind and
 * weight says nothing rather than saying something false.
 */
export const describePageFile = (name: unknown, mimeType: unknown, size: unknown): string =>
  [describePageFileKind(name, mimeType), typeof size === 'number' ? describePageFileSize(size) : null]
    .filter((part): part is string => part !== null)
    .join(' · ');

/**
 * Whether the browser can draw this file where it stands.
 *
 * What it was sent as decides, because that is what the browser will read; the
 * end of the name answers only for a file saved before a page kept the kind,
 * which would otherwise never be shown again.
 */
export const showsPageFileInPlace = (name: unknown, mimeType: unknown): boolean => {
  if (typeof mimeType === 'string' && mimeType.length > 0)
    return mimeType.toLowerCase() === PAGE_EDITOR_DOCUMENT_MIME_TYPE;
  return typeof name === 'string' && PAGE_EDITOR_DOCUMENT_NAME_ENDING.test(name);
};

/**
 * How the block is drawn: what was chosen for it, and — until someone chooses —
 * what the file itself suggests, which is to read a document and to keep
 * everything else.
 *
 * A choice to read a file the browser cannot draw is not honoured: the page
 * would show an empty frame where a name and a way down belong.
 */
export const readPageFileShape = (display: unknown, name: unknown, mimeType: unknown): PageFileDisplay => {
  if (!showsPageFileInPlace(name, mimeType)) return 'line';
  return display === 'line' ? 'line' : 'document';
};
