import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { planRelationChanges } from '@/modules/pages/domain/page-relation-schema.domain';

const property = (changes: Partial<SchemaPropertyDefinition> & Pick<SchemaPropertyDefinition, 'key' | 'type'>) => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  label: changes.key,
  options: null,
  required: false,
  ...changes,
});

const relation = (key: string, targetCollectionId: string, mirrorPropertyKey: string | null = null) =>
  property({
    config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, mirrorPropertyKey, targetCollectionId },
    key,
    type: DatabasePropertyType.RELATION,
  });

const title = property({ key: 'title', required: true, type: DatabasePropertyType.TITLE });

const base = {
  collectionTitle: 'Tasks',
  pageId: 'tasks',
  targetSchemas: new Map<string, readonly SchemaPropertyDefinition[]>([['projects', [title]]]),
  twoWayKeys: new Set<string>(),
};

describe('planRelationChanges', () => {
  it('leaves a schema without relations as it is', () => {
    const plan = planRelationChanges({ ...base, definitions: [title], stored: [title] });

    expect(plan.isOk()).toBe(true);
    expect(plan.getValue().sideEffects).toEqual({ mirrorsToCreate: [], mirrorsToUnlink: [] });
  });

  it('adds a one-way relation with no side effect on the other collection', () => {
    const plan = planRelationChanges({
      ...base,
      definitions: [title, relation('project', 'projects')],
      stored: [title],
    });

    expect(plan.getValue().sideEffects.mirrorsToCreate).toEqual([]);
    expect(plan.getValue().definitions[1]?.config.mirrorPropertyKey).toBeNull();
  });

  it('adds the mirror to the other collection when the relation asks to go both ways', () => {
    const plan = planRelationChanges({
      ...base,
      definitions: [title, relation('project', 'projects')],
      stored: [title],
      twoWayKeys: new Set(['project']),
    });

    expect(plan.getValue().sideEffects.mirrorsToCreate).toEqual([
      { key: 'tasks', label: 'Tasks', mirrorOfKey: 'project', targetCollectionId: 'projects' },
    ]);
    expect(plan.getValue().definitions[1]?.config.mirrorPropertyKey).toBe('tasks');
  });

  it('does not take a key the other collection already uses for its mirror', () => {
    const plan = planRelationChanges({
      ...base,
      definitions: [title, relation('project', 'projects')],
      stored: [title],
      targetSchemas: new Map([['projects', [title, property({ key: 'tasks', type: DatabasePropertyType.RICH_TEXT })]]]),
      twoWayKeys: new Set(['project']),
    });

    expect(plan.getValue().sideEffects.mirrorsToCreate[0]?.key).toBe('tasks_2');
  });

  it('refuses a relation to a collection it cannot read or that is not one', () => {
    const plan = planRelationChanges({
      ...base,
      definitions: [title, relation('project', 'elsewhere')],
      stored: [title],
    });

    expect(plan.isFail()).toBe(true);
  });

  it('refuses a mirror key the caller made up, because the server decides which property mirrors another', () => {
    const plan = planRelationChanges({
      ...base,
      definitions: [title, relation('project', 'projects', 'secret')],
      stored: [title],
    });

    expect(plan.isFail()).toBe(true);
  });

  it('keeps the mirror of a relation that was already saved', () => {
    const stored = [title, relation('project', 'projects', 'tasks')];

    const plan = planRelationChanges({ ...base, definitions: stored, stored });

    expect(plan.isOk()).toBe(true);
    expect(plan.getValue().sideEffects).toEqual({ mirrorsToCreate: [], mirrorsToUnlink: [] });
  });

  it('refuses to point a saved relation at another collection', () => {
    const stored = [title, relation('project', 'projects')];

    const plan = planRelationChanges({
      ...base,
      definitions: [title, relation('project', 'other')],
      stored,
      targetSchemas: new Map([
        ['projects', [title]],
        ['other', [title]],
      ]),
    });

    expect(plan.isFail()).toBe(true);
  });

  it('lets the other collection go one-way when a two-way relation is removed', () => {
    const stored = [title, relation('project', 'projects', 'tasks')];

    const plan = planRelationChanges({ ...base, definitions: [title], stored });

    expect(plan.getValue().sideEffects.mirrorsToUnlink).toEqual([{ collectionId: 'projects', key: 'tasks' }]);
  });

  it('allows a relation to the collection itself, with a mirror of another key', () => {
    const plan = planRelationChanges({
      ...base,
      definitions: [title, relation('parent', 'tasks')],
      stored: [title],
      targetSchemas: new Map([['tasks', [title]]]),
      twoWayKeys: new Set(['parent']),
    });

    expect(plan.getValue().sideEffects.mirrorsToCreate[0]).toMatchObject({ key: 'tasks', targetCollectionId: 'tasks' });
    expect(plan.getValue().definitions[1]?.config.mirrorPropertyKey).toBe('tasks');
  });
});
