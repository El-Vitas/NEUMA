import { PAGES_EXPORT_MEDIA_TYPE } from '../constants/pages.export.constants';

/**
 * Hands the written file to the browser so it lands on the reader's disk.
 *
 * The file is built here rather than served from a link because the request
 * carries the session, and an anchor pointing at the backend would travel
 * without it.
 */
export const downloadMarkdownFile = (fileName: string, markdown: string): void => {
  const address = URL.createObjectURL(new Blob([markdown], { type: PAGES_EXPORT_MEDIA_TYPE }));
  const anchor = document.createElement('a');
  anchor.href = address;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(address);
};
