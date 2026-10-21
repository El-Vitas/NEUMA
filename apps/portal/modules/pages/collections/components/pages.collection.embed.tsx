import { FileText } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { NO_PAGE_AGGREGATES } from '../constants/pages.aggregates.constants';
import { EMPTY_PAGE_COLLECTION_LOOKUPS } from '../constants/pages.lookups.constants';
import type { PageCollectionLookups } from '../types/pages.lookups.types';
import type {
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewOutcome,
} from '../types/pages.schema.types';
import { PagesCollectionLookupsProvider } from './pages.collection.lookups.provider';
import { PagesCollectionView } from './pages.collection.view';

interface IProps {
  readonly aggregates?: Promise<PageViewAggregates | null> | undefined;
  readonly lookups?: PageCollectionLookups;
  readonly outcome: PageViewOutcome | null;
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly title: string;
  readonly view: PageSchemaView;
}

/** Read-only view of a collection inside another page; it omits the collection page's own heading. */
export const PagesCollectionEmbed = async ({
  aggregates = NO_PAGE_AGGREGATES,
  lookups = EMPTY_PAGE_COLLECTION_LOOKUPS,
  outcome,
  properties,
  schema,
  spaceId,
  title,
  view,
}: IProps) => (
  <section aria-label={title} className="my-4 space-y-3 border-border border-s ps-4">
    <div className="flex items-baseline gap-2">
      <Link
        className="flex items-center gap-2 font-medium text-foreground text-sm hover:underline"
        href={ROUTES.PORTAL_SPACE_PAGE(spaceId, schema.pageId)}
      >
        <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        {title}
      </Link>
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{view.name}</span>
    </div>
    <PagesCollectionLookupsProvider lookups={lookups}>
      {
        await PagesCollectionView({
          aggregates,
          canEdit: false,
          changesCursor: null,
          outcome,
          properties,
          schema,
          spaceId,
          view,
        })
      }
    </PagesCollectionLookupsProvider>
  </section>
);
