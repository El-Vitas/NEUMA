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

/**
 * Lo que esta vista deja pasar.
 *
 * Las condiciones cuelgan de un grupo, y ese grupo puede llevar otros dentro:
 * así se dice «esto, y además una de estas otras», que con una sola lista de
 * condiciones unidas por «y» o por «o» no se podía decir.
 *
 * Quitar todo va al final y separado del resto, porque deshace de un golpe lo
 * que se armó de a poco: puesto entre los demás botones se toca sin querer.
 */
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
