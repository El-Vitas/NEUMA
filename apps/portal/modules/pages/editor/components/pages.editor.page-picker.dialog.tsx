'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { usePagesEditorDestinations } from '../menus/hooks/use.pages.editor.destinations';
import { findPageDestinations } from '../menus/lib/pages.editor.destination.lib';
import type { PageDestination, PagePickerWording } from '../menus/types/pages.editor.destination.types';

interface IProps {
  readonly exceptPageId: string | null;
  readonly isOpen: boolean;
  readonly onCancel: () => void;
  readonly onChoose: (page: PageDestination) => void;
  readonly spaceId: string;
  readonly wording: PagePickerWording;
}

/** Shared by every flow that needs a page choice (moving blocks, embedding a collection); the caller sets the copy. */
export const PagesEditorPagePickerDialog = ({ exceptPageId, isOpen, onCancel, onChoose, spaceId, wording }: IProps) => {
  const t = useTranslations('pages');
  const [query, setQuery] = useState('');
  const destinations = usePagesEditorDestinations(isOpen, spaceId, exceptPageId, query);
  const matches = findPageDestinations(destinations, query);

  const leave = (): void => {
    setQuery('');
    onCancel();
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) leave();
      }}
      open={isOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{wording.title}</DialogTitle>
          <DialogDescription>{wording.description}</DialogDescription>
        </DialogHeader>
        <Input
          aria-label={wording.search}
          className="min-h-11"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={wording.search}
          value={query}
        />
        {matches.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noMentionCandidates')}</p>
        ) : (
          <ul aria-label={wording.candidates} className="max-h-72 divide-y divide-border overflow-y-auto">
            {matches.map((destination) => (
              <li key={destination.id}>
                <button
                  className="min-h-11 w-full px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    setQuery('');
                    onChoose(destination);
                  }}
                  type="button"
                >
                  {destination.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
