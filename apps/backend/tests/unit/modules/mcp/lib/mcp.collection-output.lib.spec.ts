import { describe, expect, it } from 'bun:test';
import { PAGE_OPTION_COLOR, type PagePropertyType } from '@company-brain/shared';
import { describeMcpCollection, formatMcpCollectionText } from '@/modules/mcp/lib/mcp.collection-output.lib';
import type { McpColumn } from '@/modules/mcp/types/mcp.collections.types';

const column = (
  key: string,
  label: string,
  type: PagePropertyType,
  options: readonly string[] | null = null,
): McpColumn => ({
  key,
  label,
  options: options?.map((value) => ({ color: PAGE_OPTION_COLOR.GRAY, value })) ?? null,
  required: type === 'TITLE',
  type,
});

const collection = {
  id: '11111111-1111-4111-8111-111111111111',
  place: { lineage: ['11111111-1111-4111-8111-111111111111'], spaceId: '00000000-0000-4000-8000-00000000000a' },
  shape: {
    properties: [column('title', 'Título', 'TITLE'), column('status', 'Estado', 'SELECT', ['Por hacer', 'Hecho'])],
    views: [
      { configuration: {}, isDefault: true, name: 'Tabla', type: 'TABLE' as const },
      {
        configuration: {
          filter: {
            conditions: [
              { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'Hecho' },
              { kind: 'CONDITION', operator: 'IS_NOT_EMPTY', propertyKey: 'title', value: null },
            ],
            kind: 'GROUP',
            operator: 'AND',
          },
          groupBy: 'status',
        },
        isDefault: false,
        name: 'Tablero',
        type: 'BOARD' as const,
      },
    ],
  },
  spaceId: '00000000-0000-4000-8000-00000000000a',
  title: 'Tareas',
};

describe('describeMcpCollection', () => {
  it('names each column with its options, and each view by what it groups and filters, by column name', () => {
    const described = describeMcpCollection('https://brain.example.com', collection);

    expect(described.url).toBe(
      'https://brain.example.com/spaces/00000000-0000-4000-8000-00000000000a/pages/11111111-1111-4111-8111-111111111111',
    );
    expect(described.columns[1]).toEqual({
      key: 'status',
      label: 'Estado',
      options: ['Por hacer', 'Hecho'],
      required: false,
      type: 'SELECT',
    });
    expect(described.views).toEqual([
      { filter: null, groupBy: null, isDefault: true, name: 'Tabla', type: 'TABLE' },
      {
        filter: 'Estado IS "Hecho" AND Título IS_NOT_EMPTY',
        groupBy: 'Estado',
        isDefault: false,
        name: 'Tablero',
        type: 'BOARD',
      },
    ]);
  });
});

describe('formatMcpCollectionText', () => {
  it('reads as a short summary an agent can act on', () => {
    const text = formatMcpCollectionText(describeMcpCollection('https://brain.example.com', collection));

    expect(text).toContain('Tareas');
    expect(text).toContain('- Estado (status, SELECT): Por hacer, Hecho');
    expect(text).toContain('- Tabla (TABLE, default)');
    expect(text).toContain('- Tablero (BOARD): grouped by Estado; where Estado IS "Hecho" AND Título IS_NOT_EMPTY');
  });
});
