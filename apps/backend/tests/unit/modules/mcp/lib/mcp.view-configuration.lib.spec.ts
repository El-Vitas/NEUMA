import { describe, expect, it } from 'bun:test';
import { DEFAULT_PAGE_PROPERTY_CONFIG, type PagePropertyType } from '@neuma/shared';
import { hideMcpNames, listMcpNames } from '@/modules/mcp/lib/mcp.columns.lib';
import { buildMcpViewConfiguration } from '@/modules/mcp/lib/mcp.view-configuration.lib';
import type { McpColumn } from '@/modules/mcp/types/mcp.collections.types';

const column = (
  key: string,
  label: string,
  type: PagePropertyType,
  options: readonly string[] | null = null,
): McpColumn => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key,
  label,
  options: options?.map((value, index) => ({ color: null, group: null, id: `${key}-${String(index)}`, value })) ?? null,
  required: false,
  type,
});

const columns = [
  column('title', 'Título', 'TITLE'),
  column('status', 'Estado', 'SELECT', ['Por hacer', 'Hecho']),
  column('owner', 'Responsable', 'PERSON'),
  column('due', 'Vence', 'DATE'),
];
const people = [{ email: 'ana@example.com', id: 'u-1', name: 'Ana Pérez' }];

const known = { columns, listNames: listMcpNames };

describe('buildMcpViewConfiguration', () => {
  it('turns conditions named as people see them into the filter a view keeps, all of them together', () => {
    const built = buildMcpViewConfiguration(
      known,
      {
        where: [
          { column: 'Estado', operator: 'IS', value: 'por hacer' },
          { column: 'Responsable', operator: 'IS', value: 'Ana Pérez' },
          { column: 'Título', operator: 'CONTAINS', value: 'plan' },
        ],
      },
      people,
      {},
    );

    expect(built.getValue()).toEqual({
      filter: {
        conditions: [
          { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'status-0' },
          { kind: 'CONDITION', operator: 'IS', propertyKey: 'owner', value: 'u-1' },
          { kind: 'CONDITION', operator: 'CONTAINS', propertyKey: 'title', value: 'plan' },
        ],
        kind: 'GROUP',
        operator: 'AND',
      },
    });
  });

  it('turns the order, the grouping and the columns shown into keys', () => {
    const built = buildMcpViewConfiguration(
      known,
      { groupBy: 'Estado', sort: [{ column: 'Vence', direction: 'ASCENDING' }], visibleColumns: ['Título', 'Vence'] },
      people,
      {},
    );

    expect(built.getValue()).toEqual({
      groupBy: 'status',
      sorts: [{ direction: 'ASCENDING', propertyKey: 'due' }],
      visibleProperties: ['title', 'due'],
    });
  });

  it('keeps what the view already had that was not asked to change', () => {
    const built = buildMcpViewConfiguration(known, { groupBy: null }, people, { groupBy: 'status', icon: '📋' });

    expect(built.getValue()).toEqual({ groupBy: null, icon: '📋' });
  });

  it('takes no value for a condition that needs none', () => {
    const built = buildMcpViewConfiguration(known, { where: [{ column: 'Vence', operator: 'IS_EMPTY' }] }, people, {});

    expect(built.getValue()).toMatchObject({
      filter: { conditions: [{ operator: 'IS_EMPTY', propertyKey: 'due', value: null }] },
    });
  });

  it('refuses a column or an option the collection does not have, saying what it has', () => {
    expect(buildMcpViewConfiguration(known, { groupBy: 'Prioridad' }, people, {}).getError()).toContain(
      'Estado (status)',
    );
    expect(
      buildMcpViewConfiguration(
        known,
        { where: [{ column: 'Estado', operator: 'IS', value: 'Bloqueado' }] },
        people,
        {},
      ).getError(),
    ).toContain('Por hacer, Hecho');
  });

  it('refuses without naming what there is when the names are kept from the agent', () => {
    const hidden = { columns, listNames: hideMcpNames };

    const noColumn = buildMcpViewConfiguration(hidden, { groupBy: 'Prioridad' }, people, {});
    const noOption = buildMcpViewConfiguration(
      hidden,
      { where: [{ column: 'Estado', operator: 'IS', value: 'Bloqueado' }] },
      people,
      {},
    );

    expect(noColumn.getError()).not.toContain('Estado');
    expect(noOption.getError()).not.toContain('Por hacer');
  });
});
