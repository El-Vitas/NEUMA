import type { PageFormulaOutcome, PageFormulaScalar, PageFormulaTraceStep, PageFormulaValue } from '@neuma/shared';
import { ACCESS_TOKEN_PERMISSIONS, readPageDateValue } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import {
  MCP_TEST_FORMULA_DESCRIPTION,
  MCP_TEST_FORMULA_MISSING_KIND_MESSAGE,
} from '../constants/mcp.formula.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { listMcpClosedRowIds, openMcpCollection } from '../lib/mcp.collections.lib';
import { readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { testFormulaInputSchema, testFormulaOutputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpComputedDraft,
  McpComputedPreview,
  McpPreviewValue,
  McpTestFormulaInput,
  McpTestFormulaOutput,
} from '../types/mcp.collections.types';
import type { McpToolDefinition } from '../types/mcp.types';

const isScalarList = (value: PageFormulaValue): value is readonly PageFormulaScalar[] => Array.isArray(value);

const toListEntry = (entry: PageFormulaScalar): string => (typeof entry === 'object' ? entry.start : String(entry));

/** A date reads as a day or an interval, a list as its entries, anything else as it is. */
const toPreviewValue = (outcome: PageFormulaOutcome): McpPreviewValue => {
  if (!outcome.isOk || outcome.value === null) return null;
  const { value } = outcome;
  if (isScalarList(value)) return value.map(toListEntry);
  const date = readPageDateValue(value);
  if (date !== null) return date.end === undefined ? date.start : `${date.start}/${date.end}`;
  return typeof value === 'object' ? null : value;
};

const toPreviewError = (outcome: PageFormulaOutcome): { error?: { code: string; message: string } } =>
  outcome.isOk ? {} : { error: outcome.error };

const toPreviewTrace = (trace: readonly PageFormulaTraceStep[]) =>
  trace.map((step) => ({
    ...toPreviewError(step.outcome),
    text: step.text,
    value: toPreviewValue(step.outcome),
  }));

const toPreviewRow = (row: McpComputedPreview['rows'][number]) => ({
  ...toPreviewError(row.outcome),
  id: row.id,
  title: row.title,
  ...(row.trace === undefined ? {} : { trace: toPreviewTrace(row.trace) }),
  value: toPreviewValue(row.outcome),
});

const toComputedDraft = (input: McpTestFormulaInput): McpComputedDraft => {
  if ((input.formula === undefined) === (input.rollup === undefined)) {
    throw new McpToolError(MCP_TEST_FORMULA_MISSING_KIND_MESSAGE);
  }
  if (input.formula !== undefined) return { formula: input.formula, rollup: null };
  const rollup = input.rollup;
  if (rollup === undefined) throw new McpToolError(MCP_TEST_FORMULA_MISSING_KIND_MESSAGE);
  return {
    formula: null,
    rollup: {
      calculation: rollup.calculation,
      relationPropertyKey: rollup.relation,
      targetPropertyKey: rollup.property,
    },
  };
};

const formatPreviewText = (output: McpTestFormulaOutput): string => {
  const reads = output.reads.length === 0 ? '' : ` It reads: ${output.reads.join(', ')}.`;
  const lines = output.rows.map((row) => {
    const shown = row.error === undefined ? JSON.stringify(row.value) : `${row.error.code}: ${row.error.message}`;
    return `- ${row.title}: ${shown}`;
  });
  return [`Valid. It gives ${output.resultType}.${reads}`, ...lines].join('\n');
};

/** Tries a formula or a rollup on a few rows and changes nothing, so an agent corrects it before it saves. */
export const testFormulaTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.testFormula,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.testFormula,
      {
        description: MCP_TEST_FORMULA_DESCRIPTION,
        inputSchema: testFormulaInputSchema,
        outputSchema: testFormulaOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.testFormula,
          async () => {
            const computedDraft = toComputedDraft(input);
            const call = await openMcpCall(dependencies);
            const { principal, workspace } = call;
            const collection = await openMcpCollection(
              dependencies,
              call,
              input.collection,
              ACCESS_TOKEN_PERMISSIONS.collectionsRead,
            );
            const preview = requireMcpSuccess(
              await dependencies.collections.previewComputed({
                computedDraft,
                excludedRowIds: listMcpClosedRowIds(call, collection),
                pageId: collection.id,
                role: principal.role,
                rowIds: input.rows?.map(readMcpPageId),
                trace: input.trace === true,
                userId: principal.userId,
                workspaceId: workspace.id,
              }),
            );
            return testFormulaOutputSchema.parse({
              reads: preview.reads,
              resultType: preview.resultType,
              rows: preview.rows.map(toPreviewRow),
            });
          },
          formatPreviewText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsRead],
};
