import { Result } from '../result.js';
import { PAGE_FORMULA_CLOCK_FUNCTIONS, PAGE_FORMULA_SIGNATURES } from './page-formula.catalog.constants.js';
import type { PageFormulaParameter, PageFormulaSignature } from './page-formula.catalog.constants.js';
import { PAGE_FORMULA_SAVE_ERROR, PAGE_FORMULA_TYPE } from './page-formula.constants.js';
import { lookupOwnEntry } from './page-formula.lookup.lib.js';
import { readPageFormulaPropertyType } from './page-formula.property.lib.js';
import { suggestClosestNames } from './page-formula.suggest.lib.js';
import type {
  PageFormulaNode,
  PageFormulaPropertyInfo,
  PageFormulaSaveError,
  PageFormulaType,
} from './page-formula.types.js';

interface Inspection {
  readonly properties: ReadonlyMap<string, PageFormulaPropertyInfo>;
  readonly references: Set<string>;
  isClockDependent: boolean;
}

type TypeResult = Result<PageFormulaType, PageFormulaSaveError>;

const CONDITION_FUNCTION = 'if';

const COMPARABLE_TYPES: readonly PageFormulaType[] = [
  PAGE_FORMULA_TYPE.NUMBER,
  PAGE_FORMULA_TYPE.TEXT,
  PAGE_FORMULA_TYPE.DATE,
];

const mismatch = (message: string, node: PageFormulaNode, suggestions: readonly string[] = []): TypeResult =>
  Result.fail({
    code: PAGE_FORMULA_SAVE_ERROR.TYPE_MISMATCH,
    from: node.from,
    message,
    suggestions,
    to: node.to,
  });

const describeType = (type: PageFormulaType): string => type.toLowerCase();

const describeTypes = (types: readonly PageFormulaType[]): string => `(${types.map(describeType).join(', ')})`;

const inferEach = (
  nodes: readonly PageFormulaNode[],
  inspection: Inspection,
): Result<readonly PageFormulaType[], PageFormulaSaveError> => {
  const types: PageFormulaType[] = [];
  for (const node of nodes) {
    const inferred = inferType(node, inspection);
    if (inferred.isFail()) return Result.fail(inferred.getError());
    types.push(inferred.getValue());
  }
  return Result.ok(types);
};

const acceptsParameter = (parameter: PageFormulaParameter, type: PageFormulaType): boolean =>
  parameter === 'ANY' || parameter === type;

const acceptsSignature = (signature: PageFormulaSignature, types: readonly PageFormulaType[]): boolean => {
  const fixedCount = signature.parameters.length;
  if (types.length < fixedCount) return false;
  if (signature.rest === undefined && types.length > fixedCount) return false;
  return types.every((type, index) => {
    const parameter = signature.parameters.at(index) ?? signature.rest;
    return parameter !== undefined && acceptsParameter(parameter, type);
  });
};

const inferCall = (node: Extract<PageFormulaNode, { kind: 'CALL' }>, inspection: Inspection): TypeResult => {
  if (node.name === CONDITION_FUNCTION) return inferCondition(node, inspection);
  const signatures = lookupOwnEntry(PAGE_FORMULA_SIGNATURES, node.name);
  if (signatures === undefined) {
    const known = [...Object.keys(PAGE_FORMULA_SIGNATURES), CONDITION_FUNCTION];
    return Result.fail({
      code: PAGE_FORMULA_SAVE_ERROR.UNKNOWN_FUNCTION,
      from: node.from,
      message: `There is no function called "${node.name}"`,
      suggestions: suggestClosestNames(node.name, known),
      to: node.to,
    });
  }
  if (PAGE_FORMULA_CLOCK_FUNCTIONS.includes(node.name)) inspection.isClockDependent = true;
  const argumentTypes = inferEach(node.arguments, inspection);
  if (argumentTypes.isFail()) return Result.fail(argumentTypes.getError());
  const types = argumentTypes.getValue();
  const accepted = signatures.find((signature) => acceptsSignature(signature, types));
  return accepted === undefined
    ? mismatch(`${node.name} cannot take ${describeTypes(types)}`, node)
    : Result.ok(accepted.returns);
};

const inferCondition = (node: Extract<PageFormulaNode, { kind: 'CALL' }>, inspection: Inspection): TypeResult => {
  const argumentTypes = inferEach(node.arguments, inspection);
  if (argumentTypes.isFail()) return Result.fail(argumentTypes.getError());
  const types: readonly (PageFormulaType | undefined)[] = argumentTypes.getValue();
  const [condition, whenTrue, whenFalse] = types;
  if (types.length !== 3 || condition === undefined || whenTrue === undefined || whenFalse === undefined) {
    return mismatch('if takes a condition and two values: if(condition, a, b)', node);
  }
  if (condition !== PAGE_FORMULA_TYPE.BOOLEAN) return mismatch('The condition of if must be true or false', node);
  return whenTrue === whenFalse
    ? Result.ok(whenTrue)
    : mismatch(
        `The two values of if must be of one type, not ${describeType(whenTrue)} and ${describeType(whenFalse)}`,
        node,
      );
};

const inferProperty = (node: Extract<PageFormulaNode, { kind: 'PROPERTY' }>, inspection: Inspection): TypeResult => {
  const property = inspection.properties.get(node.propertyKey);
  const type = property === undefined ? null : readPageFormulaPropertyType(property);
  if (type === null) return mismatch(`"${property?.label ?? node.propertyKey}" cannot be used in a formula`, node);
  inspection.references.add(node.propertyKey);
  return Result.ok(type);
};

