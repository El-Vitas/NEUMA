'use client';

import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { PAGE_EDITOR_BLOCK_MENU_DROP_PX } from '../constants/pages.editor.blocks.constants';
import { usePagesEditorConversionRequest } from '../hooks/use.pages.editor.conversion';
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';
import { PagesEditorTurnIntoConfirmDialog } from './pages.editor.turn-into.confirm.dialog';
import { PagesEditorTurnIntoItems } from './pages.editor.turn-into.items';

interface IProps {
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly onClose: () => void;
  readonly onConvert: (targetId: string) => void;
  readonly onDelete: () => void;
  readonly onDuplicate: () => void;
}

/**
 * What can be done to the block the grip belongs to.
 *
 * Only what applies to that block is on the list — a block that cannot become
 * anything else is not offered the choice — so nothing here fails when chosen.
 */
export const PagesEditorBlockMenu = ({ conversions, onClose, onConvert, onDelete, onDuplicate }: IProps) => {
  const t = useTranslations('pages');
  const conversion = usePagesEditorConversionRequest(onConvert);

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open && conversion.pending === null) onClose();
        }}
        open
      >
        <DropdownMenuTrigger aria-label={t('blockActions')} className="sr-only" />
        <DropdownMenuContent
          align="start"
          onCloseAutoFocus={(event) => event.preventDefault()}
          side="bottom"
          sideOffset={PAGE_EDITOR_BLOCK_MENU_DROP_PX}
        >
          {conversions.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t('turnInto')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <PagesEditorTurnIntoItems conversions={conversions} onSelect={conversion.ask} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem onSelect={onDuplicate}>{t('duplicateBlock')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete}>{t('deleteBlock')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PagesEditorTurnIntoConfirmDialog
        conversion={conversion.pending}
        onCancel={() => {
          conversion.dismiss();
          onClose();
        }}
        onConfirm={(targetId) => {
          conversion.confirm(targetId);
          onClose();
        }}
      />
    </>
  );
};
