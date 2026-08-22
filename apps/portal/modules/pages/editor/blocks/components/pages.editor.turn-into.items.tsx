'use client';

import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';

interface IProps {
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly onSelect: (conversion: PageEditorBlockConversion) => void;
}

/**
 * The types on offer, named and marked when going through would leave
 * something behind. Whoever shows them decides where they hang and how the
 * warning is asked; this only lists what the editor can actually do.
 */
export const PagesEditorTurnIntoItems = ({ conversions, onSelect }: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      {conversions.map((conversion) => (
        <DropdownMenuItem key={conversion.id} onSelect={() => onSelect(conversion)}>
          <span className="flex-1">{t(`blockTypes.${conversion.labelKey}`)}</span>
          {conversion.losesContent && (
            <span className="ms-2 text-muted-foreground text-xs">{t('turnIntoLosesContent')}</span>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
};
