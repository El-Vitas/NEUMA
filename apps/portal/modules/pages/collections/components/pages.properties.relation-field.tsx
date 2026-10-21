'use client';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { PAGE_RELATION_PICKER_VISIBLE_LIMIT } from '../constants/pages.relations.constants';
import { usePagesRelationEditing } from '../hooks/use.pages.relation-editing';
import { listRelationCandidatesToShow } from '../lib/pages.relations.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly disabled: boolean;
  readonly fieldId: string;
  readonly property: PageSchemaProperty;
  readonly rowId: string;
  readonly spaceId: string;
  readonly value: readonly string[];
}

/** Rows are added and removed one by one: the other side of a two-way relation follows in the same step. */
export const PagesPropertiesRelationField = ({
  ariaLabelledBy,
  disabled,
  fieldId,
  property,
  rowId,
  spaceId,
  value,
}: IProps) => {
  const t = useTranslations('pages');
  const [query, setQuery] = useState('');
  const editing = usePagesRelationEditing({
    collectionId: property.config.targetCollectionId ?? '',
    propertyKey: property.key,
    rowId,
    spaceId,
    value,
  });
  const untitled = t('untitled');
  const candidates = listRelationCandidatesToShow(editing.candidates, value, query);

  return (
    <fieldset
      aria-labelledby={ariaLabelledBy}
      className="m-0 flex min-w-0 flex-wrap items-center gap-1 border-0 p-0"
      id={fieldId}
    >
      {editing.shown.map((row) => (
        <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-sm" key={row.id}>
          {row.title === '' ? untitled : row.title}
          {!disabled && (
            <button
              aria-label={t('properties.relationRemove', { title: row.title === '' ? untitled : row.title })}
              className="inline-flex size-5 items-center justify-center rounded-sm hover:bg-background"
              disabled={editing.isChanging}
              onClick={() => editing.remove(row)}
              type="button"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <Popover onOpenChange={(isOpen) => isOpen && editing.loadCandidates(query)}>
          <PopoverTrigger asChild>
            <Button
              aria-label={t('properties.relationAdd', { property: property.label })}
              className="size-8"
              size="icon"
              type="button"
              variant="ghost"
            >
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-2 p-2">
            <Input
              aria-label={t('properties.relationSearch')}
              onChange={(event) => {
                setQuery(event.target.value);
                editing.loadCandidates(event.target.value);
              }}
              placeholder={t('properties.relationSearch')}
              value={query}
            />
            {editing.candidates === null ? (
              <p className="px-1 text-muted-foreground text-sm">{t('properties.relationLoading')}</p>
            ) : (
              <ul className="max-h-64 overflow-y-auto">
                {candidates.length === 0 && (
                  <li className="px-1 text-muted-foreground text-sm">{t('properties.relationNone')}</li>
                )}
                {candidates.map((row) => (
                  <li key={row.id}>
                    <button
                      className="flex min-h-11 w-full items-center px-2 text-left text-sm hover:bg-muted"
                      disabled={editing.isChanging}
                      onClick={() => editing.add(row)}
                      type="button"
                    >
                      {row.title === '' ? untitled : row.title}
                    </button>
                  </li>
                ))}
                {editing.candidates.length >= PAGE_RELATION_PICKER_VISIBLE_LIMIT && (
                  <li className="px-1 pt-1 text-muted-foreground text-xs">{t('properties.relationMore')}</li>
                )}
              </ul>
            )}
          </PopoverContent>
        </Popover>
      )}
    </fieldset>
  );
};
