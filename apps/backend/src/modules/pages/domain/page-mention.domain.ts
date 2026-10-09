import type { Prisma } from '@neuma/db/generated';
import { extractPageContentMentionIds } from '@/common/domain/page-content.domain';

export const extractMentionTargetPageIds = (content: Prisma.JsonValue): readonly string[] =>
  extractPageContentMentionIds(content) ?? [];

export const redactUnreadableMentions = (
  content: Prisma.JsonValue,
  readablePageIds: ReadonlySet<string>,
  redactedLabel: string,
): Prisma.JsonValue => redactJsonNode(content, readablePageIds, redactedLabel);

const isJsonObject = (value: Prisma.JsonValue): value is Prisma.JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readStringField = (source: Prisma.JsonObject, key: string): string | null => {
  const value = source[key];
  return typeof value === 'string' ? value : null;
};

const isUnreadableMentionNode = (node: Prisma.JsonObject, readablePageIds: ReadonlySet<string>): boolean => {
  if (readStringField(node, 'type') !== 'mention') return false;
  const attrs = node.attrs;
  if (attrs === undefined || !isJsonObject(attrs)) return false;
  const targetPageId = readStringField(attrs, 'pageId');
  return targetPageId !== null && !readablePageIds.has(targetPageId);
};

const redactMentionNode = (node: Prisma.JsonObject, redactedLabel: string): Prisma.JsonObject => {
  const attrs = node.attrs;
  if (attrs === undefined || !isJsonObject(attrs)) return node;
  return { ...node, attrs: { ...attrs, label: redactedLabel } };
};

const mapJsonObjectValues = (
  source: Prisma.JsonObject,
  transform: (value: Prisma.JsonValue) => Prisma.JsonValue,
): Prisma.JsonObject =>
  Object.fromEntries(
    Object.entries(source)
      .filter((entry): entry is [string, Prisma.JsonValue] => entry[1] !== undefined)
      .map(([key, value]) => [key, transform(value)] as const),
  );

const redactJsonNode = (
  node: Prisma.JsonValue,
  readablePageIds: ReadonlySet<string>,
  redactedLabel: string,
): Prisma.JsonValue => {
  if (Array.isArray(node)) return node.map((child) => redactJsonNode(child, readablePageIds, redactedLabel));
  if (!isJsonObject(node)) return node;
  if (isUnreadableMentionNode(node, readablePageIds)) return redactMentionNode(node, redactedLabel);
  return mapJsonObjectValues(node, (value) => redactJsonNode(value, readablePageIds, redactedLabel));
};
