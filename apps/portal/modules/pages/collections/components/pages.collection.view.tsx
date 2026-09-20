import { PAGE_VIEW_OUTCOME_KIND, PAGE_VIEW_SHAPE } from '@company-brain/shared';
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

/**
 * One view of a collection, drawn by whichever piece is registered for its kind.
 *
 * The rows that arrive carry the shape they were read in, and the piece says
 * which shape it draws. When the two disagree the mismatch is shown rather than
 * assumed away, because a view drawn from rows it cannot read would look empty
 * instead of broken.
 */
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
  /** Quien lee de las dos maneras recibe lo que llegue: agrupar es algo que se le pide, no lo que es. */
  if (
    renderer.shape === 'EITHER' &&
    (outcome.kind === PAGE_VIEW_OUTCOME_KIND.FLAT_ROWS || outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS)
  ) {
    return renderer.render({ canEdit, outcome, personOptions, properties, schema, spaceId, view });
  }
  /** Un tablero lee sus filas agrupadas, y en rejilla es una forma de estarlo. */
  if (
    renderer.shape === PAGE_VIEW_SHAPE.GROUPED &&
    (outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS || outcome.kind === PAGE_VIEW_OUTCOME_KIND.BANDED_ROWS)
  ) {
    return renderer.render({ canEdit, outcome, personOptions, properties, schema, spaceId, view });
  }
  return <FormErrorBanner message={t('collection.shapeMismatch')} />;
};
