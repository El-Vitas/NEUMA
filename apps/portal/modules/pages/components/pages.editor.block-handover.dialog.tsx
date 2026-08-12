'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { usePagesEditorDestinations } from '../hooks/use.pages.editor.destinations';
import { findPageDestinations } from '../lib/pages.editor.destination.lib';
import type { PageDestination } from '../types/pages.editor.destination.types';

interface IProps {
  readonly exceptPageId: string | null;
  readonly isOpen: boolean;
  readonly onCancel: () => void;
  readonly onChoose: (page: PageDestination) => void;
  readonly spaceId: string;
}

/**
 * Asks which page the blocks are going to, narrowing the space's pages as the
 * name is typed. Nothing moves until one is chosen, so closing this leaves the
 * page exactly as it was.
 */
export const PagesEditorBlockHandoverDialog = ({ exceptPageId, isOpen, onCancel, onChoose, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const [query, setQuery] = useState('');
  const destinations = usePagesEditorDestinations(isOpen, spaceId, exceptPageId);
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
          <DialogTitle>{t('moveBlocksTitle')}</DialogTitle>
          <DialogDescription>{t('moveBlocksDescription')}</DialogDescription>
        </DialogHeader>
        <Input
          aria-label={t('moveBlocksSearch')}
          className="min-h-11"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('moveBlocksSearch')}
          value={query}
        />
        {matches.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noMentionCandidates')}</p>
        ) : (
          <ul aria-label={t('moveBlocksCandidates')} className="max-h-72 divide-y divide-border overflow-y-auto">
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
