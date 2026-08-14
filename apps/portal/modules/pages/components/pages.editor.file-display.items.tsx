'use client';

import { PAGE_FILE_DISPLAYS, type PageFileDisplay } from '@company-brain/shared';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';

interface IProps {
  readonly onSelect: (display: PageFileDisplay) => void;
  readonly selected: string | null;
}

/** How the page shows the file it holds: read where it stands, or named on one line. */
export const PagesEditorFileDisplayItems = ({ onSelect, selected }: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      {PAGE_FILE_DISPLAYS.map((display) => (
        <DropdownMenuItem key={display} onSelect={() => onSelect(display)}>
          <span className="flex-1">{t(`fileDisplay.${display}`)}</span>
          {selected === display && <Check aria-hidden="true" className="ms-2 size-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
};
