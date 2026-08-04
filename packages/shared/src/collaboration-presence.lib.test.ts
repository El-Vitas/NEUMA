import { describe, expect, test } from 'bun:test';
import {
  COLLABORATION_DOCUMENT_PREFIX,
  createCollaborationDocumentName,
  MAX_COLLABORATION_DISPLAY_NAME_LENGTH,
  sanitizeCollaborationPresenceIdentity,
} from './collaboration-presence.lib.js';

describe('createCollaborationDocumentName', () => {
  test('prefixes the page id with the collaboration document prefix', () => {
    expect(createCollaborationDocumentName('page-id')).toBe(`${COLLABORATION_DOCUMENT_PREFIX}page-id`);
  });
});

describe('sanitizeCollaborationPresenceIdentity', () => {
  test('trims the name and keeps a valid hex color', () => {
    expect(sanitizeCollaborationPresenceIdentity({ color: '#ff00aa', name: '  Alice  ' })).toEqual({
      color: '#ff00aa',
      name: 'Alice',
    });
  });

  test('drops an unsafe color and falls back to null', () => {
    expect(sanitizeCollaborationPresenceIdentity({ color: 'javascript:alert(1)', name: 'Alice' })).toEqual({
      color: null,
      name: 'Alice',
    });
  });

  test('caps the name length at the maximum display name length', () => {
    const longName = 'x'.repeat(MAX_COLLABORATION_DISPLAY_NAME_LENGTH + 10);

    expect(sanitizeCollaborationPresenceIdentity({ name: longName }).name).toHaveLength(
      MAX_COLLABORATION_DISPLAY_NAME_LENGTH,
    );
  });

  test('falls back to an empty name and no color when the value is not an object', () => {
    expect(sanitizeCollaborationPresenceIdentity('not-an-object')).toEqual({ color: null, name: '' });
  });
});
