import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PageIconGlyph } from '@/shared/components/portal/page-icon-glyph';
import { Badge } from '@/shared/components/ui/badge';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { formatSearchResultDate } from '@/shared/lib/search.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { SearchResult } from '@/shared/types/search.types';
import { resolveSearchResultParentDisplay, resolveSearchResultSpaceDisplay } from '../lib/search.result.lib';

interface IProps {
  readonly locale: string;
  readonly result: SearchResult;
}

export const SearchResultCard = ({ locale, result }: IProps) => {
  const t = useTranslations('portal.search');
  const tCommon = useTranslations('common');
  const tLocation = useTranslations('pages.searchResults');
  const href = ROUTES.PORTAL_SPACE_PAGE(result.spaceId, result.sourceId);
  const spaceDisplay = resolveSearchResultSpaceDisplay(result);
  const parentDisplay = resolveSearchResultParentDisplay(result);

  return (
    <article className="space-y-3 border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1 grid size-5 shrink-0 place-items-center text-[1.25rem] text-muted-foreground"
        >
          <PageIconGlyph icon={result.icon ?? null} />
        </span>
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
            {spaceDisplay.kind === 'known' && (
              <span className="font-medium">{tCommon('spaceLabel', { space: spaceDisplay.spaceName })}</span>
            )}
            {parentDisplay.kind === 'atSpaceRoot' && <span>{tLocation('atSpaceRoot')}</span>}
            {parentDisplay.kind === 'underParentPage' && (
              <span className="font-medium">
                {tLocation('parentPageLabel', { page: parentDisplay.parentPageTitle })}
              </span>
            )}
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
