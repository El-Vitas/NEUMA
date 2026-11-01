import { describe, expect, it } from 'bun:test';
import { planBlockTransaction } from '@/modules/blocks/domain/block.transaction.domain';
import type {
  BlockOperation,
  BlockTransactionInput,
  RelationProperty,
} from '@/modules/blocks/domain/block.transaction.domain.types';
import { blockTextEngine } from '@/modules/blocks/utils/block.text.utils';
import { buildBlock, buildInput, buildPage } from '../block.test-data';

const plan = (input: BlockTransactionInput) => planBlockTransaction(input, blockTextEngine);

const plannedOf = (input: BlockTransactionInput) => {
  const planned = plan(input);
  if (planned.isFail()) throw planned.getError();
  return planned.getValue();
};

const refusalOf = (input: BlockTransactionInput): { code: string; details: unknown } => {
  const planned = plan(input);
  if (planned.isOk()) throw new Error('Expected the transaction to be refused');
  return { code: planned.getError().code, details: planned.getError().details };
};

const tasksCollection = buildPage({ children: ['task-1', 'task-2'], id: 'tasks' });
const projectsCollection = buildPage({ children: ['project-1', 'project-2'], id: 'projects' });
const task = (id: string, values: Record<string, unknown> = {}) =>
  buildPage({ id, parentId: 'tasks', properties: { title: [], values } });
const project = (id: string, values: Record<string, unknown> = {}, overrides = {}) =>
  buildPage({ id, parentId: 'projects', properties: { title: [], values }, ...overrides });

const twoWay: ReadonlyMap<string, readonly RelationProperty[]> = new Map([
  ['tasks', [{ key: 'project', mirrorPropertyKey: 'tasks', targetCollectionId: 'projects' }]],
  ['projects', [{ key: 'tasks', mirrorPropertyKey: 'project', targetCollectionId: 'tasks' }]],
]);

const oneWay: ReadonlyMap<string, readonly RelationProperty[]> = new Map([
  ['tasks', [{ key: 'project', mirrorPropertyKey: null, targetCollectionId: 'projects' }]],
]);

const add = (
  blockId: string,
  targetId: string,
  property = 'project',
  afterId: string | null = null,
): BlockOperation => ({
  afterId,
  blockId,
  command: 'addRelation',
  property,
  targetId,
});

const remove = (blockId: string, targetId: string, property = 'project'): BlockOperation => ({
  blockId,
  command: 'removeRelation',
  property,
  targetId,
});

const rows = [
  tasksCollection,
  projectsCollection,
  task('task-1'),
  task('task-2'),
  project('project-1'),
  project('project-2'),
];

const valuesOf = (result: ReturnType<typeof plannedOf>, id: string): unknown =>
  result.writes.find((write) => write.block.id === id)?.block.properties.values;

