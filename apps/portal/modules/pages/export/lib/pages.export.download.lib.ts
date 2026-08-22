/**
 * Hands the file to the browser so it lands on the reader's disk.
 *
 * The bytes are built here rather than served from a link because the request
 * carries the session, and an anchor pointing at the backend would travel
 * without it.
 */
export const downloadExportedFile = (fileName: string, base64: string, mediaType: string): void => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at);

  const address = URL.createObjectURL(new Blob([bytes], { type: mediaType }));
  const anchor = document.createElement('a');
  anchor.href = address;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(address);
};
