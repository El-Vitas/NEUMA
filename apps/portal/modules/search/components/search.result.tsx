import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { formatSearchResultDate } from '@/shared/lib/search.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { SearchResult } from '@/shared/types/search.types';

interface IProps {
  readonly locale: string;
  readonly result: SearchResult;
}

export const SearchResultCard = ({ locale, result }: IProps) => {
  const t = useTranslations('portal.search');
  const href = ROUTES.PORTAL_SPACE_PAGE(result.spaceId, result.sourceId);

  return (
    <article className="space-y-3 border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <FileText aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
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
        {/* A snippet is one sentence cut into pieces, so where a piece stands is what tells it from another that reads the same. */}
        {result.snippet.map((part, at) =>
          part.highlighted ? (
            <mark className="bg-highlight-soft text-foreground" key={`snippet-${String(at)}`}>
              {part.text}
            </mark>
          ) : (
            <span key={`snippet-${String(at)}`}>{part.text}</span>
          ),
        )}
      </p>
    </article>
  );
};
