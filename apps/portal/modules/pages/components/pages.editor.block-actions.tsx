'use client';

import type { PageBlockComment } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import type { Command } from 'prosemirror-state';
import { createPageBlockAlignmentCommand } from '../lib/pages.editor.align.lib';
import { createPageEditorBlockColorCommand } from '../lib/pages.editor.block-color.lib';
import {
  createPageEditorBlockCommentCommand,
  createPageEditorBlockCommentRemovalCommand,
} from '../lib/pages.editor.block-comment.lib';
import { duplicatePageEditorBlock } from '../lib/pages.editor.block-copy.lib';
import { deletePageEditorBlocks } from '../lib/pages.editor.block-delete.lib';
import { createPageEditorCalloutIconCommand } from '../lib/pages.editor.callout-icon.lib';
import { createPageEditorBlockConversionCommand } from '../lib/pages.editor.convert.lib';
import { createPageFileDisplayCommand } from '../lib/pages.editor.file.display.lib';
import { togglePageEditorHeadingFold } from '../lib/pages.editor.heading-fold.lib';
import { createPageTableCommand } from '../lib/pages.editor.table.lib';
import type { PageEditorBlockColors } from '../types/pages.editor.block-color.types';
import type { PageEditorBlockRequest, PageEditorBlockRequestKind } from '../types/pages.editor.block-request.types';
import type { PageEditorCalloutIconChoice } from '../types/pages.editor.callout-icon.types';
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';
import type { PageDestination } from '../types/pages.editor.destination.types';
import type { PageEditorLinkShape, PageEditorLinkTarget } from '../types/pages.editor.link-shape.types';
import type { PageEditorPageShape, PageEditorPageShapeTarget } from '../types/pages.editor.page-shape.types';
import type { PageSyncedReference } from '../types/pages.editor.synced.types';
import type { PageEditorTableAction } from '../types/pages.editor.table.types';
import { PagesEditorBlockCommentsDialog } from './pages.editor.block-comments.dialog';
import { PagesEditorBlockMenu } from './pages.editor.block-menu';
import { PagesEditorPagePickerDialog } from './pages.editor.page-picker.dialog';

interface IProps {
  readonly authorName: string;
  readonly calloutIcon: PageEditorCalloutIconChoice | null;
  readonly blockAlign: { readonly chosen: string | null } | null;
  readonly fileDisplay: { readonly chosen: string } | null;
  readonly linkTarget: PageEditorLinkTarget | null;
  readonly onLinkShape: (target: PageEditorLinkTarget, shape: PageEditorLinkShape) => void;
  readonly onPageShape: (shape: PageEditorPageShape) => void;
  readonly onUnsync: () => void;
  readonly syncedTarget: PageSyncedReference | null;
  readonly pageShape: PageEditorPageShapeTarget | null;
  readonly isInTable: boolean;
  readonly colors: PageEditorBlockColors;
  readonly comments: readonly PageBlockComment[];
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
}

/**
 * Everything a block can be asked to do: the menu beside its grip, and the two
 * conversations that outlive it — where the blocks are going, and what has been
 * said about this one.
 *
 * The menu closes as soon as one of those opens, so the dialogs live here
 * rather than inside it.
 */
export const PagesEditorBlockActions = ({
  authorName,
  calloutIcon,
  colors,
  blockAlign,
  fileDisplay,
  linkTarget,
  onLinkShape,
  onPageShape,
  onUnsync,
  syncedTarget,
  pageShape,
  isInTable,
  comments,
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
  pageId,
  request,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');

  const writeComment = (body: string): void => {
    onRunCommand(
      createPageEditorBlockCommentCommand({
        author: authorName,
        body,
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
      }),
    );
  };

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
            isSynced={syncedTarget !== null}
            linkTarget={linkTarget}
            onBecomePage={onBecomePage}
            onBlockAlign={(align) => onRunCommand(createPageBlockAlignmentCommand(align))}
            onCalloutIcon={(icon) => onRunCommand(createPageEditorCalloutIconCommand(icon))}
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
      <PagesEditorBlockCommentsDialog
        comments={comments}
        isOpen={request?.kind === 'comments'}
        onClose={() => onClose('comments')}
        onRemove={(commentId) => onRunCommand(createPageEditorBlockCommentRemovalCommand(commentId))}
        onWrite={writeComment}
      />
    </>
  );
};
