'use client';

import { PAGE_VIEW_TYPE, readPageViewConfiguration, readVisiblePropertyKeys } from '@company-brain/shared';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_SUB_GROUP } from '../constants/pages.collections.constants';
import { listGroupablePropertyKeys } from '../lib/pages.view-editing.lib';
import type { PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  /** Su lugar entre las pestañas, que es por donde se llegó hasta ella. */
  readonly position: number;
  readonly view: PageSchemaView;
}

/**
 * Todo lo que una vista es: cómo se llama, en qué lugar de la fila de pestañas
 * va, si es con la que se abre la colección, por dónde agrupa si es un tablero,
 * y qué propiedades enseña.
 *
 * Lo que aquí se marca no cambia lo que ven las demás vistas: por eso están
 * todas aquí dentro y no en la pantalla de antes, donde cada ajuste parecería
 * de la colección entera.
 */
export const PagesSchemaSettingsView = ({ editor, onGo, position, view }: IProps) => {
  const t = useTranslations('pages.collection');
  const configuration = readPageViewConfiguration(view.configuration);
  /** Sin ninguna vista no hay forma de mirar las filas, así que la última no se quita. */
  const isTheLastView = editor.views.length <= 1;
  const groupable = listGroupablePropertyKeys(editor.properties);
  /** Las que pueden hacer bandas: las que hacen grupos, menos la que ya está haciendo las columnas. */
  const bandable = groupable.filter((key) => key !== configuration.groupBy);
  const availableKeys = editor.properties.map((property) => property.key);
  const shown = readVisiblePropertyKeys(configuration.visibleProperties, availableKeys);
  const labelOf = (key: string): string => editor.properties.find((property) => property.key === key)?.label ?? key;
  const defaultFieldId = useId();
  /**
   * Lo tecleado se queda en pantalla aunque no se pueda aplicar.
   *
   * El nombre es la dirección de la vista y dos no pueden llamarse igual, pero
   * atar el campo al modelo hacía que al escribir un nombre ya usado el texto
   * rebotara al anterior sin decir nada: desde fuera, el teclado no responde.
   */
  const [typedName, setTypedName] = useState(view.name);
  /**
   * Al pasar a otra vista, el campo enseña la suya y no el nombre a medio
   * escribir de la anterior. Se ajusta al dibujar y no remontando el panel:
   * remontarlo repetía la animación de entrada, y desde fuera parecía que el
   * botón de mover no había hecho nada.
   */
  const [lastSeenName, setLastSeenName] = useState(view.name);
  if (view.name !== lastSeenName) {
    setLastSeenName(view.name);
    setTypedName(view.name);
  }
  const isNameTaken = editor.views.some(
    (candidate) => candidate !== view && candidate.name === typedName.trim() && typedName.trim() !== '',
  );

  const renameAndKeepWhatWasTyped = (next: string): void => {
    setTypedName(next);
    editor.renameView(view.name, next);
  };

  /** El panel va con la vista: quien la mueve se queda mirándola, no la pierde de vista. */
  const moveAndFollow = (direction: 'EARLIER' | 'LATER'): void => {
    editor.moveView(view.name, direction);
    onGo({ level: 'VIEW', viewPosition: direction === 'EARLIER' ? position - 1 : position + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          aria-label={t('viewName')}
          disabled={editor.isSaving}
          onChange={(event) => renameAndKeepWhatWasTyped(event.target.value)}
          value={typedName}
        />
        {isNameTaken && <p className="px-2 text-muted-foreground text-xs">{t('viewNameTaken')}</p>}
        <div className="flex items-center justify-between gap-2 px-2 text-sm">
          <span className="text-muted-foreground">{t('viewType')}</span>
          <span className="text-foreground">{t(`viewTypes.${view.type}`)}</span>
        </div>
        <p className="px-2 text-muted-foreground text-xs">{t('renameViewWarning')}</p>
      </div>

      <div className="space-y-1 border-border border-t pt-3">
        <label
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-foreground text-sm hover:bg-muted"
          htmlFor={defaultFieldId}
        >
          <Checkbox
            checked={view.isDefault}
            disabled={editor.isSaving || view.isDefault}
            id={defaultFieldId}
            onCheckedChange={() => editor.makeViewDefault(view.name)}
          />
          {t('opensWithThisView')}
        </label>
        <div className="flex items-center gap-1 px-2">
          <Button
            aria-label={t('moveViewEarlier', { view: view.name })}
            className="size-11"
            disabled={editor.isSaving || position === 0}
            onClick={() => moveAndFollow('EARLIER')}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={t('moveViewLater', { view: view.name })}
            className="size-11"
            disabled={editor.isSaving || position === editor.views.length - 1}
            onClick={() => moveAndFollow('LATER')}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
          <span className="px-1 text-muted-foreground text-xs">
            {t('viewPosition', { position: position + 1, total: editor.views.length })}
          </span>
        </div>
      </div>

      {view.type === PAGE_VIEW_TYPE.BOARD && (
        <div className="space-y-2">
          <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('groupBy')}</p>
          {/*
            Sin ninguna propiedad que haga columnas no hay nada que elegir, y un
            desplegable vacío y apagado deja encallado a quien no sepa que lo que
            falta es una selección. Se dice, y se lleva a donde se arregla.
          */}
          {groupable.length === 0 ? (
            <div className="space-y-2 px-2">
              <p className="text-muted-foreground text-xs">{t('noGroupableProperty')}</p>
              <Button
                className="min-h-11 w-full justify-start"
                disabled={editor.isSaving}
                onClick={() => onGo({ level: 'PROPERTIES' })}
                type="button"
                variant="outline"
              >
                <Plus aria-hidden="true" className="size-4" />
                {t('addProperty')}
              </Button>
            </div>
          ) : (
            <Select
              disabled={editor.isSaving}
              onValueChange={(value) => editor.groupViewBy(view.name, value)}
              value={configuration.groupBy ?? ''}
            >
              <SelectTrigger aria-label={t('groupByFor', { view: view.name })} className="w-full">
                <SelectValue placeholder={t('groupByNone')} />
              </SelectTrigger>
              <SelectContent>
                {groupable.map((key) => (
                  <SelectItem key={key} value={key}>
                    {labelOf(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      {/*
        Se enseña siempre, aunque todavía no haya con qué cruzar. Esconderlo
        cuando falta una segunda propiedad deja a quien lo busca creyendo que no
        existe, y no hay dónde leer qué haría falta para que apareciera.
      */}
      {view.type === PAGE_VIEW_TYPE.BOARD && (
        <div className="space-y-2">
          <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('bandsBy')}</p>
          <Select
            disabled={editor.isSaving || bandable.length === 0}
            onValueChange={(value) => editor.subGroupViewBy(view.name, value === PAGE_VIEW_NO_SUB_GROUP ? null : value)}
            value={configuration.subGroupBy ?? PAGE_VIEW_NO_SUB_GROUP}
          >
            <SelectTrigger aria-label={t('bandsFor', { view: view.name })} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PAGE_VIEW_NO_SUB_GROUP}>{t('noBands')}</SelectItem>
              {bandable.map((key) => (
                <SelectItem key={key} value={key}>
                  {labelOf(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="px-2 text-muted-foreground text-xs">
            {bandable.length === 0 ? t('noBandable') : t('bandsHint')}
          </p>
        </div>
      )}
      <fieldset className="m-0 space-y-1 border-0 p-0">
        <legend className="px-2 pb-1 text-muted-foreground text-xs uppercase tracking-wide">
          {t('shownProperties')}
        </legend>
        {editor.properties.map((property) => (
          <label
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-foreground text-sm hover:bg-muted"
            htmlFor={`${view.name}-${property.key}`}
            key={property.key}
          >
            <Checkbox
              checked={shown.includes(property.key)}
              disabled={editor.isSaving}
              id={`${view.name}-${property.key}`}
              onCheckedChange={() => editor.toggleViewProperty(view.name, property.key)}
            />
            {property.label}
          </label>
        ))}
      </fieldset>
      <div className="border-border border-t pt-3">
        {isTheLastView ? (
          <p className="px-2 text-muted-foreground text-xs">{t('lastViewLocked')}</p>
        ) : (
          <Button
            className="min-h-11 w-full justify-start text-destructive hover:text-destructive"
            disabled={editor.isSaving}
            onClick={() => {
              editor.removeView(view.name);
              onGo({ level: 'ROOT' });
            }}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {t('removeView', { view: view.name })}
          </Button>
        )}
      </div>
    </div>
  );
};
