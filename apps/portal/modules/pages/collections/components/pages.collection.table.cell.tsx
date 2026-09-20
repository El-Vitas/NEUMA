'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { hasActionError } from '@/shared/lib/action-result';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { pagePropertyAnswersOnPick } from '../lib/pages.properties.lib';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type { PagePersonOption, PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertiesField } from './pages.properties.field';
import { PagesPropertyValue } from './pages.properties.value';

interface IProps {
  /** Hacia qué lado se pega lo que dice esta columna, ya resuelto por quien dibuja la tabla. */
  readonly alignmentClass: string;
  readonly ariaLabelledBy: string;
  readonly canEdit: boolean;
  /** Cómo se corta lo que la celda dice: en una línea, o en unas cuantas. */
  readonly contentClass: string;
  /** Cuánto mide de alto lo que se toca para responder, según el alto que pidió la vista. */
  readonly controlClass: string;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  readonly rowId: string;
  readonly spaceId: string;
  readonly value: PagePropertyValue | undefined;
}

/**
 * Una celda que se responde donde está.
 *
 * Abrir la fila entera para cambiar una palabra es el camino largo de lo que
 * la tabla ya está enseñando, así que la celda se convierte en su propio campo
 * al tocarla y vuelve a ser texto cuando la respuesta está dada. Solo viaja la
 * propiedad que se tocó: lo demás de la fila no es asunto de esta celda.
 *
 * Lo respondido se dibuja antes de que el servidor conteste, y si contesta que
 * no, la celda vuelve sola a lo que decía.
 */
export const PagesCollectionTableCell = ({
  alignmentClass,
  ariaLabelledBy,
  canEdit,
  contentClass,
  controlClass,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  property,
  rowId,
  spaceId,
  value,
}: IProps) => {
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PagePropertyValue | undefined>(value);
  const [, startWriting] = useTransition();
  const [shown, showWritten] = useOptimistic(
    value,
    (_current: PagePropertyValue | undefined, written: PagePropertyValue) => written,
  );

  const write = (written: PagePropertyValue): void => {
    setIsEditing(false);
    if (written === value) return;
    startWriting(async () => {
      showWritten(written);
      const saved = await updatePageRowPropertiesAction({
        pageId: rowId,
        propertyValues: { [property.key]: written },
        spaceId,
      });
      if (hasActionError(saved)) {
        setDraft(value);
        toast.error(tErrors('generic'));
      }
    });
  };

  /**
   * Lo que se elige queda respondido en el mismo gesto. Lo que se escribe pasa
   * por estados a medio escribir, y se guarda al salir del campo.
   */
  const answer = (answered: PagePropertyValue): void => {
    setDraft(answered);
    if (pagePropertyAnswersOnPick(property.type)) write(answered);
  };

  const answerKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      write(draft ?? '');
      return;
    }
    if (event.key !== 'Escape') return;
    setDraft(value);
    setIsEditing(false);
  };

  if (!canEdit) {
    return (
      <span className={cn('block min-w-0', contentClass)}>
        <PagesPropertyValue personOptions={personOptions} property={property} value={shown} />
      </span>
    );
  }

  if (!isEditing) {
    return (
      <button
        aria-label={t('properties.editCell', { property: property.label })}
        className={cn(
          '-mx-2 flex min-h-11 w-full items-center rounded-none px-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
          controlClass,
          alignmentClass,
        )}
        data-testid="collection-cell"
        onClick={() => setIsEditing(true)}
        title={t('properties.editCell', { property: property.label })}
        type="button"
      >
        {/* El corte va aquí dentro y no en el botón: las líneas se cuentan sobre lo que se lee, no sobre la caja. */}
        <span className={cn('block min-w-0', contentClass)}>
          <PagesPropertyValue personOptions={personOptions} property={property} value={shown} />
        </span>
      </button>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: envuelve al campo para escuchar el Enter y el Escape que este no interpreta
    <div onKeyDown={answerKey}>
      <PagesPropertiesField
        ariaLabelledBy={ariaLabelledBy}
        claimsFocus
        disabled={false}
        onBlur={pagePropertyAnswersOnPick(property.type) ? undefined : () => write(draft ?? '')}
        onChange={answer}
        personOptions={personOptions}
        property={property}
        value={draft}
      />
    </div>
  );
};
