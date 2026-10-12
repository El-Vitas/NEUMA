'use client';

import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import { PAGE_EDITOR_TABLE_ACTIONS } from '../constants/pages.editor.table.constants';
import type { PageEditorTableAction } from '../types/pages.editor.table.types';

interface IProps {
  readonly onSelect: (action: PageEditorTableAction) => void;
}

export const PagesEditorTableItems = ({ onSelect }: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      {PAGE_EDITOR_TABLE_ACTIONS.map((action) => (
        <DropdownMenuItem key={action} onSelect={() => onSelect(action)}>
          {t(`tableActions.${action}`)}
        </DropdownMenuItem>
      ))}
    </>
  );
};
