import { describe, expect, it } from 'bun:test';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from '@neuma/shared';
import { listMcpNames } from '@/modules/mcp/lib/mcp.columns.lib';
import { planMcpRelationChanges, withLinkedRows } from '@/modules/mcp/lib/mcp.relations.lib';
import type { McpColumnDraft, McpRelationRequest } from '@/modules/mcp/types/mcp.collections.types';

const column: McpColumnDraft = {
  config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, targetCollectionId: 'projects' },
  key: 'projects',
  label: 'Proyectos',
  options: null,
  required: false,
  type: 'RELATION',
};

const target = {
  listNames: listMcpNames,
  rows: [
    { id: 'alfa', title: 'Alfa' },
    { id: 'beta-1', title: 'Beta' },
    { id: 'beta-2', title: 'beta' },
    { id: 'gamma', title: 'Gamma' },
  ],
  title: 'Proyectos',
};

const request = (overrides: Partial<McpRelationRequest>): McpRelationRequest => ({
  add: [],
  column,
  remove: [],
  set: null,
  ...overrides,
});

describe('planMcpRelationChanges', () => {
  it('links a row named by its title or by its id', () => {
    const planned = planMcpRelationChanges(request({ add: ['alfa', 'gamma'] }), target, null);

    expect(planned.getValue()).toEqual([
      { kind: 'ADD', propertyKey: 'projects', targetId: 'alfa' },
      { kind: 'ADD', propertyKey: 'projects', targetId: 'gamma' },
    ]);
  });

  it('does not link again what is already linked', () => {
    const planned = planMcpRelationChanges(request({ add: ['Alfa'] }), target, { projects: ['alfa'] });

    expect(planned.getValue()).toEqual([]);
  });

  it('unlinks only what was linked', () => {
    const planned = planMcpRelationChanges(request({ remove: ['Alfa', 'Gamma'] }), target, { projects: ['alfa'] });

    expect(planned.getValue()).toEqual([{ kind: 'REMOVE', propertyKey: 'projects', targetId: 'alfa' }]);
  });

  it('turns a replacement into the unlinks and links that get there, unlinks first', () => {
    const planned = planMcpRelationChanges(request({ set: ['Gamma'] }), target, { projects: ['alfa'] });

    expect(planned.getValue()).toEqual([
      { kind: 'REMOVE', propertyKey: 'projects', targetId: 'alfa' },
      { kind: 'ADD', propertyKey: 'projects', targetId: 'gamma' },
    ]);
  });

  it('keeps a link to a row the token cannot read when it replaces the cell', () => {
    const planned = planMcpRelationChanges(request({ set: [] }), target, { projects: ['alfa', 'secret'] });

    expect(planned.getValue()).toEqual([{ kind: 'REMOVE', propertyKey: 'projects', targetId: 'alfa' }]);
  });

  it('asks for the id when two rows share a title, naming both', () => {
    const planned = planMcpRelationChanges(request({ add: ['Beta'] }), target, null);

    expect(planned.getError()).toContain('beta-1');
    expect(planned.getError()).toContain('beta-2');
  });

  it('says there is no such row, and lists the ones that exist when the token may see them', () => {
    const planned = planMcpRelationChanges(request({ add: ['Delta'] }), target, null);

    expect(planned.getError()).toContain('Delta');
    expect(planned.getError()).toContain('Alfa, Beta, beta, Gamma');
  });
});

describe('withLinkedRows', () => {
  const row = { id: 'row', propertyValues: { projects: ['alfa', 'gamma'], other: 'x' }, spaceId: 's', title: 'Fila' };

  it('shows the links as they stand after the changes', () => {
    const linked = withLinkedRows(row, [
      { kind: 'REMOVE', propertyKey: 'projects', targetId: 'alfa' },
      { kind: 'ADD', propertyKey: 'projects', targetId: 'beta-1' },
    ]);

    expect(linked.propertyValues).toEqual({ other: 'x', projects: ['gamma', 'beta-1'] });
  });

  it('drops the cell when no link is left', () => {
    const linked = withLinkedRows(row, [
      { kind: 'REMOVE', propertyKey: 'projects', targetId: 'alfa' },
      { kind: 'REMOVE', propertyKey: 'projects', targetId: 'gamma' },
    ]);

    expect(linked.propertyValues).toEqual({ other: 'x' });
  });
});
