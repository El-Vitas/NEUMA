import { Doc, encodeStateAsUpdate } from 'yjs';

export interface SeedMention {
  label: string;
  pageId: string;
}

export type SeedSegment = string | SeedMention;

type RichTextSegment = {
  insert: string | { mention: { label: string; pageId: string; spaceId: string } };
};

/** Fixed, so the state of a seeded text is the same bytes on every run. */
const SEED_YJS_CLIENT_ID = 1;

const isMention = (segment: SeedSegment): segment is SeedMention => typeof segment !== 'string';

export const toRichText = (segments: readonly SeedSegment[], spaceId: string): RichTextSegment[] =>
  segments.map((segment) =>
    isMention(segment) ? { insert: { mention: { ...segment, spaceId } } } : { insert: segment },
  );

export const toPlainText = (segments: readonly SeedSegment[]): string =>
  segments.map((segment) => (isMention(segment) ? segment.label : segment)).join('');

/** The Yjs state the backend stores for a rich text property: the property is a `Y.Text` holding the text. */
export const encodeTextState = (property: string, richText: readonly RichTextSegment[]): Uint8Array => {
  const doc = new Doc();
  doc.clientID = SEED_YJS_CLIENT_ID;
  doc.getText(property).applyDelta([...richText]);
  return encodeStateAsUpdate(doc);
};
