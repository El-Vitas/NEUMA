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
 *
 * Cambiar de vista no mueve la página: quien mira una colección que está a
 * media página ya llegó hasta ella, y devolverlo arriba le hace bajar otra vez
 * para ver lo que acaba de pedir.
 */
export const PagesCollectionTabs = ({ activeViewName, label, views }: IProps) => (
  <nav aria-label={label}>
    <ul className="-mb-px flex items-center gap-1 overflow-x-auto">
      {views.map((view) => (
        <li key={view.name}>
          <Link
            aria-current={view.name === activeViewName ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors',
              FOCUS_RING_CLASS,
              view.name === activeViewName
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
            href={buildCollectionViewHref(view.name)}
            scroll={false}
          >
            {view.name}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);
