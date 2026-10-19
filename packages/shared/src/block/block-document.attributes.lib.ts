import type { PageDocumentNodeShape } from '../page-document/page-document.types.js';
import { Result } from '../result.js';
import {
  BLOCK_DOCUMENT_ANNOTATION_KEYS,
  BLOCK_DOCUMENT_ATTRIBUTE_ROUTES,
  BLOCK_DOCUMENT_ERROR_CODE,
  BLOCK_DOCUMENT_ID_ATTRIBUTE,
} from './block-document.constants.js';
import { type BlockDocumentError, failBlockDocument } from './block-document.error.js';
import type { BlockWrapperAttributes } from './block-document.types.js';

type Attributes = NonNullable<PageDocumentNodeShape['attrs']>;
type KeyedValues = Readonly<Record<string, unknown>>;

export interface SplitAttributes {
  readonly format: KeyedValues;
  readonly id: string | undefined;
  readonly properties: KeyedValues;
}

const EMPTY_ROUTE = { format: [], properties: [] } as const;

const isAnnotationKey = (key: string): boolean =>
  BLOCK_DOCUMENT_ANNOTATION_KEYS.some((annotation) => annotation === key);

const readRoute = (nodeType: string | null): { format: readonly string[]; properties: readonly string[] } =>
  nodeType === null ? EMPTY_ROUTE : (BLOCK_DOCUMENT_ATTRIBUTE_ROUTES[nodeType] ?? EMPTY_ROUTE);

/** A key a node carries that the block model has no place for would be lost, so it is an error. */
const failUnrouted = (nodeType: string | null, key: string): Result<never, BlockDocumentError> =>
  failBlockDocument(
    BLOCK_DOCUMENT_ERROR_CODE.invalidBlock,
    `The attribute ${key} of ${nodeType ?? 'a wrapper'} has no place in a block`,
  );

/**
 * Sorts the attributes of a document node into the block id, its properties and its format. Colors and comments go
 * to the format. A null node type means a wrapper, which only carries an id, colors and comments.
 */
export const splitAttributes = (
  nodeType: string | null,
  attributes: Attributes | undefined,
): Result<SplitAttributes, BlockDocumentError> => {
  const route = readRoute(nodeType);
  let id: string | undefined;
  const properties: Record<string, unknown> = {};
  const format: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (key === BLOCK_DOCUMENT_ID_ATTRIBUTE && typeof value === 'string') id = value;
    else if (isAnnotationKey(key) || route.format.includes(key)) format[key] = value;
    else if (route.properties.includes(key)) properties[key] = value;
    else return failUnrouted(nodeType, key);
  }
  return Result.ok({ format, id, properties });
};

/** What a dissolved wrapper keeps: its id, colors and comments. */
export const readWrapperAttributes = (
  attributes: Attributes | undefined,
): Result<BlockWrapperAttributes, BlockDocumentError> => {
  const split = splitAttributes(null, attributes);
  if (split.isFail()) return Result.fail(split.getError());
  const { format, id } = split.getValue();
  return Result.ok({ ...(id === undefined ? {} : { id }), ...format });
};

export const hasWrapperAttributes = (attributes: BlockWrapperAttributes): boolean => Object.keys(attributes).length > 0;

/** The attributes a document node is written with: the block id, then colors, comments and the routed values. */
export const joinAttributes = (
  nodeType: string,
  id: string,
  properties: KeyedValues,
  format: KeyedValues,
): Record<string, unknown> => {
  const route = readRoute(nodeType);
  const attributes: Record<string, unknown> = { [BLOCK_DOCUMENT_ID_ATTRIBUTE]: id };
  for (const key of [...BLOCK_DOCUMENT_ANNOTATION_KEYS, ...route.format]) {
    if (format[key] !== undefined) attributes[key] = format[key];
  }
  for (const key of route.properties) {
    if (properties[key] !== undefined) attributes[key] = properties[key];
  }
  return attributes;
};

/** A wrapper is written with its attributes only when it had some. */
export const joinWrapperAttributes = (
  attributes: BlockWrapperAttributes | undefined,
): Record<string, unknown> | undefined =>
  attributes === undefined || !hasWrapperAttributes(attributes) ? undefined : { ...attributes };

/** Takes one attribute out and returns it with the rest, for the ones that are not routed by key alone. */
export const takeAttribute = (
  attributes: Attributes | undefined,
  key: string,
): { readonly rest: Attributes; readonly value: Attributes[string] | undefined } => {
  const { [key]: value, ...rest } = attributes ?? {};
  return { rest, value };
};
