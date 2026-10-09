import { PAGE_VIEW_OUTCOME_KIND, PAGE_VIEW_SHAPE } from '@neuma/shared';
import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewOutcome,
} from '../types/pages.schema.types';
import { PagesCollectionBoardMissingGrouping } from './pages.collection.board.missing-grouping';
import { PageViewRenderers } from './pages.collection.view-registry';

interface IProps {
  readonly canEdit: boolean;
  readonly outcome: PageViewOutcome | null;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly view: PageSchemaView;
}

/** A shape mismatch is shown explicitly: a view drawn from rows it cannot read would look empty, not broken. */
export const PagesCollectionView = async ({
  canEdit,
  outcome,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
  view,
}: IProps) => {
  const t = await getTranslations('pages');
  if (outcome === null) return <FormErrorBanner message={t('collection.loadError')} />;
  if (outcome.kind === PAGE_VIEW_OUTCOME_KIND.MISSING_GROUPING_PROPERTY) {
    return PagesCollectionBoardMissingGrouping();
  }

  const renderer = PageViewRenderers[view.type];
  if (renderer.shape === PAGE_VIEW_SHAPE.FLAT && outcome.kind === PAGE_VIEW_OUTCOME_KIND.FLAT_ROWS) {
    return renderer.render({ canEdit, outcome, personOptions, properties, schema, spaceId, view });
  }
  if (
    renderer.shape === 'EITHER' &&
    (outcome.kind === PAGE_VIEW_OUTCOME_KIND.FLAT_ROWS || outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS)
  ) {
    return renderer.render({ canEdit, outcome, personOptions, properties, schema, spaceId, view });
  }
  if (
    renderer.shape === PAGE_VIEW_SHAPE.GROUPED &&
    (outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS || outcome.kind === PAGE_VIEW_OUTCOME_KIND.BANDED_ROWS)
  ) {
    return renderer.render({ canEdit, outcome, personOptions, properties, schema, spaceId, view });
  }
  return <FormErrorBanner message={t('collection.shapeMismatch')} />;
};
