import type { CollaborationPresenceIdentity } from './collaboration-presence.types.js';

export const COLLABORATION_DOCUMENT_PREFIX = 'page:';
/** Fragment of the collaborative document holding the page text, shared by editor and server. */
export const COLLABORATION_DOCUMENT_FRAGMENT = 'prosemirror';
export const MAX_COLLABORATION_DISPLAY_NAME_LENGTH = 80;

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

const isHexColor = (value: unknown): value is string => typeof value === 'string' && hexColorPattern.test(value);

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

export const createCollaborationDocumentName = (pageId: string): string => `${COLLABORATION_DOCUMENT_PREFIX}${pageId}`;

export const sanitizeCollaborationPresenceIdentity = (value: unknown): CollaborationPresenceIdentity => {
  const candidate = asRecord(value);
  const rawName = typeof candidate.name === 'string' ? candidate.name : '';
  const name = rawName.trim().slice(0, MAX_COLLABORATION_DISPLAY_NAME_LENGTH);
  const color = isHexColor(candidate.color) ? candidate.color : null;
  return { color, name };
};
