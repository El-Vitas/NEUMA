import { PAGE_FORMULA_RUNTIME_ERROR, PAGE_FORMULA_STEP_BUDGET } from './page-formula.constants.js';
import { failWithWorkLimit, PAGE_FORMULA_RUNNERS, succeedWithText } from './page-formula.functions.lib.js';
import { lookupOwnEntry } from './page-formula.lookup.lib.js';
import { failWith, succeedWith, succeedWithNumber } from './page-formula.outcome.lib.js';
import { isPageComputedPropertyType, readPageFormulaStoredValue } from './page-formula.property.lib.js';
import type {
  PageFormulaContext,
  PageFormulaEnvironment,
  PageFormulaNode,
  PageFormulaOutcome,
  PageFormulaScalar,
  PageFormulaScope,
  PageFormulaValue,
} from './page-formula.types.js';
import {
  areFormulaValuesEqual,
  compareFormulaValues,
  formatFormulaValue,
  readFormulaNumber,
} from './page-formula.values.lib.js';

interface EvaluationState {
  readonly environment: PageFormulaEnvironment;
  remaining: number;
  readonly scope: PageFormulaScope;
}

type BinaryNode = Extract<PageFormulaNode, { kind: 'BINARY' }>;

const spend = (state: EvaluationState, steps: number): boolean => {
  if (steps > state.remaining) return false;
  state.remaining -= steps;
  return true;
};

const readProperty = (
  node: Extract<PageFormulaNode, { kind: 'PROPERTY' }>,
  state: EvaluationState,
): PageFormulaOutcome => {
  const property = state.scope.properties.get(node.propertyKey);
  if (property === undefined) {
    return failWith(PAGE_FORMULA_RUNTIME_ERROR.DEPENDENCY_ERROR, 'A property the formula reads no longer exists');
  }
  if (isPageComputedPropertyType(property.type)) {
    const computed = state.scope.readComputed(node.propertyKey);
    return computed.isOk
      ? computed
      : failWith(
          PAGE_FORMULA_RUNTIME_ERROR.DEPENDENCY_ERROR,
          `"${property.label}" has an error: ${computed.error.message}`,
        );
  }
  const stored = Object.hasOwn(state.scope.values, node.propertyKey) ? state.scope.values[node.propertyKey] : undefined;
  return succeedWith(readPageFormulaStoredValue(property, stored));
};

const isTruthy = (value: PageFormulaValue): boolean => value === true;

const divideNumbers = (operator: BinaryNode['operator'], left: number, right: number): PageFormulaOutcome => {
  if (right === 0) return failWith(PAGE_FORMULA_RUNTIME_ERROR.DIVISION_BY_ZERO, 'Cannot divide by zero');
  return succeedWithNumber(operator === '/' ? left / right : left % right);
};

const applyArithmetic = (
  operator: BinaryNode['operator'],
  left: PageFormulaValue,
  right: PageFormulaValue,
): PageFormulaOutcome => {
  if (operator === '+' && (typeof left === 'string' || typeof right === 'string')) {
    return succeedWithText(`${formatFormulaValue(left)}${formatFormulaValue(right)}`);
  }
  const leftNumber = readFormulaNumber(left);
  const rightNumber = readFormulaNumber(right);
  if (leftNumber === null || rightNumber === null) return succeedWith(null);
  switch (operator) {
    case '+':
      return succeedWithNumber(leftNumber + rightNumber);
    case '-':
      return succeedWithNumber(leftNumber - rightNumber);
    case '*':
      return succeedWithNumber(leftNumber * rightNumber);
    default:
      return divideNumbers(operator, leftNumber, rightNumber);
  }
};

const isScalar = (value: PageFormulaValue): value is PageFormulaScalar => value !== null && !Array.isArray(value);

const applyComparison = (
  operator: BinaryNode['operator'],
  left: PageFormulaValue,
  right: PageFormulaValue,
): PageFormulaOutcome => {
  if (operator === '==') return succeedWith(areFormulaValuesEqual(left, right));
  if (operator === '!=') return succeedWith(!areFormulaValuesEqual(left, right));
  if (!isScalar(left) || !isScalar(right)) return succeedWith(null);
  const order = compareFormulaValues(left, right);
  switch (operator) {
    case '<':
      return succeedWith(order < 0);
    case '<=':
      return succeedWith(order <= 0);
    case '>':
      return succeedWith(order > 0);
    default:
      return succeedWith(order >= 0);
  }
};

