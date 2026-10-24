'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useOptimistic } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useThemeRoot } from '@/shared/hooks/use.theme-root.hook';
import type { PageSchemaProperty } from '../../collections/types/pages.schema.types';
import { usePagesTemplates } from '../hooks/use.pages.templates';
import type { PageTemplateListing } from '../types/pages.templates.types';
import { PagesTemplatesPanelAdd } from './pages.templates.panel.add';
import { PagesTemplatesPanelRow } from './pages.templates.panel.row';

interface IProps {
  readonly collectionId: string;
  readonly listing: PageTemplateListing;
  readonly onClose: () => void;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** A side panel, like the settings of the collection, so the rows stay visible while the templates change. */
export const PagesTemplatesPanel = ({ collectionId, listing, onClose, properties, spaceId }: IProps) => {
  const t = useTranslations('pages.templates');
  const themeRoot = useThemeRoot();
  const [defaultTemplateId, chooseDefaultTemplate] = useOptimistic(listing.defaultTemplateId);
  const editing = usePagesTemplates({ collectionId, onDefaultChosen: chooseDefaultTemplate, spaceId });

  return (
    <DialogPrimitive.Root modal={false} onOpenChange={(open) => !open && onClose()} open>
      <DialogPrimitive.Portal container={themeRoot ?? undefined}>
        <DialogPrimitive.Content
          className="data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right fixed top-0 right-0 z-50 flex h-dvh max-h-dvh w-full max-w-96 flex-col border-border border-l bg-surface shadow-lg outline-none duration-200 ease-out data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:duration-0"
          data-testid="templates-panel"
          onFocusOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex shrink-0 items-center gap-1 border-border border-b p-2">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate px-1 font-medium text-foreground text-sm">
              {t('panelTitle')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button aria-label={t('close')} className="size-9" size="icon" variant="ghost">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="px-3 pt-3 text-muted-foreground text-xs">
            {t('panelHelp')}
          </DialogPrimitive.Description>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {listing.templates.length === 0 && (
              <p className="text-muted-foreground text-sm" data-testid="templates-empty">
                {t('empty')}
              </p>
            )}
            {listing.templates.map((template) => (
              <PagesTemplatesPanelRow
                editing={editing}
                isDefault={template.id === defaultTemplateId}
                key={template.id}
                properties={properties}
                spaceId={spaceId}
                template={template}
              />
            ))}
            <PagesTemplatesPanelAdd editing={editing} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
