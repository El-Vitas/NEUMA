/** A mention as the writer leaves it: the space it lived in, and the page it named. */
const A_MENTION = /\]\(\/spaces\/[^/)]+\/pages\/([^)]+)\)/g;

/** Something hung on the page, named by the identifier the store keeps it under. */
const A_HUNG_FILE = /(!\[[^\]]*\]|\])\(([0-9a-f-]{16,})\)/g;

/** A block that shows an attached file, opened with the identifier the store keeps it under. */
const A_FILE_BLOCK = /(:::file\{[^}]*assetId="([0-9a-f-]{16,})"[^}]*)\}/g;

/**
 * The way from one exported file to another.
 *
 * Written as a relative path, which is what makes an archive work wherever it
 * is unpacked: nothing inside it knows where it will land, and nothing needs to.
 */
export const pathBetweenExportedFiles = (fromPath: string, toPath: string): string => {
  const from = fromPath.split('/').slice(0, -1);
  const to = toPath.split('/');
  let shared = 0;
  while (shared < from.length && shared < to.length - 1 && from[shared] === to[shared]) shared += 1;

  const climb = Array.from({ length: from.length - shared }, () => '..');
  return [...climb, ...to.slice(shared)].map((part) => encodeURIComponent(part)).join('/');
};

/**
 * Points what a page says at what actually travelled with it.
 *
 * A mention to a page that came along becomes the file that page became, so
 * opening the archive and following a link lands somewhere real. A mention to a
 * page that stayed behind is left exactly as it was: pointing at a file that is
 * not in the archive would be a lie, and the address it already carries is at
 * least true.
 *
 * A block that shows an attached file keeps the identifier it already had and
 * gains the place the file landed beside it, so the archive can be opened by a
 * person and still read back whole by the program that wrote it.
 */
export const pointAtExportedFiles = (
  written: string,
  fromPath: string,
  whereEachPageWent: ReadonlyMap<string, string>,
  whereEachAssetWent: ReadonlyMap<string, string>,
): string =>
  written
    .replaceAll(A_MENTION, (whole, pageId: string) => {
      const landed = whereEachPageWent.get(pageId);
      return landed === undefined ? whole : `](${pathBetweenExportedFiles(fromPath, landed)})`;
    })
    .replaceAll(A_HUNG_FILE, (whole, opening: string, assetId: string) => {
      const landed = whereEachAssetWent.get(assetId);
      return landed === undefined ? whole : `${opening}(${pathBetweenExportedFiles(fromPath, landed)})`;
    })
    .replaceAll(A_FILE_BLOCK, (whole, opening: string, assetId: string) => {
      const landed = whereEachAssetWent.get(assetId);
      return landed === undefined ? whole : `${opening} path="${pathBetweenExportedFiles(fromPath, landed)}"}`;
    });
