'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesViewFiltering } from '../types/pages.view-filtering.types';
import { PagesCollectionFilterGroup } from './pages.collection.filter-group';

interface IProps {
  readonly filtering: PagesViewFiltering;
  readonly properties: readonly PageSchemaProperty[];
}

/** Clear-all sits apart at the end: it undoes everything at once and must not be hit by accident. */
export const PagesCollectionFilterEditor = ({ filtering, properties }: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <div className="space-y-2">
      <PagesCollectionFilterGroup filtering={filtering} group={filtering.root} path={[]} properties={properties} />
      {filtering.conditionCount > 0 && (
        <div className="flex justify-end border-border border-t pt-2">
          <Button
            className="min-h-11 text-muted-foreground hover:text-destructive"
            disabled={filtering.isSaving}
            onClick={() => filtering.clearConditions()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t('clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
};
