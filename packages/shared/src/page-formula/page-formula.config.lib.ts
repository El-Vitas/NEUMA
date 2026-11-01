import { z } from 'zod';
import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { PAGE_FORMULA_RESULT_TYPE_VALUES } from './page-formula.constants.js';
import type {
  PageComputedConfig,
  PageFormulaDefinition,
  PageFormulaNode,
  PageRollupDefinition,
} from './page-formula.types.js';

const NO_COMPUTED_CONFIG: PageComputedConfig = { formula: null, rollup: null };

const BINARY_OPERATORS = ['!=', '%', '*', '+', '-', '/', '<', '<=', '==', '>', '>=', 'and', 'or'] as const;

const spanShape = { from: z.number().int().min(0), to: z.number().int().min(0) };

const nodeSchema: z.ZodType<PageFormulaNode> = z.lazy(() =>
  z.union([
    z.object({
      ...spanShape,
      kind: z.literal('BINARY'),
      left: nodeSchema,
      operator: z.enum(BINARY_OPERATORS),
      right: nodeSchema,
    }),
    z.object({ ...spanShape, arguments: z.array(nodeSchema), kind: z.literal('CALL'), name: z.string() }),
    z.object({ ...spanShape, kind: z.literal('LITERAL'), value: z.union([z.boolean(), z.number(), z.string()]) }),
    z.object({
      ...spanShape,
      kind: z.literal('PROPERTY'),
      labelFrom: z.number().int().min(0),
      labelTo: z.number().int().min(0),
      propertyKey: z.string(),
    }),
    z.object({ ...spanShape, kind: z.literal('UNARY'), operand: nodeSchema, operator: z.enum(['-', 'not']) }),
  ]),
);

const resultTypeSchema = z.enum([...PAGE_FORMULA_RESULT_TYPE_VALUES, 'LIST']);

const formulaSchema: z.ZodType<PageFormulaDefinition> = z.object({
  ast: nodeSchema,
  isClockDependent: z.boolean(),
  references: z.array(z.string()),
  resultType: resultTypeSchema,
  source: z.string(),
});

const rollupSchema: z.ZodType<PageRollupDefinition> = z.object({
  calculation: z.string().min(1),
  relationPropertyKey: z.string().min(1),
  resultType: resultTypeSchema,
  targetCollectionId: z.string().min(1),
  targetPropertyKey: z.string().min(1),
}) as z.ZodType<PageRollupDefinition>;

const isRecord = (stored: unknown): stored is Readonly<Record<string, unknown>> =>
  typeof stored === 'object' && stored !== null && !Array.isArray(stored);

/** Lenient like the rest of `config`: something damaged reads as missing, so a stored property still opens. */
export const readPageComputedConfig = (stored: unknown): PageComputedConfig => {
  if (!isRecord(stored)) return NO_COMPUTED_CONFIG;
  const formula = formulaSchema.safeParse(stored.formula);
  const rollup = rollupSchema.safeParse(stored.rollup);
  return { formula: formula.success ? formula.data : null, rollup: rollup.success ? rollup.data : null };
};

/** What goes into `config` besides the fields the type shares with the others. */
export const writePageComputedConfig = (
  type: PagePropertyType,
  config: PageComputedConfig,
): Readonly<Record<string, unknown>> | null => {
  if (type === PAGE_PROPERTY_TYPE.FORMULA && config.formula !== null) return { formula: config.formula };
  if (type === PAGE_PROPERTY_TYPE.ROLLUP && config.rollup !== null) return { rollup: config.rollup };
  return null;
};

/** Null when the property carries what its type asks for and nothing else, otherwise what is wrong. */
export const validatePageComputedConfig = (type: PagePropertyType, config: PageComputedConfig): string | null => {
  if (type === PAGE_PROPERTY_TYPE.FORMULA) {
    return config.formula === null || config.rollup !== null ? 'A formula property needs a formula' : null;
  }
  if (type === PAGE_PROPERTY_TYPE.ROLLUP) {
    return config.rollup === null || config.formula !== null ? 'A rollup property needs a rollup' : null;
  }
  return config.formula === null && config.rollup === null
    ? null
    : `A ${type} property cannot have a formula or rollup`;
};
