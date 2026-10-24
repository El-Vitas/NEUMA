import { Result } from '../result.js';
import { PAGE_FORMULA_MAX_DEPTH, PAGE_FORMULA_MAX_NODES, PAGE_FORMULA_SAVE_ERROR } from './page-formula.constants.js';
import type { PageFormulaToken } from './page-formula.lexer.lib.js';
import type {
  PageFormulaBinaryOperator,
  PageFormulaNode,
  PageFormulaPropertyInfo,
  PageFormulaSaveError,
} from './page-formula.types.js';
import { suggestClosestNames } from './page-formula.suggest.lib.js';

interface ParserState {
  depth: number;
  index: number;
  nodeCount: number;
  readonly properties: readonly PageFormulaPropertyInfo[];
  readonly tokens: readonly PageFormulaToken[];
}

type ParseResult = Result<PageFormulaNode, PageFormulaSaveError>;

const BINARY_LEVELS: readonly (readonly PageFormulaBinaryOperator[])[] = [
  ['or'],
  ['and'],
  ['==', '!='],
  ['<', '<=', '>', '>='],
  ['+', '-'],
  ['*', '/', '%'],
];

const OPERATOR_ALIASES: Readonly<Record<string, PageFormulaBinaryOperator>> = { '&&': 'and', '||': 'or' };

const saveError = (
  code: PageFormulaSaveError['code'],
  message: string,
  from: number,
  to: number,
  suggestions: readonly string[] = [],
): PageFormulaSaveError => ({ code, from, message, suggestions, to });

const syntaxFailure = (message: string, token: PageFormulaToken): ParseResult =>
  Result.fail(saveError(PAGE_FORMULA_SAVE_ERROR.SYNTAX, message, token.from, token.to));

const tooLargeFailure = (message: string, token: PageFormulaToken): ParseResult =>
  Result.fail(saveError(PAGE_FORMULA_SAVE_ERROR.TOO_LARGE, message, token.from, token.to));

const peek = (state: ParserState): PageFormulaToken =>
  state.tokens[state.index] ?? state.tokens[state.tokens.length - 1];

const advance = (state: ParserState): PageFormulaToken => {
  const token = peek(state);
  state.index += 1;
  return token;
};

const isSymbol = (token: PageFormulaToken, text: string): boolean => token.kind === 'SYMBOL' && token.text === text;

const describeToken = (token: PageFormulaToken): string => {
  switch (token.kind) {
    case 'END':
      return 'the end of the formula';
    case 'NUMBER':
    case 'STRING':
      return 'a value';
    default:
      return `"${token.text}"`;
  }
};

const countNode = (state: ParserState, token: PageFormulaToken): ParseResult | null => {
  state.nodeCount += 1;
  return state.nodeCount > PAGE_FORMULA_MAX_NODES
    ? tooLargeFailure(`A formula has up to ${String(PAGE_FORMULA_MAX_NODES)} parts`, token)
    : null;
};

const readOperatorText = (token: PageFormulaToken): string | null => {
  if (token.kind !== 'SYMBOL' && token.kind !== 'WORD') return null;
  return OPERATOR_ALIASES[token.text] ?? token.text;
};

const matchBinaryOperator = (
  state: ParserState,
  operators: readonly PageFormulaBinaryOperator[],
): PageFormulaBinaryOperator | null => {
  const operatorText = readOperatorText(peek(state));
  const matched = operators.find((operator) => operator === operatorText);
  if (matched === undefined) return null;
  advance(state);
  return matched;
};

const resolveProperty = (
  state: ParserState,
  label: string,
  token: PageFormulaToken,
): Result<PageFormulaPropertyInfo, PageFormulaSaveError> => {
  const exact = state.properties.find((property) => property.label === label);
  const loose = state.properties.find((property) => property.label.toLowerCase() === label.toLowerCase());
  const found = exact ?? loose;
  if (found !== undefined) return Result.ok(found);
  const suggestions = suggestClosestNames(
    label,
    state.properties.map((property) => property.label),
  );
  return Result.fail(
    saveError(
      PAGE_FORMULA_SAVE_ERROR.UNKNOWN_PROPERTY,
      `There is no property called "${label}"`,
      token.from,
      token.to,
      suggestions,
    ),
  );
};

const parsePropertyReference = (state: ParserState, nameToken: PageFormulaToken): ParseResult => {
  const open = advance(state);
  if (!isSymbol(open, '(')) return syntaxFailure('prop needs its name in parentheses: prop("Name")', open);
  const label = advance(state);
  if (label.kind !== 'STRING') return syntaxFailure('prop needs the name of a property in quotes', label);
  const close = advance(state);
  if (!isSymbol(close, ')')) return syntaxFailure('Close prop with a parenthesis', close);
  const resolved = resolveProperty(state, label.value, label);
  if (resolved.isFail()) return Result.fail(resolved.getError());
  const counted = countNode(state, nameToken);
  if (counted !== null) return counted;
  return Result.ok({
    from: nameToken.from,
    kind: 'PROPERTY',
    labelFrom: label.from,
    labelTo: label.to,
    propertyKey: resolved.getValue().key,
    to: close.to,
  });
};

