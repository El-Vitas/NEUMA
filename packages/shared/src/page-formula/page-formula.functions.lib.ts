import { PAGE_FORMULA_RUNTIME_ERROR, PAGE_FORMULA_TEXT_MAX_LENGTH } from './page-formula.constants.js';
import { PAGE_FORMULA_DATE_RUNNERS } from './page-formula.dates.lib.js';
import { failWith, failWithInvalidArgument, succeedWith, succeedWithNumber } from './page-formula.outcome.lib.js';
import type {
  PageFormulaEnvironment,
  PageFormulaOutcome,
  PageFormulaRunner,
  PageFormulaValue,
} from './page-formula.types.js';
import {
  formatFormulaValue,
  isFormulaValueEmpty,
  readFormulaList,
  readFormulaNumber,
  readFormulaText,
} from './page-formula.values.lib.js';

const WORK_LIMIT_MESSAGE = 'The formula does more work than one cell allows';

export const failWithWorkLimit = (): PageFormulaOutcome =>
  failWith(PAGE_FORMULA_RUNTIME_ERROR.WORK_LIMIT, WORK_LIMIT_MESSAGE);

const failWithTextTooLong = (): PageFormulaOutcome =>
  failWith(PAGE_FORMULA_RUNTIME_ERROR.WORK_LIMIT, `A text is up to ${String(PAGE_FORMULA_TEXT_MAX_LENGTH)} characters`);

/** A text result that would pass the limit is an error: nothing ever carries a runaway string. */
export const succeedWithText = (text: string): PageFormulaOutcome =>
  text.length > PAGE_FORMULA_TEXT_MAX_LENGTH ? failWithTextTooLong() : succeedWith(text);

const overNumber =
  (operate: (value: number) => number): PageFormulaRunner =>
  (functionArguments) => {
    const value = readFormulaNumber(functionArguments[0]);
    return value === null ? succeedWith(null) : succeedWithNumber(operate(value));
  };

const runSquareRoot: PageFormulaRunner = (functionArguments) => {
  const value = readFormulaNumber(functionArguments[0]);
  if (value === null) return succeedWith(null);
  return value < 0
    ? failWithInvalidArgument('The square root of a negative number does not exist')
    : succeedWith(Math.sqrt(value));
};

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
};

const runRound: PageFormulaRunner = (functionArguments) => {
  const value = readFormulaNumber(functionArguments[0]);
  if (value === null) return succeedWith(null);
  const digits = readFormulaNumber(functionArguments[1]) ?? 0;
  return Number.isInteger(digits) && digits >= 0 && digits <= 15
    ? succeedWithNumber(roundTo(value, digits))
    : failWithInvalidArgument('The digits of round are a whole number from 0 to 15');
};

const runPower: PageFormulaRunner = (functionArguments) => {
  const base = readFormulaNumber(functionArguments[0]);
  const exponent = readFormulaNumber(functionArguments[1]);
  return base === null || exponent === null ? succeedWith(null) : succeedWithNumber(base ** exponent);
};

const overAllNumbers =
  (choose: (numbers: readonly number[]) => number): PageFormulaRunner =>
  (functionArguments) => {
    const numbers = functionArguments.map(readFormulaNumber);
    return numbers.every((value): value is number => value !== null) ? succeedWith(choose(numbers)) : succeedWith(null);
  };

const runToNumber: PageFormulaRunner = (functionArguments) => {
  const value = functionArguments.at(0);
  if (value === null || value === undefined) return succeedWith(null);
  if (typeof value === 'number') return succeedWith(value);
  if (typeof value === 'boolean') return succeedWith(value ? 1 : 0);
  const trimmed = typeof value === 'string' ? value.trim() : '';
  const parsed = Number(trimmed);
  return trimmed !== '' && Number.isFinite(parsed)
    ? succeedWith(parsed)
    : failWithInvalidArgument(`${formatFormulaValue(value)} is not a number`);
};

const readTextOrBlank = (value: PageFormulaValue | undefined): string => readFormulaText(value) ?? '';

const chargeForText = (text: string, environment: PageFormulaEnvironment): boolean => environment.spend(text.length);

const overText =
  (transform: (text: string) => string): PageFormulaRunner =>
  (functionArguments, environment) => {
    const text = readTextOrBlank(functionArguments[0]);
    return chargeForText(text, environment) ? succeedWithText(transform(text)) : failWithWorkLimit();
  };

