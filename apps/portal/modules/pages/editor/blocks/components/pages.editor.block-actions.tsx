'use client';

import { useTranslations } from 'next-intl';
import type { Command } from 'prosemirror-state';
import { PagesSharingDialog } from '../../../sharing/components/pages.sharing.dialog';
import type { SharingChange } from '../../../sharing/types/pages.sharing.types';
import { PagesEditorPagePickerDialog } from '../../components/pages.editor.page-picker.dialog';
import { createPageBlockAlignmentCommand } from '../../lib/pages.editor.align.lib';
import { createPageFileDisplayCommand } from '../../media/lib/pages.editor.file.display.lib';
import type { PageDestination } from '../../menus/types/pages.editor.destination.types';
import type { PageEditorLinkShape, PageEditorLinkTarget } from '../../menus/types/pages.editor.link-shape.types';
import type { PageEditorPageShape, PageEditorPageShapeTarget } from '../../menus/types/pages.editor.page-shape.types';
import { createPageEditorCalloutIconCommand } from '../../structure/lib/pages.editor.callout-icon.lib';
import { createPageTableCommand } from '../../structure/lib/pages.editor.table.lib';
import type { PageEditorCalloutIconChoice } from '../../structure/types/pages.editor.callout-icon.types';
import type { PageSyncedReference } from '../../structure/types/pages.editor.synced.types';
import type { PageEditorTableAction } from '../../structure/types/pages.editor.table.types';
import { togglePageEditorHeadingFold } from '../../text/lib/pages.editor.heading-fold.lib';
import { createPageEditorBlockColorCommand } from '../lib/pages.editor.block-color.lib';
import { duplicatePageEditorBlock } from '../lib/pages.editor.block-copy.lib';
import { deletePageEditorBlocks } from '../lib/pages.editor.block-delete.lib';
import { createPageEditorBlockConversionCommand } from '../lib/pages.editor.convert.lib';
import type { PageEditorBlockColors } from '../types/pages.editor.block-color.types';
import type { PageEditorBlockRequest, PageEditorBlockRequestKind } from '../types/pages.editor.block-request.types';
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';
import { PagesEditorBlockMenu } from './pages.editor.block-menu';

interface IProps {
  /** The id of the block the menu is about; null for a block that has none yet. */
  readonly blockId: string | null;
  readonly calloutIcon: PageEditorCalloutIconChoice | null;
  readonly blockAlign: { readonly chosen: string | null } | null;
  readonly fileDisplay: { readonly chosen: string } | null;
  readonly linkTarget: PageEditorLinkTarget | null;
  readonly onLinkShape: (target: PageEditorLinkTarget, shape: PageEditorLinkShape) => void;
  readonly onPageShape: (shape: PageEditorPageShape) => void;
  readonly onUnsync: () => void;
  readonly syncedTarget: PageSyncedReference | null;
  readonly buttonAt: number | null;
  readonly onChooseCollection: (page: PageDestination) => void;
  readonly pageShape: PageEditorPageShapeTarget | null;
  readonly isInTable: boolean;
  readonly colors: PageEditorBlockColors;
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly foldState: { readonly isFolded: boolean } | null;
  readonly hasIdentity: boolean;
  readonly menuPosition: { readonly left: number; readonly top: number } | null;
  readonly onAsk: (kind: PageEditorBlockRequestKind) => void;
  readonly onBecomePage: () => void;
  readonly pageId: string | null;
  readonly request: PageEditorBlockRequest | null;
  readonly spaceId: string;
  readonly onClose: (kind: PageEditorBlockRequestKind) => void;
  readonly onCopyLink: () => void;
  readonly onHandOver: (page: PageDestination) => void;
  readonly onSyncInto: (page: PageDestination) => void;
  readonly onRunCommand: (command: Command) => void;
  readonly onSharingChanged: (change: SharingChange) => void;
}

