'use client';

import { Maximize2, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { type ComponentRef, type CSSProperties, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useThemeRoot } from '@/shared/hooks/use.theme-root.hook';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { PagesEditor } from '../../editor/components/pages.editor';
import { canEditPage } from '../../lib/pages.lib';
import type { PageSummary } from '../../types/pages.types';
import { usePagesSidePanel } from '../hooks/use.pages.side-panel';
import type { PagesSidePanelBundle } from '../types/pages.side-panel.types';
import { PagesSidePanelResizeHandle } from './pages.side-panel.resize-handle';

interface IProps {
  readonly bundle: PagesSidePanelBundle;
  readonly canEditContent: boolean;
  readonly currentUserDisplayName?: string;
  readonly currentUserId?: string;
  readonly pages: readonly PageSummary[];
  readonly parentBreadcrumbPages: readonly PageSummary[];
  readonly spaceId: string;
  readonly spaceName?: string;
}

/**
 * Built on Radix's non-modal `Dialog`: the page behind keeps its scroll and focus, Escape and outside clicks
 * close it, menus opened inside it do not count as outside, and no overlay is drawn.
 */
export const PagesSidePanel = ({
  bundle,
  canEditContent,
  currentUserDisplayName,
  currentUserId,
  pages,
  parentBreadcrumbPages,
  spaceId,
  spaceName,
}: IProps) => {
  const {
    attachments,
    backlinks,
    blockSync,
    blockSyncFailed,
    collectionSection,
    embeddedCollections,
    isFavorite,
    page,
    parentSchema,
    personOptions,
  } = bundle;
  const t = useTranslations('pages.sidePanel');
  const router = useRouter();
  const themeRoot = useThemeRoot();
  const editorHandleRef = useRef<ComponentRef<typeof PagesEditor>>(null);

  const flushPendingChanges = useCallback(async (): Promise<void> => {
    await editorHandleRef.current?.flushPendingChanges();
  }, []);

  const sidePanel = usePagesSidePanel(flushPendingChanges);

  const handleOpenChange = (open: boolean): void => {
    if (open) return;
    void sidePanel.closePanel();
  };

  const handleOpenFullPage = async (): Promise<void> => {
    await flushPendingChanges();
    router.push(ROUTES.PORTAL_SPACE_PAGE(spaceId, page.id));
  };

  const handleSaved = (): void => router.refresh();

  const widthStyle = { '--pages-side-panel-width': `${sidePanel.width}px` } as CSSProperties;

  return (
    <DialogPrimitive.Root modal={false} onOpenChange={handleOpenChange} open>
      <DialogPrimitive.Portal container={themeRoot ?? undefined}>
        <DialogPrimitive.Content
          className="data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right fixed inset-y-0 right-0 z-40 flex w-full flex-col border-border border-l bg-surface shadow-lg outline-none duration-200 ease-out data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:duration-0 sm:w-(--pages-side-panel-width)"
          onOpenAutoFocus={(event) => event.preventDefault()}
          style={widthStyle}
        >
          <DialogPrimitive.Title className="sr-only">{t('title')}</DialogPrimitive.Title>
          <PagesSidePanelResizeHandle
            onChangeWidth={sidePanel.handleWidthChange}
            onPointerDown={sidePanel.startResizing}
            width={sidePanel.width}
          />
          <div className="flex shrink-0 items-center justify-end gap-1 border-border border-b p-2">
            <Button
              aria-label={t('openFullPage')}
              className="size-11"
              onClick={() => void handleOpenFullPage()}
              size="icon"
              title={t('openFullPage')}
              variant="ghost"
            >
              <Maximize2 aria-hidden="true" className="size-4" />
            </Button>
            <DialogPrimitive.Close asChild>
              <Button aria-label={t('close')} className="size-11" size="icon" title={t('close')} variant="ghost">
                <XIcon aria-hidden="true" className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {/* Navigating inside the panel keeps the same address, so the editor needs a key to remount per page. */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PagesEditor
              attachments={attachments}
              backlinks={backlinks}
              blockSync={blockSync}
              canEdit={canEditPage(canEditContent, page.lifecycle) && !blockSyncFailed}
              collectionSection={collectionSection}
              currentUserDisplayName={currentUserDisplayName}
              currentUserId={currentUserId}
              embeddedCollections={embeddedCollections}
              isBlockSyncUnavailable={blockSyncFailed}
              isFavorite={isFavorite}
              key={`${page.id}:${page.lifecycle}`}
              onNavigateToPage={sidePanel.navigateWithinPanel}
              onSaved={handleSaved}
              page={page}
              pages={pages}
              parentBreadcrumbPages={parentBreadcrumbPages}
              parentSchema={parentSchema}
              personOptions={personOptions}
              ref={editorHandleRef}
              spaceId={spaceId}
              spaceName={spaceName}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