const overTextPair =
  (test: (text: string, other: string) => boolean): PageFormulaRunner =>
  (functionArguments, environment) => {
    const text = readTextOrBlank(functionArguments[0]);
    return chargeForText(text, environment)
      ? succeedWith(test(text, readTextOrBlank(functionArguments[1])))
      : failWithWorkLimit();
  };

const runReplace =
  (replaceEveryMatch: boolean): PageFormulaRunner =>
  (functionArguments, environment) => {
    const text = readTextOrBlank(functionArguments[0]);
    const search = readTextOrBlank(functionArguments[1]);
    const replacement = readTextOrBlank(functionArguments[2]);
    if (!chargeForText(text, environment)) return failWithWorkLimit();
    if (search === '') return succeedWithText(text);
    const matches = replaceEveryMatch ? text.split(search).length - 1 : Math.min(1, text.split(search, 2).length - 1);
    const resultLength = text.length + matches * (replacement.length - search.length);
    if (resultLength > PAGE_FORMULA_TEXT_MAX_LENGTH) return failWithTextTooLong();
    return succeedWithText(
      replaceEveryMatch ? text.replaceAll(search, replacement) : text.replace(search, () => replacement),
    );
  };

const runSlice: PageFormulaRunner = (functionArguments, environment) => {
  const text = readTextOrBlank(functionArguments[0]);
  const from = readFormulaNumber(functionArguments[1]);
  const to = readFormulaNumber(functionArguments[2]);
  if (!chargeForText(text, environment)) return failWithWorkLimit();
  return succeedWithText(text.slice(from ?? 0, to ?? undefined));
};

const runLength: PageFormulaRunner = (functionArguments) => {
  const [value] = functionArguments;
  return succeedWith(typeof value === 'string' ? value.length : readFormulaList(value).length);
};

const runContains: PageFormulaRunner = (functionArguments, environment) => {
  const [container, wanted] = functionArguments;
  const needle = readTextOrBlank(wanted);
  if (typeof container === 'string')
    return chargeForText(container, environment) ? succeedWith(container.includes(needle)) : failWithWorkLimit();
  const items = readFormulaList(container);
  if (!environment.spend(items.length)) return failWithWorkLimit();
  return succeedWith(items.some((item) => formatFormulaValue(item) === needle));
};

const runJoin: PageFormulaRunner = (functionArguments, environment) => {
  const items = readFormulaList(functionArguments[0]);
  if (!environment.spend(items.length)) return failWithWorkLimit();
  const separatorArgument = functionArguments.at(1);
  const separator = separatorArgument === undefined ? ', ' : readTextOrBlank(separatorArgument);
  return succeedWithText(items.map((item) => formatFormulaValue(item)).join(separator));
};

const runConcat: PageFormulaRunner = (functionArguments, environment) => {
  const pieces = functionArguments.map((value) => formatFormulaValue(value));
  const total = pieces.reduce((sum, piece) => sum + piece.length, 0);
  return environment.spend(total) ? succeedWithText(pieces.join('')) : failWithWorkLimit();
};

const runFormat: PageFormulaRunner = (functionArguments) => succeedWithText(formatFormulaValue(functionArguments[0]));

const runEmpty: PageFormulaRunner = (functionArguments) => succeedWith(isFormulaValueEmpty(functionArguments[0]));

export const PAGE_FORMULA_RUNNERS: Readonly<Record<string, PageFormulaRunner>> = {
  abs: overNumber(Math.abs),
  ceil: overNumber(Math.ceil),
  concat: runConcat,
  contains: runContains,
  empty: runEmpty,
  endsWith: overTextPair((text, other) => text.endsWith(other)),
  floor: overNumber(Math.floor),
  format: runFormat,
  join: runJoin,
  length: runLength,
  lower: overText((text) => text.toLowerCase()),
  max: overAllNumbers((numbers) => Math.max(...numbers)),
  min: overAllNumbers((numbers) => Math.min(...numbers)),
  pow: runPower,
  replace: runReplace(false),
  replaceAll: runReplace(true),
  round: runRound,
  sign: overNumber(Math.sign),
  slice: runSlice,
  sqrt: runSquareRoot,
  startsWith: overTextPair((text, other) => text.startsWith(other)),
  toNumber: runToNumber,
  trim: overText((text) => text.trim()),
  upper: overText((text) => text.toUpperCase()),
  ...PAGE_FORMULA_DATE_RUNNERS,
};
