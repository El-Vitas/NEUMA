'use client';

import { ArrowLeft, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useThemeRoot } from '@/shared/hooks/use.theme-root.hook';
import { usePagesSchemaEditor } from '../hooks/use.pages.schema-editor';
import { readSettingsLevel, readSettingsStepBack, readSettingsTitle } from '../lib/pages.schema-settings.lib';
import type { PageRelatedRow, PageSchema } from '../types/pages.schema.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsFooter } from './pages.schema.settings.footer';
import { PagesSchemaSettingsOption } from './pages.schema.settings.option';
import { PagesSchemaSettingsProperties } from './pages.schema.settings.properties';
import { PagesSchemaSettingsProperty } from './pages.schema.settings.property';
import { PagesSchemaSettingsRoot } from './pages.schema.settings.root';
import { PagesSchemaSettingsView } from './pages.schema.settings.view';

interface IProps {
  readonly collections: readonly PageRelatedRow[];
  readonly onClose: () => void;
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/** A side panel, not a centered dialog, so changes stay visible in the rows beside it. */
export const PagesSchemaSettingsDialog = ({ collections, onClose, schema, spaceId }: IProps) => {
  const t = useTranslations('pages.collection');
  const editor = usePagesSchemaEditor(schema, spaceId);
  const themeRoot = useThemeRoot();
  const [route, setRoute] = useState<PagesSchemaSettingsRoute>({ level: 'ROOT' });

  const property =
    route.level === 'PROPERTY' || route.level === 'OPTION'
      ? editor.properties.find((candidate) => candidate.key === route.propertyKey)
      : undefined;
  const option =
    route.level === 'OPTION' ? property?.options?.find((candidate) => candidate.id === route.optionId) : undefined;
  const view = route.level === 'VIEW' ? editor.views[route.viewPosition] : undefined;
  const level = readSettingsLevel(route, {
    option: option !== undefined,
    property: property !== undefined,
    view: view !== undefined,
  });

  const goBack = (): void => setRoute(readSettingsStepBack(route));

  const title = readSettingsTitle(level, {
    configure: t('configureTitle'),
    option: option?.value,
    options: t('optionsLabel'),
    properties: t('propertiesTitle'),
    property: property?.label,
    view: view?.name,
    views: t('viewsTitle'),
  });

  return (
    <DialogPrimitive.Root modal={false} onOpenChange={(open) => !open && onClose()} open>
      <DialogPrimitive.Portal container={themeRoot ?? undefined}>
        <DialogPrimitive.Content
          /* `dvh` tracks the visible viewport; `inset-y-0` pushed the footer offscreen with collapsing bars. */
          className="data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right fixed top-0 right-0 z-50 flex h-dvh max-h-dvh w-full max-w-96 flex-col border-border border-l bg-surface shadow-lg outline-none duration-200 ease-out data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:duration-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex shrink-0 items-center gap-1 border-border border-b p-2">
            {level !== 'ROOT' && (
              <Button aria-label={t('back')} className="size-9" onClick={goBack} size="icon" variant="ghost">
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Button>
            )}
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate px-1 font-medium text-foreground text-sm">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button aria-label={t('close')} className="size-9" size="icon" variant="ghost">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {level === 'ROOT' && <PagesSchemaSettingsRoot editor={editor} onGo={setRoute} />}
            {level === 'PROPERTIES' && <PagesSchemaSettingsProperties editor={editor} onGo={setRoute} />}
            {level === 'PROPERTY' && property !== undefined && (
              <PagesSchemaSettingsProperty
                collections={collections}
                editor={editor}
                onGo={setRoute}
                property={property}
              />
            )}
            {level === 'OPTION' && property !== undefined && option !== undefined && (
              <PagesSchemaSettingsOption editor={editor} onGo={setRoute} option={option} property={property} />
            )}
            {level === 'VIEW' && view !== undefined && route.level === 'VIEW' && (
              <PagesSchemaSettingsView editor={editor} onGo={setRoute} position={route.viewPosition} view={view} />
            )}
          </div>

          <PagesSchemaSettingsFooter editor={editor} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