const parseArguments = (state: ParserState): Result<readonly PageFormulaNode[], PageFormulaSaveError> => {
  const parsedArguments: PageFormulaNode[] = [];
  if (isSymbol(peek(state), ')')) return Result.ok(parsedArguments);
  for (;;) {
    const argument = parseExpression(state);
    if (argument.isFail()) return Result.fail(argument.getError());
    parsedArguments.push(argument.getValue());
    if (!isSymbol(peek(state), ',')) return Result.ok(parsedArguments);
    advance(state);
  }
};

const parseCall = (state: ParserState, nameToken: Extract<PageFormulaToken, { kind: 'WORD' }>): ParseResult => {
  advance(state);
  const parsedArguments = parseArguments(state);
  if (parsedArguments.isFail()) return Result.fail(parsedArguments.getError());
  const close = advance(state);
  if (!isSymbol(close, ')')) return syntaxFailure(`Expected ")" but found ${describeToken(close)}`, close);
  const counted = countNode(state, nameToken);
  if (counted !== null) return counted;
  return Result.ok({
    arguments: parsedArguments.getValue(),
    from: nameToken.from,
    kind: 'CALL',
    name: nameToken.text,
    to: close.to,
  });
};

const parseWord = (state: ParserState, token: Extract<PageFormulaToken, { kind: 'WORD' }>): ParseResult => {
  if (token.text === 'true' || token.text === 'false') {
    const counted = countNode(state, token);
    if (counted !== null) return counted;
    return Result.ok({ from: token.from, kind: 'LITERAL', to: token.to, value: token.text === 'true' });
  }
  if (!isSymbol(peek(state), '(')) return syntaxFailure(`"${token.text}" is not a value or a function`, token);
  return token.text === 'prop' ? parsePropertyReference(state, token) : parseCall(state, token);
};

const parseGroup = (state: ParserState): ParseResult => {
  const inner = parseExpression(state);
  if (inner.isFail()) return inner;
  const close = advance(state);
  return isSymbol(close, ')') ? inner : syntaxFailure(`Expected ")" but found ${describeToken(close)}`, close);
};

const parsePrimary = (state: ParserState): ParseResult => {
  const token = advance(state);
  switch (token.kind) {
    case 'NUMBER':
    case 'STRING': {
      const counted = countNode(state, token);
      if (counted !== null) return counted;
      return Result.ok({ from: token.from, kind: 'LITERAL', to: token.to, value: token.value });
    }
    case 'WORD':
      return parseWord(state, token);
    case 'SYMBOL':
      return isSymbol(token, '(') ? parseGroup(state) : syntaxFailure(`Unexpected ${describeToken(token)}`, token);
    default:
      return syntaxFailure('The formula ends before it is complete', token);
  }
};

const readUnaryOperator = (token: PageFormulaToken): '-' | 'not' | null => {
  if (isSymbol(token, '-')) return '-';
  if (isSymbol(token, '!') || (token.kind === 'WORD' && token.text === 'not')) return 'not';
  return null;
};

const parseUnary = (state: ParserState): ParseResult => {
  const operator = readUnaryOperator(peek(state));
  if (operator === null) return parsePrimary(state);
  const token = advance(state);
  state.depth += 1;
  if (state.depth > PAGE_FORMULA_MAX_DEPTH) return tooLargeFailure('The formula nests too deeply', token);
  const operand = parseUnary(state);
  state.depth -= 1;
  if (operand.isFail()) return operand;
  const counted = countNode(state, token);
  if (counted !== null) return counted;
  return Result.ok({
    from: token.from,
    kind: 'UNARY',
    operand: operand.getValue(),
    operator,
    to: operand.getValue().to,
  });
};

const parseLevel = (state: ParserState, level: number): ParseResult => {
  const operators = BINARY_LEVELS.at(level);
  if (operators === undefined) return parseUnary(state);
  const first = parseLevel(state, level + 1);
  if (first.isFail()) return first;
  let left = first.getValue();
  for (
    let operator = matchBinaryOperator(state, operators);
    operator !== null;
    operator = matchBinaryOperator(state, operators)
  ) {
    const right = parseLevel(state, level + 1);
    if (right.isFail()) return right;
    const counted = countNode(state, peek(state));
    if (counted !== null) return counted;
    left = { from: left.from, kind: 'BINARY', left, operator, right: right.getValue(), to: right.getValue().to };
  }
  return Result.ok(left);
};

const parseExpression = (state: ParserState): ParseResult => {
  state.depth += 1;
  if (state.depth > PAGE_FORMULA_MAX_DEPTH) return tooLargeFailure('The formula nests too deeply', peek(state));
  const parsed = parseLevel(state, 0);
  state.depth -= 1;
  return parsed;
};

export const parsePageFormulaTokens = (
  tokens: readonly PageFormulaToken[],
  properties: readonly PageFormulaPropertyInfo[],
): ParseResult => {
  const state: ParserState = { depth: 0, index: 0, nodeCount: 0, properties, tokens };
  const parsed = parseExpression(state);
  if (parsed.isFail()) return parsed;
  const trailing = peek(state);
  return trailing.kind === 'END'
    ? parsed
    : syntaxFailure(`Unexpected ${describeToken(trailing)} after the formula`, trailing);
};