describe('addRelation', () => {
  it('points the row at the other row and writes nothing else when the relation goes one way', () => {
    const result = plannedOf(buildInput([add('task-1', 'project-1')], rows, { relationSchemas: oneWay }));

    expect(valuesOf(result, 'task-1')).toEqual({ project: ['project-1'] });
    expect(result.writes.map((write) => write.block.id)).toEqual(['task-1']);
  });

  it('writes the mirror on the other row in the same plan when the relation goes both ways', () => {
    const result = plannedOf(buildInput([add('task-1', 'project-1')], rows, { relationSchemas: twoWay }));

    expect(valuesOf(result, 'task-1')).toEqual({ project: ['project-1'] });
    expect(valuesOf(result, 'project-1')).toEqual({ tasks: ['task-1'] });
    expect(result.versions.map((entry) => entry.id).toSorted()).toEqual(['project-1', 'task-1']);
  });

  it('puts the row after the one named and keeps the order of the rest', () => {
    const stored = rows.map((row) => (row.id === 'task-1' ? task('task-1', { project: ['project-1'] }) : row));

    const result = plannedOf(
      buildInput([add('task-1', 'project-2', 'project', 'project-1')], stored, { relationSchemas: oneWay }),
    );

    expect(valuesOf(result, 'task-1')).toEqual({ project: ['project-1', 'project-2'] });
  });

  it('is idempotent: adding what is there moves it instead of repeating it', () => {
    const stored = rows.map((row) =>
      row.id === 'task-1' ? task('task-1', { project: ['project-1', 'project-2'] }) : row,
    );

    const result = plannedOf(
      buildInput([add('task-1', 'project-1', 'project', 'project-2')], stored, { relationSchemas: oneWay }),
    );

    expect(valuesOf(result, 'task-1')).toEqual({ project: ['project-2', 'project-1'] });
  });

  it('refuses a property the collection does not have as a relation', () => {
    const refusal = refusalOf(buildInput([add('task-1', 'project-1', 'notes')], rows, { relationSchemas: oneWay }));

    expect(refusal.code).toBe('BLOCK_OPERATION_INVALID');
  });

  it('refuses a row that is not in the collection the relation points to', () => {
    const refusal = refusalOf(buildInput([add('task-1', 'task-2')], rows, { relationSchemas: oneWay }));

    expect(refusal.code).toBe('BLOCK_OPERATION_INVALID');
  });

  it('answers the same for a row the viewer cannot read as for one that is not there', () => {
    const hidden = project(
      'project-1',
      {},
      { permissions: [{ principal: { kind: 'user', userId: 'someone-else' }, role: 'full' }] },
    );
    const stored = rows.map((row) => (row.id === 'project-1' ? hidden : row));

    const hiddenRefusal = refusalOf(buildInput([add('task-1', 'project-1')], stored, { relationSchemas: oneWay }));
    const missingRefusal = refusalOf(buildInput([add('task-1', 'project-9')], rows, { relationSchemas: oneWay }));

    expect(hiddenRefusal).toEqual(missingRefusal);
  });

  it('refuses a cell of more than 100 rows', () => {
    const full = Array.from({ length: 100 }, (_, index) => `project-x${String(index)}`);
    const stored = rows.map((row) => (row.id === 'task-1' ? task('task-1', { project: full }) : row));

    expect(refusalOf(buildInput([add('task-1', 'project-1')], stored, { relationSchemas: oneWay })).code).toBe(
      'RELATION_LIMIT_EXCEEDED',
    );
  });
});

describe('addRelation, the mirror side', () => {
  const readOnlyProject = project('project-1', {}, { permissions: [{ principal: { kind: 'space' }, role: 'reader' }] });
  const withReadOnlyProject = rows.map((row) => (row.id === 'project-1' ? readOnlyProject : row));

  it('refuses the whole operation, naming the mirror side, when the viewer cannot edit the other row', () => {
    const refusal = refusalOf(
      buildInput([add('task-1', 'project-1')], withReadOnlyProject, { relationSchemas: twoWay }),
    );

    expect(refusal.code).toBe('RELATION_MIRROR_FORBIDDEN');
    expect(refusal.details).toEqual({ targetId: 'project-1' });
  });

  it('lets a one-way relation point at a row the viewer can only read', () => {
    const planned = plan(buildInput([add('task-1', 'project-1')], withReadOnlyProject, { relationSchemas: oneWay }));

    expect(planned.isOk()).toBe(true);
  });
});

describe('removeRelation', () => {
  const linked = rows.map((row) => {
    if (row.id === 'task-1') return task('task-1', { project: ['project-1', 'project-2'] });
    if (row.id === 'project-1') return project('project-1', { tasks: ['task-1'] });
    return row;
  });

  it('takes the row out of the cell and out of the mirror', () => {
    const result = plannedOf(buildInput([remove('task-1', 'project-1')], linked, { relationSchemas: twoWay }));

    expect(valuesOf(result, 'task-1')).toEqual({ project: ['project-2'] });
    expect(valuesOf(result, 'project-1')).toEqual({});
  });

  it('is idempotent: removing what is not there changes nothing but the version', () => {
    const result = plannedOf(buildInput([remove('task-2', 'project-1')], linked, { relationSchemas: oneWay }));

    expect(valuesOf(result, 'task-2')).toEqual({});
  });

  it('refuses taking a row out of the mirror of a row the viewer cannot edit', () => {
    const readOnly = linked.map((row) =>
      row.id === 'project-1'
        ? project(
            'project-1',
            { tasks: ['task-1'] },
            { permissions: [{ principal: { kind: 'space' }, role: 'reader' }] },
          )
        : row,
    );

    expect(refusalOf(buildInput([remove('task-1', 'project-1')], readOnly, { relationSchemas: twoWay })).code).toBe(
      'RELATION_MIRROR_FORBIDDEN',
    );
  });
});

describe('relations and the rest of the transaction', () => {
  it('leaves a block that is not a row of a collection with relations alone', () => {
    const paragraph = buildBlock({ id: 'p1', parentId: 'tasks' });

    const planned = plan(buildInput([add('p1', 'project-1')], [...rows, paragraph], { relationSchemas: oneWay }));

    expect(planned.isFail()).toBe(true);
  });
});
