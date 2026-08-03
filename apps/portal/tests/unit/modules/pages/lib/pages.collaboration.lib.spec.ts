import { describe, expect, it } from 'bun:test';
import {
  createCollaborationDocumentName,
  createCollaborationWebSocketUrl,
  getCollaborationStatusLabelKey,
} from '@/modules/pages/lib/pages.collaboration.lib';

describe('pages.collaboration.lib', () => {
  it('creates the gateway document name from a saved page id', () => {
    expect(createCollaborationDocumentName('page-id')).toBe('page:page-id');
  });

  it('uses the configured websocket URL without applying the locale prefix', () => {
    expect(createCollaborationWebSocketUrl('ws://localhost:3000/api/v1/collaboration')).toBe(
      'ws://localhost:3000/api/v1/collaboration',
    );
  });

  it('maps provider status to a translated label key', () => {
    expect(getCollaborationStatusLabelKey('connecting')).toBe('collaboration.connecting');
    expect(getCollaborationStatusLabelKey('connected')).toBe('collaboration.connected');
    expect(getCollaborationStatusLabelKey('reconnecting')).toBe('collaboration.reconnecting');
    expect(getCollaborationStatusLabelKey('disconnected')).toBe('collaboration.disconnected');
    expect(getCollaborationStatusLabelKey('error')).toBe('collaboration.error');
  });
});
