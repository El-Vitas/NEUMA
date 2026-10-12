import {
  COLLABORATION_DOCUMENT_PREFIX,
  type CollaborationPresenceState,
  sanitizeCollaborationPresenceIdentity,
} from '@neuma/shared';
import { UUID_PATTERN } from '../../common/constants/validation.constants';
import {
  MAX_COLLABORATION_AWARENESS_STATE_BYTES,
  MAX_COLLABORATION_DOCUMENT_NAME_LENGTH,
  MAX_COLLABORATION_STATE_BYTES,
  MAX_COLLABORATION_UPDATE_BYTES,
} from './constants/collaboration.constants';

export const parsePageId = (documentName: string): string => {
  if (
    documentName.length > MAX_COLLABORATION_DOCUMENT_NAME_LENGTH ||
    !documentName.startsWith(COLLABORATION_DOCUMENT_PREFIX)
  ) {
    throw new Error('invalid-document-name');
  }

  const pageId = documentName.slice(COLLABORATION_DOCUMENT_PREFIX.length);
  if (!UUID_PATTERN.test(pageId)) throw new Error('invalid-document-name');
  return pageId;
};

export const assertByteLength = (value: Uint8Array, maximum: number, errorCode: string): void => {
  if (value.byteLength > maximum) throw new Error(errorCode);
};

export const assertUpdateSize = (update: Uint8Array): Promise<void> => {
  try {
    assertByteLength(update, MAX_COLLABORATION_UPDATE_BYTES, 'update-too-large');
    return Promise.resolve();
  } catch {
    return Promise.reject(new Error('update-too-large'));
  }
};

export const assertStateSize = (state: Uint8Array): Promise<void> => {
  try {
    assertByteLength(state, MAX_COLLABORATION_STATE_BYTES, 'state-too-large');
    return Promise.resolve();
  } catch {
    return Promise.reject(new Error('state-too-large'));
  }
};

export const sanitizePresenceState = (state: Record<string, unknown> | undefined): CollaborationPresenceState => ({
  cursor: state?.cursor ?? null,
  user: sanitizeCollaborationPresenceIdentity(state?.user),
});

export const assertAwarenessStateSize = (state: unknown): Promise<void> => {
  try {
    const encoded = new TextEncoder().encode(JSON.stringify(state ?? {}));
    assertByteLength(encoded, MAX_COLLABORATION_AWARENESS_STATE_BYTES, 'awareness-payload-too-large');
    return Promise.resolve();
  } catch {
    return Promise.reject(new Error('awareness-payload-too-large'));
  }
};
