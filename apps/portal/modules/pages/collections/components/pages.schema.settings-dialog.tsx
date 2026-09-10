'use client';

import { ArrowLeft, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useThemeRoot } from '@/shared/hooks/use.theme-root.hook';
import { usePagesSchemaEditor } from '../hooks/use.pages.schema-editor';
import { findBoardWithoutGrouping } from '../lib/pages.view-editing.lib';
import type { PageSchema } from '../types/pages.schema.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsOption } from './pages.schema.settings.option';
import { PagesSchemaSettingsProperties } from './pages.schema.settings.properties';
import { PagesSchemaSettingsProperty } from './pages.schema.settings.property';
import { PagesSchemaSettingsRoot } from './pages.schema.settings.root';
import { PagesSchemaSettingsView } from './pages.schema.settings.view';

interface IProps {
  readonly onClose: () => void;
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/**
 * Donde se decide la forma de una colección.
 *
 * Es un panel al costado y no un cuadro sobre la pantalla: lo que se cambia
 * aquí se ve enseguida en las filas de al lado, y taparlas para configurarlas
 * obliga a cerrar cada vez para saber si quedó como se quería.
 *
 * Se entra por niveles —propiedades, una propiedad, una opción—, cada uno con
 * su vuelta atrás. Un esquema entero desplegado de una vez no se lee: se busca.
 */
export const PagesSchemaSettingsDialog = ({ onClose, schema, spaceId }: IProps) => {
  const t = useTranslations('pages.collection');
  const editor = usePagesSchemaEditor(schema, spaceId);
  const themeRoot = useThemeRoot();
  const [route, setRoute] = useState<PagesSchemaSettingsRoute>({ level: 'ROOT' });

  const property =
    route.level === 'PROPERTY' || route.level === 'OPTION'
      ? editor.properties.find((candidate) => candidate.key === route.propertyKey)
      : undefined;
  const option =
    route.level === 'OPTION'
      ? property?.options?.find((candidate) => candidate.value === route.optionValue)
      : undefined;
  const view = route.level === 'VIEW' ? editor.views[route.viewPosition] : undefined;
  /**
   * Dónde se está de verdad.
   *
   * Una ruta puede quedar señalando algo que ya no está —una vista que no se
   * llegó a agregar, una propiedad recién quitada— y dibujar ese nivel sería
   * una pantalla en blanco con un título y nada debajo. En ese caso se está en
   * el principio, que es donde se puede volver a hacer algo.
   */
  const level = ((): PagesSchemaSettingsRoute['level'] => {
    if (route.level === 'VIEW' && view === undefined) return 'ROOT';
    if ((route.level === 'PROPERTY' || route.level === 'OPTION') && property === undefined) return 'ROOT';
    if (route.level === 'OPTION' && option === undefined) return 'PROPERTY';
    return route.level;
  })();
  /**
   * Lo que falta para poder guardar, dicho aquí en vez de dejar que el servidor
   * rechace la colección entera con un error que no señala a nadie.
   */
  const whatIsMissing = ((): null | string => {
    const board = findBoardWithoutGrouping(editor.views, editor.properties);
    return board === undefined ? null : t('boardNeedsGrouping', { view: board.name });
  })();

  /** Un paso atrás, no hasta el principio: quien entró a una opción vuelve a su propiedad, y quien entró a una propiedad vuelve a la lista de propiedades. */
  const goBack = (): void => {
    if (route.level === 'OPTION') setRoute({ level: 'PROPERTY', propertyKey: route.propertyKey });
    else if (route.level === 'PROPERTY') setRoute({ level: 'PROPERTIES' });
    else setRoute({ level: 'ROOT' });
  };

  const title = ((): string => {
    if (level === 'PROPERTIES') return t('propertiesTitle');
    if (level === 'PROPERTY') return property?.label ?? t('propertiesTitle');
    if (level === 'OPTION') return option?.value ?? t('optionsLabel');
    if (level === 'VIEW') return view?.name ?? t('viewsTitle');
    return t('configureTitle');
  })();

  return (
    <DialogPrimitive.Root modal={false} onOpenChange={(open) => !open && onClose()} open>
      <DialogPrimitive.Portal container={themeRoot ?? undefined}>
        <DialogPrimitive.Content
          /*
            Alto por la ventana visible y no por la del documento.
            `inset-y-0` estira el panel hasta el borde de abajo, que en un
            navegador con barras que aparecen y desaparecen no es el borde de lo
            que se ve: el pie —donde está guardar— quedaba justo fuera. `dvh`
            mide lo que de verdad se ve ahora mismo.
          */
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
              <PagesSchemaSettingsProperty editor={editor} onGo={setRoute} property={property} />
            )}
            {level === 'OPTION' && property !== undefined && option !== undefined && (
              <PagesSchemaSettingsOption editor={editor} onGo={setRoute} option={option} property={property} />
            )}
            {level === 'VIEW' && view !== undefined && route.level === 'VIEW' && (
              <PagesSchemaSettingsView editor={editor} onGo={setRoute} position={route.viewPosition} view={view} />
            )}
          </div>

          {/* El respiro de abajo cuenta con la barra del sistema, que en un móvil se come lo último que haya. */}
          <div className="shrink-0 space-y-2 border-border border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {whatIsMissing !== null && <p className="px-1 text-muted-foreground text-xs">{whatIsMissing}</p>}
            {/* Nada de lo que se toca aquí llega a las filas hasta guardar, así que se dice que queda algo por mandar. */}
            {whatIsMissing === null && editor.hasUnsavedChanges && (
              <p className="flex items-center gap-1.5 px-1 text-muted-foreground text-xs">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
                {t('unsavedChanges')}
              </p>
            )}
            <Button
              className="min-h-11 w-full"
              disabled={editor.isSaving || whatIsMissing !== null}
              onClick={editor.save}
              type="button"
            >
              {t('save')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
