import { DatabaseViewType } from '@neuma/db';
import { PAGE_LIFECYCLE_VALUES } from '@neuma/shared';
import { z } from 'zod';
import { BLOCK_RELATION } from '../constants/blocks.constants';
import { BLOCK_LINK_KIND } from '../domain/block.operation.constants';

export const blockChildrenSchema = z.array(z.string());

export const blockJsonObjectSchema = z.record(z.string(), z.unknown());

/** A JSON column is written only after it was checked to be JSON, whatever the in-memory type said. */
export const blockJsonValueSchema = z.json();

export const blockLinkKindSchema = z.enum(BLOCK_LINK_KIND);

export const blockLifecycleSchema = z.enum(PAGE_LIFECYCLE_VALUES);

/** The configuration column of a view is an object; anything else was never written by the application. */
export const viewConfigurationSchema = z.record(z.string(), z.json());

export const viewTypeSchema = z.enum(DatabaseViewType);

export const blockRelationSchema = z.enum([BLOCK_RELATION.context, BLOCK_RELATION.target]);
