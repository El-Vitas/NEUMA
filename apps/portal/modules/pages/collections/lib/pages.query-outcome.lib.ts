import type { PageGroupByMode, PageQueryGroupOutcome } from '@neuma/shared';
import { PAGE_GROUP_BY_MODE, readPageViewConfiguration, UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { PAGE_VIEW_ROWS_REDUCER } from '../constants/pages.query.constants';
import type { GroupedOutcome, Labelling, PageQueryResult } from '../types/pages.query.types';
import type {
  PageRow,
  PageSchemaProperty,
  PageSchemaViewDraft,
  PageViewBand,
  PageViewGroup,
  PageViewOutcome,
} from '../types/pages.schema.types';

const readRows = (result: PageQueryResult, ids: readonly string[]): readonly PageRow[] =>
  ids.flatMap((id) => result.rows[id] ?? []);

/** What a group is called and coloured: an option by its name, a status group by its translation, else its key. */
export const describeGroupKey = (
  property: PageSchemaProperty | undefined,
  mode: PageGroupByMode,
  key: string,
  statusGroupLabel: (group: string) => string,
): Pick<PageViewGroup, 'color' | 'label'> => {
  if (key === UNASSIGNED_GROUP_KEY) return { color: null, label: '' };
  if (mode === PAGE_GROUP_BY_MODE.GROUP && property?.options?.some((option) => option.group !== null) === true) {
    return { color: null, label: statusGroupLabel(key) };
  }
  const option = property?.options?.find((candidate) => candidate.id === key);
  return option === undefined ? { color: null, label: key } : { color: option.color, label: option.value };
};

const toGroup = (
  outcome: PageQueryGroupOutcome,
  result: PageQueryResult,
  described: Pick<PageViewGroup, 'color' | 'label'>,
): PageViewGroup => ({
  ...described,
  key: outcome.key,
  nextCursor: outcome.nextCursor,
  rows: readRows(result, outcome.ids),
});

const toGroups = (outcome: GroupedOutcome, result: PageQueryResult, labelling: Labelling): readonly PageViewGroup[] =>
  outcome.groups.map((group) =>
    toGroup(group, result, describeGroupKey(labelling.property, labelling.mode, group.key, labelling.statusGroupLabel)),
  );

/** One band per value of the second grouping, with the columns of the first grouping inside each. */
const toBands = (outcome: GroupedOutcome, result: PageQueryResult, labelling: Labelling): readonly PageViewBand[] => {
  const bandKeys = [...new Set(outcome.groups.map((group) => group.subKey ?? UNASSIGNED_GROUP_KEY))];
  return bandKeys.map((bandKey) => ({
    ...describeGroupKey(labelling.bandProperty, PAGE_GROUP_BY_MODE.OPTION, bandKey, labelling.statusGroupLabel),
    groups: toGroups(
      { ...outcome, groups: outcome.groups.filter((group) => (group.subKey ?? UNASSIGNED_GROUP_KEY) === bandKey) },
      result,
      labelling,
    ),
    key: bandKey,
  }));
};

/**
 * The rows a view query answered, in the shape the renderers draw: flat rows, columns, or columns inside bands. A
 * group carries the cursor that continues it, so its screen can ask for more.
 */
export const toViewOutcome = (
  result: PageQueryResult,
  view: PageSchemaViewDraft,
  properties: readonly PageSchemaProperty[],
  statusGroupLabel: (group: string) => string,
): PageViewOutcome => {
  const configuration = readPageViewConfiguration(view.configuration);
  const outcome = result.reducers[PAGE_VIEW_ROWS_REDUCER];
  if (outcome?.kind === 'results') {
    return { kind: 'FLAT_ROWS', nextCursor: outcome.nextCursor, rows: readRows(result, outcome.ids) };
  }
  if (outcome?.kind !== 'groups') return { kind: 'FLAT_ROWS', rows: [] };
  const labelling: Labelling = {
    bandProperty: properties.find((property) => property.key === configuration.subGroupBy),
    mode: configuration.groupByMode,
    property: properties.find((property) => property.key === configuration.groupBy),
    statusGroupLabel,
  };
  return configuration.subGroupBy === null
    ? { groups: toGroups(outcome, result, labelling), kind: 'GROUPED_ROWS' }
    : { bands: toBands(outcome, result, labelling), kind: 'BANDED_ROWS' };
};
