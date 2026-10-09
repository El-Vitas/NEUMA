/** Built from bytes rather than a backend link, because a plain anchor would not carry the session. */
export const downloadExportedFile = (fileName: string, base64: string, mediaType: string): void => {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);

  const address = URL.createObjectURL(new Blob([bytes], { type: mediaType }));
  const anchor = document.createElement('a');
  anchor.href = address;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(address);
};
