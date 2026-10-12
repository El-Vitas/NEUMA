import { describe, expect, it } from 'bun:test';
import { createCollaborationDocumentName } from '@neuma/shared';
import {
  computeCollaborationReconnectDelayMs,
  getCollaborationStatusLabelKey,
  mapAwarenessStatesToParticipants,
} from '@/modules/pages/lib/pages.collaboration.lib';

describe('pages.collaboration.lib', () => {
  it('creates the gateway document name from a saved page id', () => {
    expect(createCollaborationDocumentName('page-id')).toBe('page:page-id');
  });

  it('maps provider status to a translated label key', () => {
    expect(getCollaborationStatusLabelKey('connecting')).toBe('collaboration.connecting');
    expect(getCollaborationStatusLabelKey('connected')).toBe('collaboration.connected');
    expect(getCollaborationStatusLabelKey('reconnecting')).toBe('collaboration.reconnecting');
    expect(getCollaborationStatusLabelKey('disconnected')).toBe('collaboration.disconnected');
    expect(getCollaborationStatusLabelKey('error')).toBe('collaboration.error');
    expect(getCollaborationStatusLabelKey('exhausted')).toBe('collaboration.exhausted');
  });

  it('grows the reconnect delay exponentially up to a capped maximum', () => {
    expect(computeCollaborationReconnectDelayMs(1)).toBe(1000);
    expect(computeCollaborationReconnectDelayMs(2)).toBe(2000);
    expect(computeCollaborationReconnectDelayMs(3)).toBe(4000);
    expect(computeCollaborationReconnectDelayMs(4)).toBe(8000);
    expect(computeCollaborationReconnectDelayMs(5)).toBe(16_000);
    expect(computeCollaborationReconnectDelayMs(6)).toBe(16_000);
  });

  it('maps remote awareness states to participants and excludes the local client', () => {
    const states = [
      { clientId: 1, cursor: { anchor: 1 }, user: { color: '#ff0000', name: 'Alice' } },
      { clientId: 2, cursor: null, user: { name: 'Bob' } },
      { clientId: 3 },
    ];

    const participants = mapAwarenessStatesToParticipants(states, 3);

    expect(participants).toEqual([
      { clientId: 1, color: '#ff0000', cursor: { anchor: 1 }, name: 'Alice' },
      { clientId: 2, color: null, cursor: null, name: 'Bob' },
    ]);
  });

  it('falls back to an empty name and no color when the user field is missing or malformed', () => {
    const states = [{ clientId: 5, user: 'not-an-object' }];

    expect(mapAwarenessStatesToParticipants(states, 1)).toEqual([{ clientId: 5, color: null, cursor: null, name: '' }]);
  });
});
