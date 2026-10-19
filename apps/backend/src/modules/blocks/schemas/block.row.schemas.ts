import { z } from 'zod';
import { BLOCK_RELATION } from '../constants/blocks.constants';

export const blockChildrenSchema = z.array(z.string());

export const blockJsonObjectSchema = z.record(z.string(), z.unknown());

export const blockLifecycleSchema = z.enum(['ACTIVE', 'TRASHED']);

export const blockRelationSchema = z.enum([BLOCK_RELATION.context, BLOCK_RELATION.target]);
