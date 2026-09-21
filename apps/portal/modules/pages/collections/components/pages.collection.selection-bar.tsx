'use client';

import { Copy, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { usePagesBulkEditing } from '../hooks/use.pages.bulk-editing';
import { usePagesRowSelection } from '../hooks/use.pages.row-selection';
import type { PagePersonOption, PagePropertyValues, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionSelectionAssign } from './pages.collection.selection-assign';

interface IProps {
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
  /** Lo que cada fila responde ahora, para poder devolverla a eso si se deshace. */
  readonly valuesByRow: Readonly<Record<string, PagePropertyValues>>;
}

/**
 * Lo que se puede hacer con las filas marcadas, y cuántas son.
 *
 * Aparece solo cuando hay alguna marcada: una barra siempre presente ocupa sitio
 * para decir «ninguna», que es lo que ya se ve sin ella.
 *
 * Todo lo que ofrece se puede deshacer desde el aviso que sale al terminar, y
 * por eso borrar no pregunta antes: preguntar y además poder deshacer es pedir
 * dos veces la misma decisión.
 */
export const PagesCollectionSelectionBar = ({ personOptions, properties, spaceId, valuesByRow }: IProps) => {
  const t = useTranslations('pages.collection');
  const selection = usePagesRowSelection();
  const [isAssigning, setIsAssigning] = useState(false);
  const bulk = usePagesBulkEditing(spaceId, valuesByRow, () => selection?.clear());

  if (selection === null || selection.count === 0) return null;

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1"
      data-testid="selection-bar"
    >
      <span className="px-1 font-medium text-foreground text-sm tabular-nums">
        {t('selectedRows', { count: selection.count })}
      </span>
      <Popover onOpenChange={setIsAssigning} open={isAssigning}>
        <PopoverTrigger asChild>
          <Button className="min-h-11 rounded-md" disabled={bulk.isWorking} size="sm" type="button" variant="ghost">
            {t('bulkAssign')}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))]">
          <PagesCollectionSelectionAssign
            onAssign={(propertyKey, value) => {
              setIsAssigning(false);
              bulk.setPropertyOnRows(selection.selected, propertyKey, value);
            }}
            personOptions={personOptions}
            properties={properties}
            rowCount={selection.count}
          />
        </PopoverContent>
      </Popover>
      <Button
        className="min-h-11 rounded-md"
        disabled={bulk.isWorking}
        onClick={() => bulk.duplicateRows(selection.selected)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Copy aria-hidden="true" className="size-4" />
        {t('bulkDuplicate')}
      </Button>
      <Button
        className="min-h-11 rounded-md text-destructive hover:text-destructive"
        disabled={bulk.isWorking}
        onClick={() => bulk.trashRows(selection.selected)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        {t('bulkTrash')}
      </Button>
      <Button
        aria-label={t('bulkClear')}
        className="ml-auto size-11 text-muted-foreground hover:text-foreground"
        onClick={selection.clear}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
};
