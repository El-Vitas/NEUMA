import { z } from 'zod';
import { PATH_SEGMENT_MAX_LENGTH } from '@/shared/constants/path-segment.constants';

/** An identifier ends up inside a backend URL, so it cannot carry a slash or dots that climb to another route. */
export const pathSegmentSchema = z
  .string()
  .min(1)
  .max(PATH_SEGMENT_MAX_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);
