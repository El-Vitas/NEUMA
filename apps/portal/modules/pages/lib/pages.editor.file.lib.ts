import { PAGE_EDITOR_FILE_SIZE_STEP, PAGE_EDITOR_FILE_SIZE_UNITS } from '../constants/pages.editor.blocks.constants';

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
  const extension = typeof name === 'string' ? (/\.([a-z0-9]{1,8})$/i.exec(name)?.[1] ?? null) : null;
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
