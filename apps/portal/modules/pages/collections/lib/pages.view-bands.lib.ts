import { PAGE_VIEW_OUTCOME_KIND } from '@neuma/shared';
import { PAGE_VIEW_FLAT_GROUP_KEY } from '../constants/pages.query.constants';
import type {
  PageViewBand,
  PageViewBandedOutcome,
  PageViewFlatOutcome,
  PageViewGroupedOutcome,
} from '../types/pages.schema.types';

/**
 * The rows of a view as bands of columns, whatever its shape: rows that are not grouped are one band with one unnamed
 * group, so table, list, gallery and board draw, page and follow changes through one path.
 */
export const readViewBands = (
  outcome: PageViewBandedOutcome | PageViewFlatOutcome | PageViewGroupedOutcome,
): readonly PageViewBand[] => {
  switch (outcome.kind) {
    case PAGE_VIEW_OUTCOME_KIND.BANDED_ROWS:
      return outcome.bands;
    case PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS:
      return [{ color: null, groups: outcome.groups, key: '', label: '' }];
    default:
      return [
        {
          color: null,
          groups: [
            {
              color: null,
              key: PAGE_VIEW_FLAT_GROUP_KEY,
              label: '',
              nextCursor: outcome.nextCursor ?? null,
              rows: outcome.rows,
            },
          ],
          key: '',
          label: '',
        },
      ];
  }
};
