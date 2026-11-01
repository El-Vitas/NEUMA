import { PAGE_FORMULA_TYPE } from './page-formula.constants.js';
import type { PageFormulaType } from './page-formula.types.js';

export type PageFormulaParameter = PageFormulaType | 'ANY';

/** One accepted form of a function: its fixed parameters, an optional repeating one, and what it gives back. */
export interface PageFormulaSignature {
  readonly parameters: readonly PageFormulaParameter[];
  readonly rest?: PageFormulaParameter;
  readonly returns: PageFormulaType;
}

const { BOOLEAN, DATE, LIST, NUMBER, TEXT } = PAGE_FORMULA_TYPE;

const NUMBER_TO_NUMBER: readonly PageFormulaSignature[] = [{ parameters: [NUMBER], returns: NUMBER }];

const DATE_TO_NUMBER: readonly PageFormulaSignature[] = [{ parameters: [DATE], returns: NUMBER }];

const TEXT_TO_TEXT: readonly PageFormulaSignature[] = [{ parameters: [TEXT], returns: TEXT }];

const TEXT_TEXT_TO_BOOLEAN: readonly PageFormulaSignature[] = [{ parameters: [TEXT, TEXT], returns: BOOLEAN }];

const TEXT_TEXT_TEXT_TO_TEXT: readonly PageFormulaSignature[] = [{ parameters: [TEXT, TEXT, TEXT], returns: TEXT }];

const DATE_SHIFT: readonly PageFormulaSignature[] = [{ parameters: [DATE, NUMBER, TEXT], returns: DATE }];

const VARIADIC_NUMBERS: readonly PageFormulaSignature[] = [{ parameters: [NUMBER], rest: NUMBER, returns: NUMBER }];

/** `if` is not here: its two branches share a type, which a signature cannot say. */
export const PAGE_FORMULA_SIGNATURES: Readonly<Record<string, readonly PageFormulaSignature[]>> = {
  abs: NUMBER_TO_NUMBER,
  ceil: NUMBER_TO_NUMBER,
  floor: NUMBER_TO_NUMBER,
  sign: NUMBER_TO_NUMBER,
  sqrt: NUMBER_TO_NUMBER,
  pow: [{ parameters: [NUMBER, NUMBER], returns: NUMBER }],
  round: [
    { parameters: [NUMBER], returns: NUMBER },
    { parameters: [NUMBER, NUMBER], returns: NUMBER },
  ],
  min: VARIADIC_NUMBERS,
  max: VARIADIC_NUMBERS,
  toNumber: [{ parameters: ['ANY'], returns: NUMBER }],
  concat: [{ parameters: [], rest: 'ANY', returns: TEXT }],
  contains: [
    { parameters: [TEXT, TEXT], returns: BOOLEAN },
    { parameters: [LIST, TEXT], returns: BOOLEAN },
  ],
  empty: [{ parameters: ['ANY'], returns: BOOLEAN }],
  endsWith: TEXT_TEXT_TO_BOOLEAN,
  startsWith: TEXT_TEXT_TO_BOOLEAN,
  format: [{ parameters: ['ANY'], returns: TEXT }],
  join: [
    { parameters: [LIST], returns: TEXT },
    { parameters: [LIST, TEXT], returns: TEXT },
  ],
  length: [
    { parameters: [TEXT], returns: NUMBER },
    { parameters: [LIST], returns: NUMBER },
  ],
  lower: TEXT_TO_TEXT,
  replace: TEXT_TEXT_TEXT_TO_TEXT,
  replaceAll: TEXT_TEXT_TEXT_TO_TEXT,
  slice: [
    { parameters: [TEXT, NUMBER], returns: TEXT },
    { parameters: [TEXT, NUMBER, NUMBER], returns: TEXT },
  ],
  trim: TEXT_TO_TEXT,
  upper: TEXT_TO_TEXT,
  date: [{ parameters: [TEXT], returns: DATE }],
  dateAdd: DATE_SHIFT,
  dateBetween: [{ parameters: [DATE, DATE, TEXT], returns: NUMBER }],
  dateSubtract: DATE_SHIFT,
  day: DATE_TO_NUMBER,
  end: [{ parameters: [DATE], returns: DATE }],
  formatDate: [{ parameters: [DATE, TEXT], returns: TEXT }],
  fromTimestamp: [{ parameters: [NUMBER], returns: DATE }],
  hour: DATE_TO_NUMBER,
  minute: DATE_TO_NUMBER,
  month: DATE_TO_NUMBER,
  now: [{ parameters: [], returns: DATE }],
  start: [{ parameters: [DATE], returns: DATE }],
  timestamp: DATE_TO_NUMBER,
  today: [{ parameters: [], returns: DATE }],
  weekday: DATE_TO_NUMBER,
  year: DATE_TO_NUMBER,
};

/** Functions whose answer depends on the time of day or on the zone of the person reading. */
export const PAGE_FORMULA_CLOCK_FUNCTIONS: readonly string[] = [
  'now',
  'today',
  'hour',
  'minute',
  'formatDate',
  'year',
  'month',
  'day',
  'weekday',
];
