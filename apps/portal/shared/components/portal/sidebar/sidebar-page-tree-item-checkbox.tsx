'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/shared/components/ui/checkbox';

interface IProps {
  readonly isPicked: boolean;
  readonly onToggle: () => void;
  readonly pageTitle: string;
}

/** Whether this one page rides along with the batch, named for whoever reads instead of sees it. */
export const SidebarPageTreeItemCheckbox = ({ isPicked, onToggle, pageTitle }: IProps) => {
  const t = useTranslations('pages.selection');

  return (
    <span className="grid min-h-11 min-w-11 shrink-0 place-items-center">
      <Checkbox
        aria-label={isPicked ? t('deselectPage', { name: pageTitle }) : t('selectPage', { name: pageTitle })}
        checked={isPicked}
        onCheckedChange={onToggle}
      />
    </span>
  );
};
