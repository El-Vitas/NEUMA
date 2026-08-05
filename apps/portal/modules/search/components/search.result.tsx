import { Database, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { formatSearchResultDate } from '../lib/search.lib';
import type { SearchResult } from '../types/search.types';

interface IProps {
  readonly locale: string;
  readonly result: SearchResult;
}

export const SearchResultCard = ({ locale, result }: IProps) => {
  const t = useTranslations('portal.search');
  const href =
    result.sourceType === 'PAGE' ? ROUTES.PORTAL_SPACE_PAGE(result.spaceId, result.sourceId) : ROUTES.PORTAL_DATABASES;
  const Icon = result.sourceType === 'PAGE' ? FileText : Database;

  return (
    <article className="space-y-3 border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2>
            <Link
              className={`wrap-break-word font-medium text-foreground underline-offset-4 hover:underline ${FOCUS_RING_CLASS}`}
              href={href}
            >
              {result.title}
            </Link>
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground text-sm">
            <Badge variant="outline">{t(`sourceTypes.${result.sourceType}`)}</Badge>
            <span>{result.contentType}</span>
            <span>{t('spaceValue', { space: result.spaceId })}</span>
            <time dateTime={result.updatedAt}>{formatSearchResultDate(locale, result.updatedAt)}</time>
          </div>
        </div>
      </div>
      <p className="wrap-break-word text-muted-foreground text-sm/6">
        {result.snippet.map((part) =>
          part.highlighted ? (
            <mark className="bg-highlight-soft text-foreground" key={`highlight-${part.text}`}>
              {part.text}
            </mark>
          ) : (
            <span key={`text-${part.text}`}>{part.text}</span>
          ),
        )}
      </p>
    </article>
  );
};
