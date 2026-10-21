import { isOneOf } from '../value-list.lib.js';
import type {
  PageOptionColor,
  PagePropertyOption,
  PagePropertyOptionDraft,
  PageStatusGroup,
} from './page-property.types.js';
import {
  PAGE_OPTION_COLOR,
  PAGE_OPTION_COLOR_VALUES,
  PAGE_STATUS_GROUP,
  PAGE_STATUS_GROUP_VALUES,
} from './page-property.types.js';

const DEFAULT_STATUS_OPTIONS = [
  { color: PAGE_OPTION_COLOR.GRAY, group: PAGE_STATUS_GROUP.TO_DO, value: 'Sin empezar' },
  { color: PAGE_OPTION_COLOR.BLUE, group: PAGE_STATUS_GROUP.IN_PROGRESS, value: 'En curso' },
  { color: PAGE_OPTION_COLOR.GREEN, group: PAGE_STATUS_GROUP.COMPLETE, value: 'Listo' },
] as const;

const MAX_ID_DRAWS = 1000;

const isKnownColor = (candidate: unknown): candidate is PageOptionColor =>
  typeof candidate === 'string' && isOneOf(PAGE_OPTION_COLOR_VALUES, candidate);

const isKnownGroup = (candidate: unknown): candidate is PageStatusGroup =>
  typeof candidate === 'string' && isOneOf(PAGE_STATUS_GROUP_VALUES, candidate);

interface StoredOptionFields {
  readonly color?: unknown;
  readonly group?: unknown;
  readonly id?: unknown;
  readonly value?: unknown;
}

const readFields = (stored: unknown): StoredOptionFields | null => {
  if (typeof stored === 'string') return stored === '' ? null : { value: stored };
  if (stored === null || typeof stored !== 'object') return null;
  return stored;
};

const readColor = (fields: StoredOptionFields): PageOptionColor | null =>
  isKnownColor(fields.color) ? fields.color : null;

const readGroup = (fields: StoredOptionFields): PageStatusGroup | null =>
  isKnownGroup(fields.group) ? fields.group : null;

const readName = (fields: StoredOptionFields): string | null =>
  typeof fields.value === 'string' && fields.value !== '' ? fields.value : null;

const readStoredOption = (stored: unknown): PagePropertyOption | null => {
  const fields = readFields(stored);
  if (fields === null) return null;
  const name = readName(fields);
  const { id } = fields;
  if (name === null || typeof id !== 'string' || id === '') return null;
  return { color: readColor(fields), group: readGroup(fields), id, value: name };
};

const readDraft = (stored: unknown): PagePropertyOptionDraft | null => {
  const fields = readFields(stored);
  if (fields === null) return null;
  const name = readName(fields);
  if (name === null) return null;
  const id = typeof fields.id === 'string' && fields.id !== '' ? fields.id : null;
  return { color: readColor(fields), group: readGroup(fields), id, value: name };
};

/** Lenient so a page never fails to open over a color; an entry that cannot be an option is left out. */
export const readPagePropertyOptions = (stored: unknown): readonly PagePropertyOption[] | null => {
  if (!Array.isArray(stored)) return null;
  return stored.map(readStoredOption).filter((option): option is PagePropertyOption => option !== null);
};

/** What a caller sends: an option without an id is new, and a plain name is a new option too. */
export const readPagePropertyOptionDrafts = (stored: unknown): readonly PagePropertyOptionDraft[] | null => {
  if (!Array.isArray(stored)) return null;
  return stored.map(readDraft).filter((option): option is PagePropertyOptionDraft => option !== null);
};

const drawFreshId = (taken: ReadonlySet<string>, generate: () => string): string => {
  for (let attempt = 0; attempt < MAX_ID_DRAWS; attempt += 1) {
    const candidate = generate();
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('No free option id after many draws');
};

/**
 * The id of an option the property already has is kept, so renaming it moves nothing. Any other id, including one the
 * client made up, is replaced by one of the server: only the server decides what identifies an option.
 */
export const assignPageOptionIds = (
  drafts: readonly PagePropertyOptionDraft[],
  stored: readonly PagePropertyOption[],
  generate: () => string,
): readonly PagePropertyOption[] => {
  const storedIds = new Set(stored.map((option) => option.id));
  const taken = new Set<string>();
  const kept = new Set(drafts.flatMap((draft) => (draft.id !== null && storedIds.has(draft.id) ? [draft.id] : [])));
  return drafts.map((draft) => {
    const reusableId = draft.id !== null && storedIds.has(draft.id) && !taken.has(draft.id) ? draft.id : null;
    const id = reusableId ?? drawFreshId(new Set([...taken, ...kept]), generate);
    taken.add(id);
    return { color: draft.color, group: draft.group, id, value: draft.value };
  });
};

export const createDefaultStatusOptions = (generate: () => string): readonly PagePropertyOption[] => {
  const taken = new Set<string>();
  return DEFAULT_STATUS_OPTIONS.map((template) => {
    const id = drawFreshId(taken, generate);
    taken.add(id);
    return { ...template, id };
  });
};

export const sortPageOptionsByGroup = (options: readonly PagePropertyOption[]): readonly PagePropertyOption[] =>
  PAGE_STATUS_GROUP_VALUES.flatMap((group) => options.filter((option) => option.group === group));

/** New rows start on the first option that has not begun. */
export const pickDefaultStatusOption = (options: readonly PagePropertyOption[]): PagePropertyOption | null =>
  options.find((option) => option.group === PAGE_STATUS_GROUP.TO_DO) ?? options.at(0) ?? null;

export const hasEveryStatusGroupAnOption = (options: readonly PagePropertyOption[]): boolean =>
  PAGE_STATUS_GROUP_VALUES.every((group) => options.some((option) => option.group === group));

export const findPageOption = (
  options: readonly PagePropertyOption[] | null,
  optionId: string,
): PagePropertyOption | null => options?.find((option) => option.id === optionId) ?? null;

/** Cycles the palette when the index runs past it. */
export const pickPageOptionColor = (index: number): PageOptionColor =>
  PAGE_OPTION_COLOR_VALUES[index % PAGE_OPTION_COLOR_VALUES.length] ?? PAGE_OPTION_COLOR.GRAY;
