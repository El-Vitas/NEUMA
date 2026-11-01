import { ApiError } from '@/shared/lib/api';
import { SCHEMA_REFUSAL_CODE } from '../constants/pages.schema-rejection.constants';
import type { PageSchemaRejection, PageSchemaSaveOutcome } from '../types/pages.schema.types';

const readDetails = (data: unknown): unknown => {
  if (typeof data !== 'object' || data === null || !('error' in data)) return null;
  const { error } = data;
  return typeof error === 'object' && error !== null && 'details' in error ? error.details : null;
};

const readDetailedRejection = (details: unknown): PageSchemaRejection | null => {
  if (typeof details !== 'object' || details === null) return null;
  if (!('code' in details) || !('message' in details)) return null;
  const { code, message } = details;
  return typeof code === 'string' && typeof message === 'string' ? { code, message } : null;
};

/** The reason the server gave for refusing a shape, so the person sees it instead of a vague failure. */
export const readSchemaRejection = (error: unknown): PageSchemaRejection | null => {
  if (!(error instanceof ApiError) || error.code !== SCHEMA_REFUSAL_CODE) return null;
  const details = readDetails(error.data);
  const detailed = readDetailedRejection(details);
  if (detailed !== null) return detailed;
  return { code: SCHEMA_REFUSAL_CODE, message: typeof details === 'string' ? details : error.message };
};

export const isSchemaRejected = (
  outcome: PageSchemaSaveOutcome | null,
): outcome is { readonly rejection: PageSchemaRejection } =>
  typeof outcome === 'object' && outcome !== null && 'rejection' in outcome;

export const describeSchemaRejection = (rejection: PageSchemaRejection): string =>
  `${rejection.code}: ${rejection.message}`;
