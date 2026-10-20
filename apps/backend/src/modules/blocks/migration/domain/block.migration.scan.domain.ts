import { PAGE_CONTENT_NODE_TYPES, PAGE_TEXT_TAG_PATTERN } from '@neuma/shared';
import {
  BLOCK_MIGRATION_PATH_SEPARATOR,
  BLOCK_MIGRATION_PROBLEM,
  BLOCK_MIGRATION_TOGGLE_NODE,
} from '../constants/block.migration.constants';
import type { BlockMigrationProblem, JsonRecord } from '../types/block.migration.types';

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readText = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const describeToggle = (pageId: string, node: JsonRecord, path: readonly number[]): BlockMigrationProblem => ({
  blockId: isRecord(node.attrs) ? (readText(node.attrs.id) ?? null) : null,
  kind: BLOCK_MIGRATION_PROBLEM.tagLikeToggleSummary,
  message: `The summary of the toggle at ${path.join(BLOCK_MIGRATION_PATH_SEPARATOR)} looks like an HTML tag, which block text does not admit`,
  pageId,
});

const hasTagLikeSummary = (node: JsonRecord): boolean => {
  if (node.type !== BLOCK_MIGRATION_TOGGLE_NODE || !isRecord(node.attrs)) return false;
  const summary = readText(node.attrs.summary);
  return summary !== undefined && PAGE_TEXT_TAG_PATTERN.test(summary);
};

const scanNodes = (pageId: string, nodes: readonly unknown[], path: readonly number[]): BlockMigrationProblem[] =>
  nodes.flatMap((node, index) => {
    if (!isRecord(node)) return [];
    const nodePath = [...path, index];
    const own = hasTagLikeSummary(node) ? [describeToggle(pageId, node, nodePath)] : [];
    const isKnown = typeof node.type === 'string' && PAGE_CONTENT_NODE_TYPES.includes(node.type);
    const inner = isKnown && Array.isArray(node.content) ? scanNodes(pageId, node.content, nodePath) : [];
    return [...own, ...inner];
  });

/** The toggles whose summary looks like a tag: the conversion would refuse them, so they are listed first by place. */
export const findTagLikeToggleSummaries = (
  pageId: string,
  content: { readonly content: readonly unknown[] },
): BlockMigrationProblem[] => scanNodes(pageId, content.content, []);
