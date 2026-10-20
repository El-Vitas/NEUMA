import { describe, expect, it } from 'bun:test';
import { buildBlockLiveUrl } from '@/modules/pages/block-sync/lib/block-sync.url.lib';

describe('buildBlockLiveUrl', () => {
  it('serves the block socket next to the collaboration one', () => {
    expect(buildBlockLiveUrl('ws://localhost:3000/api/v1/collaboration')).toBe(
      'ws://localhost:3000/api/v1/blocks/live',
    );
  });

  it('keeps the host and scheme the portal was built with', () => {
    expect(buildBlockLiveUrl('wss://neuma.example.com/api/v1/collaboration/')).toBe(
      'wss://neuma.example.com/api/v1/blocks/live',
    );
  });
});
