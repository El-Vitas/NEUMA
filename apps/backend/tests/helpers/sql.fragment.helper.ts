import { createNeumaDatabase } from '@neuma/db';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The text of a raw fragment with each bound value written where it is bound, for asserting on its shape. */
export const renderSqlFragment = (node: unknown): string => {
  if (typeof node === 'string') return node;
  if (!isRecord(node)) return '';
  if (Array.isArray(node.parts)) return node.parts.map(renderSqlFragment).join('');
  return node.kind === 'param-ref' ? String(node.value) : '';
};

/** Building a fragment needs no connection: the pool only opens one when a query runs. */
export const createSqlTagForTests = (): ReturnType<typeof createNeumaDatabase>['raw']['sql'] =>
  createNeumaDatabase('postgresql://unused:unused@127.0.0.1:1/unused').raw.sql;