/** The dialogs live here, not in the menu, because the menu closes as soon as one of them opens. */
export const PagesEditorBlockActions = ({
  blockId,
  calloutIcon,
  colors,
  blockAlign,
  fileDisplay,
  linkTarget,
  onLinkShape,
  onPageShape,
  onUnsync,
  syncedTarget,
  buttonAt,
  onChooseCollection,
  pageShape,
  isInTable,
  conversions,
  foldState,
  hasIdentity,
  menuPosition,
  onAsk,
  onBecomePage,
  onClose,
  onCopyLink,
  onHandOver,
  onSyncInto,
  onRunCommand,
  onSharingChanged,
  pageId,
  request,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      {menuPosition !== null && request?.kind === 'actions' && (
        <div className="absolute z-30" style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}>
          <PagesEditorBlockMenu
            blockAlign={blockAlign}
            calloutIcon={calloutIcon}
            canBecomePage={pageId !== null}
            colors={colors}
            conversions={conversions}
            fileDisplay={fileDisplay}
            folding={
              foldState === null || request === null
                ? null
                : {
                    isFolded: foldState.isFolded,
                    toggle: () => onRunCommand(togglePageEditorHeadingFold(request.blockStart)),
                  }
            }
            hasIdentity={hasIdentity}
            isButton={buttonAt !== null}
            isSynced={syncedTarget !== null}
            linkTarget={linkTarget}
            onBecomePage={onBecomePage}
            onBlockAlign={(align) => onRunCommand(createPageBlockAlignmentCommand(align))}
            onCalloutIcon={(icon) => onRunCommand(createPageEditorCalloutIconCommand(icon))}
            onChooseCollection={() => onAsk('button')}
            onClose={() => onClose('actions')}
            onColor={(kind, color) => onRunCommand(createPageEditorBlockColorCommand(kind, color))}
            onComment={() => onAsk('comments')}
            onConvert={(targetId) => onRunCommand(createPageEditorBlockConversionCommand(targetId))}
            onCopyLink={onCopyLink}
            onDelete={() => onRunCommand(deletePageEditorBlocks)}
            onDuplicate={() => onRunCommand(duplicatePageEditorBlock)}
            onFileDisplay={(display) => onRunCommand(createPageFileDisplayCommand(display))}
            onLinkShape={(shape) => {
              if (linkTarget !== null) onLinkShape(linkTarget, shape);
            }}
            onMoveToPage={() => onAsk('handover')}
            onPageShape={onPageShape}
            onShare={() => onAsk('share')}
            onSyncIntoPage={() => onAsk('sync')}
            onTableAction={(action: PageEditorTableAction) => onRunCommand(createPageTableCommand(action))}
            onUnsync={onUnsync}
            pageShape={pageShape}
            tableActions={isInTable}
          />
        </div>
      )}
      <PagesEditorPagePickerDialog
        exceptPageId={pageId}
        isOpen={request?.kind === 'button'}
        onCancel={() => onClose('button')}
        onChoose={onChooseCollection}
        spaceId={spaceId}
        wording={{
          candidates: t('collectionCandidates'),
          description: t('buttonPickDescription'),
          search: t('collectionPickSearch'),
          title: t('buttonCollection'),
        }}
      />
      <PagesEditorPagePickerDialog
        exceptPageId={pageId}
        isOpen={request?.kind === 'sync'}
        onCancel={() => onClose('sync')}
        onChoose={onSyncInto}
        spaceId={spaceId}
        wording={{
          candidates: t('moveBlocksCandidates'),
          description: t('syncedPickDescription'),
          search: t('moveBlocksSearch'),
          title: t('syncedInto'),
        }}
      />
      <PagesEditorPagePickerDialog
        exceptPageId={pageId}
        isOpen={request?.kind === 'handover'}
        onCancel={() => onClose('handover')}
        onChoose={onHandOver}
        spaceId={spaceId}
        wording={{
          candidates: t('moveBlocksCandidates'),
          description: t('moveBlocksDescription'),
          search: t('moveBlocksSearch'),
          title: t('moveBlocksTitle'),
        }}
      />
      {request?.kind === 'share' && blockId !== null && (
        <PagesSharingDialog
          blockId={blockId}
          onChanged={onSharingChanged}
          onClose={() => onClose('share')}
          scope="block"
          spaceId={spaceId}
          title=""
        />
      )}
    </>
  );
};
