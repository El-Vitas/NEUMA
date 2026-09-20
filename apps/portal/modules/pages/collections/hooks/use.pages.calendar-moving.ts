'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError } from '@/shared/lib/action-result';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type { PagesCalendarMoving } from '../types/pages.calendar.types';
import type { PageRow } from '../types/pages.schema.types';

/**
 * Llevar una fila a otro día, que es escribir su fecha.
 *
 * Se dibuja en el día nuevo antes de preguntar: quien acaba de soltar una
 * entrada sobre un día la quiere ver ahí, no medio segundo después. Si el
 * servidor dice que no, vuelve sola a donde estaba y se dice por qué.
 *
 * Solo viaja la fecha. Mandar la fila entera se llevaría por delante lo que otra
 * persona escribiera en ella mientras la entrada estaba en el aire.
 */
export const usePagesCalendarMoving = (dateProperty: null | string, spaceId: string): PagesCalendarMoving => {
  const tErrors = useTranslations('errors');
  const [moved, setMoved] = useState<Readonly<Record<string, string>>>({});
  const [carried, setCarried] = useState<null | string>(null);
  const [, startMoving] = useTransition();

  return {
    carried,
    /** Lo que la fila dice ahora mismo, contando lo que se acaba de soltar y el servidor todavía no confirmó. */
    dateOf: (row: PageRow, stored: null | string) => moved[row.id] ?? stored,
    forget: () => setCarried(null),
    moveTo: (rowId: string, date: string) => {
      setCarried(null);
      if (dateProperty === null) return;
      setMoved((current) => ({ ...current, [rowId]: date }));
      startMoving(async () => {
        const saved = await updatePageRowPropertiesAction({
          pageId: rowId,
          propertyValues: { [dateProperty]: date },
          spaceId,
        });
        if (!hasActionError(saved)) return;
        setMoved((current) => {
          const { [rowId]: _undone, ...rest } = current;
          return rest;
        });
        toast.error(tErrors('generic'));
      });
    },
    take: setCarried,
  };
};