const ARITHMETIC_OPERATORS: readonly BinaryNode['operator'][] = ['+', '-', '*', '/', '%'];

const applyBinary = (
  operator: BinaryNode['operator'],
  left: PageFormulaValue,
  right: PageFormulaValue,
): PageFormulaOutcome =>
  ARITHMETIC_OPERATORS.includes(operator)
    ? applyArithmetic(operator, left, right)
    : applyComparison(operator, left, right);

const evaluateLogic = (node: BinaryNode, state: EvaluationState): PageFormulaOutcome => {
  const left = evaluateNode(node.left, state);
  if (!left.isOk) return left;
  const isAnd = node.operator === 'and';
  if (isTruthy(left.value) !== isAnd) return succeedWith(!isAnd);
  const right = evaluateNode(node.right, state);
  return right.isOk ? succeedWith(isTruthy(right.value)) : right;
};

const evaluateBinary = (node: BinaryNode, state: EvaluationState): PageFormulaOutcome => {
  if (node.operator === 'and' || node.operator === 'or') return evaluateLogic(node, state);
  const left = evaluateNode(node.left, state);
  if (!left.isOk) return left;
  const right = evaluateNode(node.right, state);
  return right.isOk ? applyBinary(node.operator, left.value, right.value) : right;
};

const evaluateUnary = (
  node: Extract<PageFormulaNode, { kind: 'UNARY' }>,
  state: EvaluationState,
): PageFormulaOutcome => {
  const operand = evaluateNode(node.operand, state);
  if (!operand.isOk) return operand;
  if (node.operator === 'not') return succeedWith(!isTruthy(operand.value));
  const number = readFormulaNumber(operand.value);
  return number === null ? succeedWith(null) : succeedWith(-number);
};

const evaluateCondition = (
  node: Extract<PageFormulaNode, { kind: 'CALL' }>,
  state: EvaluationState,
): PageFormulaOutcome => {
  const branches: readonly (PageFormulaNode | undefined)[] = node.arguments;
  const [condition, whenTrue, whenFalse] = branches;
  if (condition === undefined || whenTrue === undefined || whenFalse === undefined) return succeedWith(null);
  const decided = evaluateNode(condition, state);
  if (!decided.isOk) return decided;
  return evaluateNode(isTruthy(decided.value) ? whenTrue : whenFalse, state);
};

const evaluateCall = (node: Extract<PageFormulaNode, { kind: 'CALL' }>, state: EvaluationState): PageFormulaOutcome => {
  if (node.name === 'if') return evaluateCondition(node, state);
  const runner = lookupOwnEntry(PAGE_FORMULA_RUNNERS, node.name);
  if (runner === undefined)
    return failWith(PAGE_FORMULA_RUNTIME_ERROR.INVALID_ARGUMENT, `${node.name} is not available`);
  const values: PageFormulaValue[] = [];
  for (const argument of node.arguments) {
    const evaluated = evaluateNode(argument, state);
    if (!evaluated.isOk) return evaluated;
    values.push(evaluated.value);
  }
  return runner(values, state.environment);
};

const evaluateNode = (node: PageFormulaNode, state: EvaluationState): PageFormulaOutcome => {
  if (!spend(state, 1)) return failWithWorkLimit();
  switch (node.kind) {
    case 'LITERAL':
      return typeof node.value === 'string' ? succeedWithText(node.value) : succeedWith(node.value);
    case 'PROPERTY':
      return readProperty(node, state);
    case 'UNARY':
      return evaluateUnary(node, state);
    case 'BINARY':
      return evaluateBinary(node, state);
    case 'CALL':
      return evaluateCall(node, state);
  }
};

/** Runs a checked formula for one row. A failure belongs to the cell and comes back as a value, never as a throw. */
export const evaluatePageFormula = (
  ast: PageFormulaNode,
  scope: PageFormulaScope,
  context: PageFormulaContext,
): PageFormulaOutcome => {
  const state: EvaluationState = {
    environment: { context, spend: (steps) => spend(state, steps) },
    remaining: PAGE_FORMULA_STEP_BUDGET,
    scope,
  };
  return evaluateNode(ast, state);
};