type BinaryNode = Extract<PageFormulaNode, { kind: 'BINARY' }>;

const inferLogical = (node: BinaryNode, left: PageFormulaType, right: PageFormulaType): TypeResult =>
  left === PAGE_FORMULA_TYPE.BOOLEAN && right === PAGE_FORMULA_TYPE.BOOLEAN
    ? Result.ok(PAGE_FORMULA_TYPE.BOOLEAN)
    : mismatch(`${node.operator} joins two conditions`, node);

const inferEquality = (node: BinaryNode, left: PageFormulaType, right: PageFormulaType): TypeResult =>
  left === right && left !== PAGE_FORMULA_TYPE.LIST
    ? Result.ok(PAGE_FORMULA_TYPE.BOOLEAN)
    : mismatch(`Cannot compare ${describeType(left)} with ${describeType(right)}`, node);

const inferOrdering = (node: BinaryNode, left: PageFormulaType, right: PageFormulaType): TypeResult =>
  left === right && COMPARABLE_TYPES.includes(left)
    ? Result.ok(PAGE_FORMULA_TYPE.BOOLEAN)
    : mismatch(`Cannot order ${describeType(left)} against ${describeType(right)}`, node);

const inferAddition = (node: BinaryNode, left: PageFormulaType, right: PageFormulaType): TypeResult =>
  left === right && (left === PAGE_FORMULA_TYPE.NUMBER || left === PAGE_FORMULA_TYPE.TEXT)
    ? Result.ok(left)
    : mismatch(`Cannot add ${describeType(right)} to ${describeType(left)}`, node);

const inferArithmetic = (node: BinaryNode, left: PageFormulaType, right: PageFormulaType): TypeResult =>
  left === PAGE_FORMULA_TYPE.NUMBER && right === PAGE_FORMULA_TYPE.NUMBER
    ? Result.ok(PAGE_FORMULA_TYPE.NUMBER)
    : mismatch(`${node.operator} needs two numbers`, node);

const inferBinary = (node: Extract<PageFormulaNode, { kind: 'BINARY' }>, inspection: Inspection): TypeResult => {
  const operands = inferEach([node.left, node.right], inspection);
  if (operands.isFail()) return Result.fail(operands.getError());
  const pair: readonly (PageFormulaType | undefined)[] = operands.getValue();
  const [left, right] = pair;
  if (left === undefined || right === undefined) return mismatch('Missing operand', node);
  switch (node.operator) {
    case 'and':
    case 'or':
      return inferLogical(node, left, right);
    case '==':
    case '!=':
      return inferEquality(node, left, right);
    case '<':
    case '<=':
    case '>':
    case '>=':
      return inferOrdering(node, left, right);
    case '+':
      return inferAddition(node, left, right);
    default:
      return inferArithmetic(node, left, right);
  }
};

const inferUnary = (node: Extract<PageFormulaNode, { kind: 'UNARY' }>, inspection: Inspection): TypeResult => {
  const operand = inferType(node.operand, inspection);
  if (operand.isFail()) return operand;
  const expected = node.operator === '-' ? PAGE_FORMULA_TYPE.NUMBER : PAGE_FORMULA_TYPE.BOOLEAN;
  return operand.getValue() === expected
    ? operand
    : mismatch(`${node.operator} needs a ${describeType(expected)}`, node);
};

const inferLiteralType = (value: string | number | boolean): PageFormulaType => {
  if (typeof value === 'number') return PAGE_FORMULA_TYPE.NUMBER;
  return typeof value === 'boolean' ? PAGE_FORMULA_TYPE.BOOLEAN : PAGE_FORMULA_TYPE.TEXT;
};

const inferType = (node: PageFormulaNode, inspection: Inspection): TypeResult => {
  switch (node.kind) {
    case 'LITERAL':
      return Result.ok(inferLiteralType(node.value));
    case 'PROPERTY':
      return inferProperty(node, inspection);
    case 'CALL':
      return inferCall(node, inspection);
    case 'BINARY':
      return inferBinary(node, inspection);
    case 'UNARY':
      return inferUnary(node, inspection);
  }
};

export interface PageFormulaInspection {
  readonly isClockDependent: boolean;
  readonly references: readonly string[];
  readonly resultType: PageFormulaType;
}

/** The type a formula produces, the properties it reads and whether it depends on the clock. */
export const inspectPageFormula = (
  ast: PageFormulaNode,
  properties: readonly PageFormulaPropertyInfo[],
): Result<PageFormulaInspection, PageFormulaSaveError> => {
  const inspection: Inspection = {
    isClockDependent: false,
    properties: new Map(properties.map((property) => [property.key, property])),
    references: new Set(),
  };
  const inferred = inferType(ast, inspection);
  if (inferred.isFail()) return Result.fail(inferred.getError());
  if (inferred.getValue() === PAGE_FORMULA_TYPE.LIST) {
    return Result.fail({
      code: PAGE_FORMULA_SAVE_ERROR.TYPE_MISMATCH,
      from: ast.from,
      message: 'A formula produces a number, text, true or false, or a date, not a list. Use length or join on it',
      suggestions: [],
      to: ast.to,
    });
  }
  return Result.ok({
    isClockDependent: inspection.isClockDependent,
    references: [...inspection.references],
    resultType: inferred.getValue(),
  });
};
