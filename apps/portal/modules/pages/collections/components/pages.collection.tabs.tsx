import { readPageViewConfiguration } from '@neuma/shared';
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
 * Links rather than buttons, so a view opens in another tab, can be shared, and works before scripts load.
 * Switching views does not scroll the page.
 */
export const PagesCollectionTabs = ({ activeViewName, label, views }: IProps) => (
  <nav aria-label={label}>
    <ul className="-mb-px flex items-center gap-1 overflow-x-auto">
      {views.map((view) => {
        const icon = readPageViewConfiguration(view.configuration).icon;
        return (
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
              {icon !== null && (
                <span aria-hidden="true" className="mr-1.5">
                  {icon}
                </span>
              )}
              {view.name}
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);
