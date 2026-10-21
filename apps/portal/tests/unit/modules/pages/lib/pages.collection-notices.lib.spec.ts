import { describe, expect, it } from 'bun:test';
import type { BlockCollectionMessage } from '@/modules/pages/block-sync/types/block-sync.types';
import { routeCollectionMessage } from '@/modules/pages/collections/lib/pages.collection-live.lib';

const changes: BlockCollectionMessage = {
  collectionId: 'c1',
  rows: [{ id: 'a', version: 2 }],
  type: 'collection-changes',
  views: [],
};

describe('routeCollectionMessage', () => {
  it('lets a view that follows changes place them', () => {
    expect(routeCollectionMessage(changes, true)).toBe('follow');
  });

  it('draws the page again when no view follows changes', () => {
    expect(routeCollectionMessage(changes, false)).toBe('refresh');
  });

  it('draws the page again when the server could not describe the change', () => {
    expect(routeCollectionMessage({ collectionId: 'c1', type: 'collection-resync' }, true)).toBe('refresh');
  });

  it('draws the page again when the reader lost the collection', () => {
    expect(routeCollectionMessage({ collectionId: 'c1', type: 'collection-revoked' }, true)).toBe('refresh');
  });
});
