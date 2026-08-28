import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { buildCollectionViewHref } from '../lib/pages.collection.view-selection.lib';
import type { PageSchemaView } from '../types/pages.schema.types';

interface IProps {
  readonly activeViewName: string;
  readonly label: string;
  readonly views: readonly PageSchemaView[];
}

/**
 * The ways this collection can be looked at, with the one being looked at now
 * marked.
 *
 * Each one is a link rather than a button, so a view can be opened in another
 * tab, sent to somebody, or reached again by going back — and so the collection
 * still works before any script has loaded.
 */
export const PagesCollectionTabs = ({ activeViewName, label, views }: IProps) => (
  <nav aria-label={label}>
    <ul className="-mb-px flex items-center gap-1 overflow-x-auto border-border border-b">
      {views.map((view) => (
        <li key={view.name}>
          <Link
            aria-current={view.name === activeViewName ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center border-b-2 px-3 text-sm',
              FOCUS_RING_CLASS,
              view.name === activeViewName
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            href={buildCollectionViewHref(view.name)}
          >
            {view.name}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);
