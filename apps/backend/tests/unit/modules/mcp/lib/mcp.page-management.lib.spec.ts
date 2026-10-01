import { describe, expect, it } from 'bun:test';
import { McpToolError } from '@/modules/mcp/infrastructure/errors/mcp.tool.error';
import { findMcpPerson } from '@/modules/mcp/lib/mcp.page-management.lib';

const people = [
  { id: 'u-1', name: 'Ana Pérez' },
  { id: 'u-2', name: 'Luis Soto' },
  { id: 'u-3', name: 'Luis Soto' },
];

const refusalOf = (named: string): string => {
  try {
    findMcpPerson(people, named);
    return 'found';
  } catch (error) {
    return error instanceof McpToolError ? error.message : 'unexpected';
  }
};

describe('findMcpPerson', () => {
  it('finds a person by id, or by name however it is capitalised', () => {
    expect(findMcpPerson(people, 'u-2').id).toBe('u-2');
    expect(findMcpPerson(people, ' ana pérez ').id).toBe('u-1');
  });

  it('refuses a name nobody has, and a name two people share', () => {
    expect(refusalOf('Nadie')).toContain('Nobody');
    expect(refusalOf('Luis Soto')).toContain('by id');
  });
});
