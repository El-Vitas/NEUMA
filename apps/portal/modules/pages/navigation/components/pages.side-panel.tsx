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
  readonly pages: readonly PageSummary[];
  readonly parentBreadcrumbPages: readonly PageSummary[];
  readonly spaceId: string;
  readonly spaceName?: string;
}

/**
 * A page read beside the one already open, instead of in place of it.
 *
 * It is not a dialog: the page behind it keeps its own scroll and its own
 * focus, and nothing here holds the keyboard hostage. What Radix's
 * non-modal `Dialog` gives for free is exactly what a panel like this needs
 * and nothing more — Escape and an outside click both ask to close it, a
 * menu opened from inside it is not mistaken for the outside, and no
 * overlay is drawn to dim what is still there to be read.
 *
 * Entra deslizándose desde el borde del que sale, porque aparecer de golpe no
 * dice de dónde vino ni que lo de atrás sigue ahí. Quien pidió menos
 * movimiento no lo ve moverse.
 */
export const PagesSidePanel = ({
  bundle,
  canEditContent,
  currentUserDisplayName,
  pages,
  parentBreadcrumbPages,
  spaceId,
  spaceName,
}: IProps) => {
  const {
    attachments,
    backlinks,
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

  const flushBeforeClose = useCallback(async (): Promise<void> => {
    await editorHandleRef.current?.flushPendingChanges();
  }, []);

  const sidePanel = usePagesSidePanel(flushBeforeClose);

  const handleOpenChange = (open: boolean): void => {
    if (open) return;
    void sidePanel.closePanel();
  };

  const handleOpenFullPage = async (): Promise<void> => {
    await flushBeforeClose();
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
          {/* Quien navega con lector de pantalla llega aquí sin ver el panel: el nombre lo dice el título. */}
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
          {/*
            Navegar dentro del panel cambia de página sin cambiar de dirección,
            así que el editor no se rehace solo: sin nombrar cuál página es, se
            quedaría con el título, el ícono y el bloqueo de la anterior.
          */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PagesEditor
              attachments={attachments}
              backlinks={backlinks}
              canEdit={canEditPage(canEditContent, page.lifecycle)}
              collectionSection={collectionSection}
              currentUserDisplayName={currentUserDisplayName}
              embeddedCollections={embeddedCollections}
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
