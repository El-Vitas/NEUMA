import { PAGE_TEMPLATE_VARIABLE_VALUES } from '@neuma/shared';
import { z } from 'zod';

export const pageTemplateVariablesSchema = z.record(z.string().min(1), z.enum(PAGE_TEMPLATE_VARIABLE_VALUES));
