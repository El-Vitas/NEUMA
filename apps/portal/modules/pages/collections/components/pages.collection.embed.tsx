import { FileText } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { PageSchema, PageSchemaProperty, PageSchemaView, PageViewOutcome } from '../types/pages.schema.types';
import { PagesCollectionView } from './pages.collection.view';

interface IProps {
  readonly outcome: PageViewOutcome | null;
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly title: string;
  readonly view: PageSchemaView;
}

/**
 * A collection looked at from inside another page.
 *
 * It says whose collection it is and how it is being looked at, and leads to
 * the collection itself: what is shown here is one way of reading it, and the
 * page it belongs to is where it is added to and changed. It does not repeat
 * the heading a collection carries on its own page — that one names the section
 * of a page, and here the section is the writing around it.
 */
export const PagesCollectionEmbed = async ({ outcome, properties, schema, spaceId, title, view }: IProps) => (
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
    {await PagesCollectionView({ canEdit: false, outcome, properties, schema, spaceId, view })}
  </section>
);
