'use client';

import type { PageViewType } from '@neuma/shared';
import {
  PAGE_VIEW_TYPE,
  PAGE_VIEW_TYPE_VALUES,
  pageViewSupportsGrouping,
  readPageViewConfiguration,
  readVisiblePropertyKeys,
} from '@neuma/shared';
import { ArrowLeft, ArrowRight, Copy, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_GROUP } from '../constants/pages.collections.constants';
import { listWhatConvertingDrops } from '../lib/pages.schema-editing.lib';
import { listGroupablePropertyKeys, readPageViewType } from '../lib/pages.view-editing.lib';
import type { PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsViewChart } from './pages.schema.settings.view.chart';
import { PagesSchemaSettingsViewDates } from './pages.schema.settings.view.dates';
import { PagesSchemaSettingsViewGrouping } from './pages.schema.settings.view.grouping';
import { PagesSchemaSettingsViewIcon } from './pages.schema.settings.view.icon';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly position: number;
  readonly view: PageSchemaView;
}

export const PagesSchemaSettingsView = ({ editor, onGo, position, view }: IProps) => {
  const t = useTranslations('pages.collection');
  const configuration = readPageViewConfiguration(view.configuration);
  const isTheLastView = editor.views.length <= 1;
  const groupable = listGroupablePropertyKeys(editor.properties);
  const bandable = groupable.filter((key) => key !== configuration.groupBy);
  const availableKeys = editor.properties.map((property) => property.key);
  const shown = readVisiblePropertyKeys(configuration.visibleProperties, availableKeys);
  const labelOf = (key: string): string => editor.properties.find((property) => property.key === key)?.label ?? key;
  const defaultFieldId = useId();
  /** Typed text stays on screen even when rejected: binding the field to the model made a duplicate name snap back. */
  const [typedName, setTypedName] = useState(view.name);
  /** Resets the typed name while rendering, not by remounting the panel, which replayed the enter animation. */
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

  /** Warns after converting, not before: nothing is persisted until save, so it can still be reverted. */
  const convertAndWarn = (type: PageViewType | undefined): void => {
    if (type === undefined || type === view.type) return;
    const dropped = listWhatConvertingDrops(view, type);
    editor.convertView(view.name, type);
    for (const what of dropped) toast.info(t(`convertDrops.${what}`));
  };

  const moveAndFollow = (direction: 'EARLIER' | 'LATER'): void => {
    editor.moveView(view.name, direction);
    onGo({ level: 'VIEW', viewPosition: direction === 'EARLIER' ? position - 1 : position + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PagesSchemaSettingsViewIcon
            disabled={editor.isSaving}
            icon={configuration.icon}
            onPick={(icon) => editor.setViewIcon(view.name, icon)}
            viewName={view.name}
          />
          <Input
            aria-label={t('viewName')}
            disabled={editor.isSaving}
            onChange={(event) => renameAndKeepWhatWasTyped(event.target.value)}
            value={typedName}
          />
        </div>
        {isNameTaken && <p className="px-2 text-muted-foreground text-xs">{t('viewNameTaken')}</p>}
        <div className="flex items-center justify-between gap-2 px-2 text-sm">
          <span className="text-muted-foreground">{t('viewType')}</span>
          <Select
            disabled={editor.isSaving}
            onValueChange={(value) => convertAndWarn(readPageViewType(value))}
            value={view.type}
          >
            <SelectTrigger aria-label={t('viewTypeFor', { view: view.name })} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_VIEW_TYPE_VALUES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`viewTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {pageViewSupportsGrouping(view.type) && (
        <PagesSchemaSettingsViewGrouping editor={editor} onGo={onGo} view={view} />
      )}
      {view.type === PAGE_VIEW_TYPE.CALENDAR && (
        <PagesSchemaSettingsViewDates editor={editor} onGo={onGo} view={view} />
      )}
      {view.type === PAGE_VIEW_TYPE.CHART && <PagesSchemaSettingsViewChart editor={editor} view={view} />}
      {/* Always shown, even without a second property to cross with: hiding it makes the feature undiscoverable. */}
      {view.type === PAGE_VIEW_TYPE.BOARD && (
        <div className="space-y-2">
          <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('bandsBy')}</p>
          <Select
            disabled={editor.isSaving || bandable.length === 0}
            onValueChange={(value) => editor.subGroupViewBy(view.name, value === PAGE_VIEW_NO_GROUP ? null : value)}
            value={configuration.subGroupBy ?? PAGE_VIEW_NO_GROUP}
          >
            <SelectTrigger aria-label={t('bandsFor', { view: view.name })} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PAGE_VIEW_NO_GROUP}>{t('noBands')}</SelectItem>
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
      <div className="space-y-1 border-border border-t pt-3">
        <Button
          className="min-h-11 w-full justify-start"
          disabled={editor.isSaving}
          onClick={() => editor.duplicateView(view.name)}
          type="button"
          variant="ghost"
        >
          <Copy aria-hidden="true" className="size-4" />
          {t('duplicateView', { view: view.name })}
        </Button>
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
