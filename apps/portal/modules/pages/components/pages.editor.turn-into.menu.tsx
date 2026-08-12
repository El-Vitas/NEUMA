'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';
import { PagesEditorTurnIntoConfirmDialog } from './pages.editor.turn-into.confirm.dialog';

interface IProps {
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly onConvert: (targetId: string) => void;
}

/**
 * Offers the types the selected blocks can become.
 *
 * The list comes from what the editor has already built and measured against
 * the page, so a conversion that would fail is never on it; the ones that would
 * leave something behind ask first.
 */
export const PagesEditorTurnIntoMenu = ({ conversions, onConvert }: IProps) => {
  const t = useTranslations('pages');
  const [pendingConversion, setPendingConversion] = useState<PageEditorBlockConversion | null>(null);
  if (conversions.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={t('turnInto')}
            className="min-h-11 min-w-11 px-3 text-foreground text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            {t('turnInto')}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onCloseAutoFocus={(event) => event.preventDefault()}>
          {conversions.map((conversion) => (
            <DropdownMenuItem
              key={conversion.id}
              onSelect={() => (conversion.losesContent ? setPendingConversion(conversion) : onConvert(conversion.id))}
            >
              <span className="flex-1">{t(`blockTypes.${conversion.labelKey}`)}</span>
              {conversion.losesContent && (
                <span className="ms-2 text-muted-foreground text-xs">{t('turnIntoLosesContent')}</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <PagesEditorTurnIntoConfirmDialog
        conversion={pendingConversion}
        onCancel={() => setPendingConversion(null)}
        onConfirm={(targetId) => {
          setPendingConversion(null);
          onConvert(targetId);
        }}
      />
    </>
  );
};
