import { describe, expect, it } from 'bun:test';
import { buildDatabaseName, listForeignDatabaseNames } from '@/modules/pages/local-cache/lib/local-cache.database.lib';

describe('buildDatabaseName', () => {
  it('is one database per person', () => {
    expect(buildDatabaseName('user-1')).toBe('neuma-cache:user-1');
  });
});

describe('listForeignDatabaseNames', () => {
  it('lists the cache databases of anyone else and leaves the rest alone', () => {
    const current = buildDatabaseName('user-1');
    const names = [current, 'neuma-cache:user-2', 'neuma-cache:user-3', 'other-app'];
    expect(listForeignDatabaseNames(names, current)).toEqual(['neuma-cache:user-2', 'neuma-cache:user-3']);
  });

  it('lists nothing when only the current one exists', () => {
    const current = buildDatabaseName('u');
    expect(listForeignDatabaseNames([current], current)).toEqual([]);
  });
});
