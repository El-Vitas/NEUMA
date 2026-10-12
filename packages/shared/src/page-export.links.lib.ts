const A_MENTION = /\]\(\/spaces\/[^/)]+\/pages\/([^)]+)\)/g;

/** An image or link whose target is a store identifier. */
const A_HUNG_FILE = /(!\[[^\]]*\]|\])\(([0-9a-f-]{16,})\)/g;

const A_FILE_BLOCK = /(:::file\{[^}]*assetId="([0-9a-f-]{16,})"[^}]*)\}/g;

/** Relative, so the archive works wherever it is unpacked. */
export const pathBetweenExportedFiles = (fromPath: string, toPath: string): string => {
  const from = fromPath.split('/').slice(0, -1);
  const to = toPath.split('/');
  let shared = 0;
  while (shared < from.length && shared < to.length - 1 && from[shared] === to[shared]) shared += 1;

  const climb = Array.from({ length: from.length - shared }, () => '..');
  return [...climb, ...to.slice(shared)].map((part) => encodeURIComponent(part)).join('/');
};

/**
 * Mentions of exported pages become relative file links; mentions of pages not in
 * the archive are left untouched. File blocks keep their asset id and gain the
 * exported path, so the archive stays readable by people and by the importer.
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
