const MENTION_MARKER = '](/spaces/';

const MENTION_PAGES_SEGMENT = '/pages/';

const HUNG_FILE_MARKER = '](';

const FILE_BLOCK_MARKER = ':::file{';

const ASSET_ID_MARKER = 'assetId="';

const MINIMUM_ASSET_ID_LENGTH = 16;

const ASSET_ID_CHARACTER = /^[0-9a-f-]$/;

interface IRewrite {
  /** Index right after the text this attempt consumed. */
  end: number;
  /** `null` when the marker was not a real match and the text stays as it is. */
  replacement: string | null;
}

type ReadAt = (written: string, start: number) => IRewrite;

const leaveAlone = (start: number): IRewrite => ({ end: start + 1, replacement: null });

/**
 * Pages are written verbatim inside code, so these scans must stay linear: a
 * regex that restarts at every marker is cubic on a block full of them.
 */
const rewriteMarked = (written: string, marker: string, readAt: ReadAt): string => {
  const pieces: string[] = [];
  let copiedUntil = 0;
  let start = written.indexOf(marker);
  while (start !== -1) {
    const attempt = readAt(written, start);
    if (attempt.replacement === null) {
      start = written.indexOf(marker, Math.max(attempt.end, start + 1));
      continue;
    }
    pieces.push(written.slice(copiedUntil, start), attempt.replacement);
    copiedUntil = attempt.end;
    start = written.indexOf(marker, attempt.end);
  }
  pieces.push(written.slice(copiedUntil));
  return pieces.join('');
};

/** Callers ask with growing positions, so one answer serves every later question. */
const createCharacterFinder = (written: string, character: string): ((from: number) => number) => {
  let found = -2;
  return (from) => {
    if (found === -1 || found >= from) return found;
    found = written.indexOf(character, from);
    return found;
  };
};

const readAssetIdRun = (text: string, from: number): string => {
  let end = from;
  while (end < text.length && ASSET_ID_CHARACTER.test(text.charAt(end))) end += 1;
  return text.slice(from, end);
};

/** Relative, so the archive works wherever it is unpacked. */
export const pathBetweenExportedFiles = (fromPath: string, toPath: string): string => {
  const from = fromPath.split('/').slice(0, -1);
  const to = toPath.split('/');
  let shared = 0;
  while (shared < from.length && shared < to.length - 1 && from[shared] === to[shared]) shared += 1;

  const climb = Array.from({ length: from.length - shared }, () => '..');
  return [...climb, ...to.slice(shared)].map((part) => encodeURIComponent(part)).join('/');
};

const rewriteMentions = (written: string, fromPath: string, whereEachPageWent: ReadonlyMap<string, string>): string => {
  const findClose = createCharacterFinder(written, ')');
  return rewriteMarked(written, MENTION_MARKER, (text, start) => {
    const spaceStart = start + MENTION_MARKER.length;
    let spaceEnd = spaceStart;
    while (spaceEnd < text.length && text.charAt(spaceEnd) !== '/' && text.charAt(spaceEnd) !== ')') spaceEnd += 1;
    if (spaceEnd === spaceStart || !text.startsWith(MENTION_PAGES_SEGMENT, spaceEnd)) return leaveAlone(start);
    const pageStart = spaceEnd + MENTION_PAGES_SEGMENT.length;
    const close = findClose(pageStart);
    if (close === -1) return { end: text.length, replacement: null };
    if (close === pageStart) return leaveAlone(start);
    const landed = whereEachPageWent.get(text.slice(pageStart, close));
    const whole = text.slice(start, close + 1);
    const replacement = landed === undefined ? whole : `](${pathBetweenExportedFiles(fromPath, landed)})`;
    return { end: close + 1, replacement };
  });
};

/** An image or link whose target is a store identifier. */
const rewriteHungFiles = (written: string, fromPath: string, whereEachAssetWent: ReadonlyMap<string, string>): string =>
  rewriteMarked(written, HUNG_FILE_MARKER, (text, start) => {
    const idStart = start + HUNG_FILE_MARKER.length;
    const assetId = readAssetIdRun(text, idStart);
    const idEnd = idStart + assetId.length;
    if (assetId.length < MINIMUM_ASSET_ID_LENGTH || text.charAt(idEnd) !== ')') return leaveAlone(start);
    const landed = whereEachAssetWent.get(assetId);
    const replacement =
      landed === undefined ? text.slice(start, idEnd + 1) : `](${pathBetweenExportedFiles(fromPath, landed)})`;
    return { end: idEnd + 1, replacement };
  });

const findFileBlockAssetId = (directive: string): string | null => {
  let marker = directive.indexOf(ASSET_ID_MARKER);
  while (marker !== -1) {
    const idStart = marker + ASSET_ID_MARKER.length;
    const assetId = readAssetIdRun(directive, idStart);
    if (assetId.length >= MINIMUM_ASSET_ID_LENGTH && directive.charAt(idStart + assetId.length) === '"') {
      return assetId;
    }
    marker = directive.indexOf(ASSET_ID_MARKER, idStart);
  }
  return null;
};

const rewriteFileBlocks = (
  written: string,
  fromPath: string,
  whereEachAssetWent: ReadonlyMap<string, string>,
): string => {
  const findClose = createCharacterFinder(written, '}');
  return rewriteMarked(written, FILE_BLOCK_MARKER, (text, start) => {
    const bodyStart = start + FILE_BLOCK_MARKER.length;
    const close = findClose(bodyStart);
    if (close === -1) return { end: text.length, replacement: null };
    const assetId = findFileBlockAssetId(text.slice(bodyStart, close));
    if (assetId === null) return { end: close, replacement: null };
    const landed = whereEachAssetWent.get(assetId);
    const opening = text.slice(start, close);
    const replacement =
      landed === undefined ? `${opening}}` : `${opening} path="${pathBetweenExportedFiles(fromPath, landed)}"}`;
    return { end: close + 1, replacement };
  });
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
  rewriteFileBlocks(
    rewriteHungFiles(rewriteMentions(written, fromPath, whereEachPageWent), fromPath, whereEachAssetWent),
    fromPath,
    whereEachAssetWent,
  );
