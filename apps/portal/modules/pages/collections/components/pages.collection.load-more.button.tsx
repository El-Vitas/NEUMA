'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';

interface IProps {
  readonly isLoading: boolean;
  readonly onLoad: () => void;
}

/** The same way to ask for more rows in a table, a list, a gallery and a column of a board. */
export const PagesCollectionLoadMoreButton = ({ isLoading, onLoad }: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <Button
      aria-busy={isLoading}
      className="w-full justify-center text-muted-foreground text-xs"
      data-testid="collection-load-more"
      disabled={isLoading}
      onClick={onLoad}
      size="sm"
      type="button"
      variant="ghost"
    >
      {t(isLoading ? 'loadingMore' : 'loadMore')}
    </Button>
  );
};
