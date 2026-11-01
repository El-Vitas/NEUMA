import { describe, expect, it } from 'bun:test';
import {
  computeCollaborationReconnectDelayMs,
  getCollaborationStatusLabelKey,
} from '@/modules/pages/lib/pages.collaboration.lib';

describe('pages.collaboration.lib', () => {
  it('maps the channel status to a translated label key', () => {
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
});
