import { evaluatePageFormula } from './page-formula.evaluate.lib.js';
import type {
  PageFormulaContext,
  PageFormulaDefinition,
  PageFormulaNode,
  PageFormulaOutcome,
  PageFormulaScope,
} from './page-formula.types.js';

export interface PageFormulaTraceStep {
  readonly outcome: PageFormulaOutcome;
  /** The part of the formula text this step is the value of. */
  readonly text: string;
}

const listChildren = (node: PageFormulaNode): readonly PageFormulaNode[] => {
  switch (node.kind) {
    case 'CALL':
      return node.arguments;
    case 'BINARY':
      return [node.left, node.right];
    case 'UNARY':
      return [node.operand];
    default:
      return [];
  }
};

/** A constant says nothing a reader cannot see in the text, so it is not a step. */
const isStep = (node: PageFormulaNode): boolean => node.kind !== 'LITERAL';

const collectSteps = (node: PageFormulaNode): readonly PageFormulaNode[] => [
  ...listChildren(node).flatMap(collectSteps),
  ...(isStep(node) ? [node] : []),
];

/**
 * The value of each part of a formula, innermost first, for one row: the way to find which part of a long formula
 * gives a value nobody expected. Each part runs on its own with the budget of a whole formula.
 */
export const tracePageFormula = (
  definition: PageFormulaDefinition,
  scope: PageFormulaScope,
  context: PageFormulaContext,
): readonly PageFormulaTraceStep[] =>
  collectSteps(definition.ast).map((node) => ({
    outcome: evaluatePageFormula(node, scope, context),
    text: definition.source.slice(node.from, node.to),
  }));
