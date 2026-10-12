import type { JsonObject, JsonValue } from '@neuma/db';
import { extractPageContentMentionIds } from '@/common/domain/page-content.domain';

export const extractMentionTargetPageIds = (content: JsonValue): readonly string[] =>
  extractPageContentMentionIds(content) ?? [];

export const redactUnreadableMentions = (
  content: JsonValue,
  readablePageIds: ReadonlySet<string>,
  redactedLabel: string,
): JsonValue => redactJsonNode(content, readablePageIds, redactedLabel);

const isJsonObject = (value: JsonValue): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readStringField = (source: JsonObject, key: string): string | null => {
  const value = source[key];
  return typeof value === 'string' ? value : null;
};

const isUnreadableMentionNode = (node: JsonObject, readablePageIds: ReadonlySet<string>): boolean => {
  if (readStringField(node, 'type') !== 'mention') return false;
  const attrs = node.attrs;
  if (attrs === undefined || !isJsonObject(attrs)) return false;
  const targetPageId = readStringField(attrs, 'pageId');
  return targetPageId !== null && !readablePageIds.has(targetPageId);
};

const redactMentionNode = (node: JsonObject, redactedLabel: string): JsonObject => {
  const attrs = node.attrs;
  if (attrs === undefined || !isJsonObject(attrs)) return node;
  return { ...node, attrs: { ...attrs, label: redactedLabel } };
};

const mapJsonObjectValues = (source: JsonObject, transform: (value: JsonValue) => JsonValue): JsonObject =>
  Object.fromEntries(Object.entries(source).map(([key, value]) => [key, transform(value)] as const));

const isJsonArray = (value: JsonValue): value is readonly JsonValue[] => Array.isArray(value);

const redactJsonNode = (node: JsonValue, readablePageIds: ReadonlySet<string>, redactedLabel: string): JsonValue => {
  if (isJsonArray(node)) return node.map((child) => redactJsonNode(child, readablePageIds, redactedLabel));
  if (!isJsonObject(node)) return node;
  if (isUnreadableMentionNode(node, readablePageIds)) return redactMentionNode(node, redactedLabel);
  return mapJsonObjectValues(node, (value) => redactJsonNode(value, readablePageIds, redactedLabel));
};
