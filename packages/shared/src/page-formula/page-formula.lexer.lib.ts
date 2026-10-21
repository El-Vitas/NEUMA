import { Result } from '../result.js';
import { PAGE_FORMULA_SAVE_ERROR } from './page-formula.constants.js';
import { lookupOwnEntry } from './page-formula.lookup.lib.js';
import type { PageFormulaSaveError } from './page-formula.types.js';

export type PageFormulaToken =
  | { readonly from: number; readonly kind: 'END'; readonly to: number }
  | { readonly from: number; readonly kind: 'NUMBER'; readonly to: number; readonly value: number }
  | { readonly from: number; readonly kind: 'STRING'; readonly to: number; readonly value: string }
  | { readonly from: number; readonly kind: 'SYMBOL'; readonly text: string; readonly to: number }
  | { readonly from: number; readonly kind: 'WORD'; readonly text: string; readonly to: number };

const TWO_CHARACTER_SYMBOLS = ['==', '!=', '<=', '>=', '&&', '||'] as const;

const ONE_CHARACTER_SYMBOLS = '+-*/%(),<>!';

const ESCAPES: Readonly<Record<string, string>> = { '"': '"', '\\': '\\', n: '\n', t: '\t' };

const isDigit = (character: string): boolean => character >= '0' && character <= '9';

const isWordStart = (character: string): boolean =>
  (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z') || character === '_';

const isWordPart = (character: string): boolean => isWordStart(character) || isDigit(character);

const syntaxError = (message: string, from: number, to: number): PageFormulaSaveError => ({
  code: PAGE_FORMULA_SAVE_ERROR.SYNTAX,
  from,
  message,
  suggestions: [],
  to,
});

const scanWhile = (source: string, start: number, accepts: (character: string) => boolean): number => {
  let end = start;
  while (end < source.length && accepts(source.charAt(end))) end += 1;
  return end;
};

const scanNumber = (source: string, start: number): PageFormulaToken => {
  const integerEnd = scanWhile(source, start, isDigit);
  const hasFraction = source.charAt(integerEnd) === '.' && isDigit(source.charAt(integerEnd + 1));
  const end = hasFraction ? scanWhile(source, integerEnd + 1, isDigit) : integerEnd;
  return { from: start, kind: 'NUMBER', to: end, value: Number(source.slice(start, end)) };
};

const scanString = (source: string, start: number): Result<PageFormulaToken, PageFormulaSaveError> => {
  let value = '';
  let position = start + 1;
  while (position < source.length) {
    const character = source.charAt(position);
    if (character === '"') return Result.ok({ from: start, kind: 'STRING', to: position + 1, value });
    if (character !== '\\') {
      value += character;
      position += 1;
      continue;
    }
    const escaped = lookupOwnEntry(ESCAPES, source.charAt(position + 1));
    if (escaped === undefined) return Result.fail(syntaxError('Unknown escape in text', position, position + 2));
    value += escaped;
    position += 2;
  }
  return Result.fail(syntaxError('The text is missing its closing quote', start, source.length));
};

const scanSymbol = (source: string, start: number): Result<PageFormulaToken, PageFormulaSaveError> => {
  const pair = source.slice(start, start + 2);
  const twoCharacters = TWO_CHARACTER_SYMBOLS.find((symbol) => symbol === pair);
  if (twoCharacters !== undefined) return Result.ok({ from: start, kind: 'SYMBOL', text: pair, to: start + 2 });
  const character = source.charAt(start);
  if (ONE_CHARACTER_SYMBOLS.includes(character)) {
    return Result.ok({ from: start, kind: 'SYMBOL', text: character, to: start + 1 });
  }
  const message = character === '=' ? 'Use == to compare two values' : `Unexpected character "${character}"`;
  return Result.fail(syntaxError(message, start, start + 1));
};

const scanToken = (source: string, start: number): Result<PageFormulaToken, PageFormulaSaveError> => {
  const character = source.charAt(start);
  if (isDigit(character)) return Result.ok(scanNumber(source, start));
  if (character === '"') return scanString(source, start);
  if (isWordStart(character)) {
    const end = scanWhile(source, start, isWordPart);
    return Result.ok({ from: start, kind: 'WORD', text: source.slice(start, end), to: end });
  }
  return scanSymbol(source, start);
};

export const tokenizePageFormula = (source: string): Result<readonly PageFormulaToken[], PageFormulaSaveError> => {
  const tokens: PageFormulaToken[] = [];
  let position = 0;
  while (position < source.length) {
    if (source.charAt(position).trim() === '') {
      position += 1;
      continue;
    }
    const scanned = scanToken(source, position);
    if (scanned.isFail()) return Result.fail(scanned.getError());
    const token = scanned.getValue();
    tokens.push(token);
    position = token.to;
  }
  tokens.push({ from: source.length, kind: 'END', to: source.length });
  return Result.ok(tokens);
};
