'use client';

import type { PageBlockAlignment, PageBlockColor, PageCalloutIcon, PageFileDisplay } from '@company-brain/shared';
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
import type { PageEditorBlockColorKind, PageEditorBlockColors } from '../types/pages.editor.block-color.types';
import type { PageEditorCalloutIconChoice } from '../types/pages.editor.callout-icon.types';
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';
import type { PageEditorBlockFolding } from '../types/pages.editor.heading-fold.types';
import type { PageEditorTableAction } from '../types/pages.editor.table.types';
import { PagesEditorBlockAlignItems } from './pages.editor.block-align.items';
import { PagesEditorBlockColorItems } from './pages.editor.block-color.items';
import { PagesEditorCalloutIconItems } from './pages.editor.callout-icon.items';
import { PagesEditorFileDisplayItems } from './pages.editor.file-display.items';
import { PagesEditorTableItems } from './pages.editor.table.items';
import { PagesEditorTurnIntoConfirmDialog } from './pages.editor.turn-into.confirm.dialog';
import { PagesEditorTurnIntoItems } from './pages.editor.turn-into.items';

interface IProps {
  readonly calloutIcon: PageEditorCalloutIconChoice | null;
  readonly canBecomePage: boolean;
  readonly colors: PageEditorBlockColors;
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly folding: PageEditorBlockFolding | null;
  readonly hasIdentity: boolean;
  readonly onBecomePage: () => void;
  readonly onCalloutIcon: (icon: PageCalloutIcon | null) => void;
  readonly onClose: () => void;
  readonly onColor: (kind: PageEditorBlockColorKind, color: PageBlockColor | null) => void;
  readonly onBlockAlign: (align: PageBlockAlignment) => void;
  readonly onFileDisplay: (display: PageFileDisplay) => void;
  readonly onTableAction: (action: PageEditorTableAction) => void;
  readonly onComment: () => void;
  readonly onConvert: (targetId: string) => void;
  readonly onCopyLink: () => void;
  readonly onDelete: () => void;
  readonly onDuplicate: () => void;
  readonly onMoveToPage: () => void;
  readonly blockAlign: { readonly chosen: string | null } | null;
  readonly fileDisplay: { readonly chosen: string } | null;
  readonly tableActions: boolean;
}

/**
 * What can be done to the block the grip belongs to.
 *
 * Only what applies to that block is on the list — a block that cannot become
 * anything else is not offered the choice — so nothing here fails when chosen.
 */
export const PagesEditorBlockMenu = ({
  calloutIcon,
  canBecomePage,
  colors,
  conversions,
  folding,
  hasIdentity,
  onBecomePage,
  onCalloutIcon,
  onClose,
  onColor,
  onComment,
  onConvert,
  onCopyLink,
  onDelete,
  onDuplicate,
  onMoveToPage,
  onBlockAlign,
  onFileDisplay,
  onTableAction,
  blockAlign,
  fileDisplay,
  tableActions,
}: IProps) => {
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
          {calloutIcon !== null && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t('calloutIcon')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <PagesEditorCalloutIconItems onSelect={onCalloutIcon} selected={calloutIcon.chosen} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {fileDisplay !== null && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t('fileDisplayLabel')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <PagesEditorFileDisplayItems onSelect={onFileDisplay} selected={fileDisplay.chosen} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {blockAlign !== null && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t('blockAlignLabel')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <PagesEditorBlockAlignItems onSelect={onBlockAlign} selected={blockAlign.chosen} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {tableActions && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t('tableActionsLabel')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <PagesEditorTableItems onSelect={onTableAction} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('textColor')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <PagesEditorBlockColorItems onSelect={(color) => onColor('text', color)} selected={colors.text} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('backgroundColor')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <PagesEditorBlockColorItems
                onSelect={(color) => onColor('background', color)}
                selected={colors.background}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {folding !== null && (
            <DropdownMenuItem onSelect={folding.toggle}>
              {folding.isFolded ? t('unfoldBlock') : t('foldBlock')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onDuplicate}>{t('duplicateBlock')}</DropdownMenuItem>
          {hasIdentity && <DropdownMenuItem onSelect={onCopyLink}>{t('copyBlockLink')}</DropdownMenuItem>}
          <DropdownMenuItem onSelect={onMoveToPage}>{t('moveBlocks')}</DropdownMenuItem>
          {canBecomePage && <DropdownMenuItem onSelect={onBecomePage}>{t('blockToPage')}</DropdownMenuItem>}
          <DropdownMenuItem onSelect={onComment}>{t('commentBlock')}</DropdownMenuItem>
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
