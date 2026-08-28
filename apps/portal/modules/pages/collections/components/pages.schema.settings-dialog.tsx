'use client';

import { PAGE_PROPERTY_TYPE, type PagePropertyType } from '@company-brain/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_ADDABLE_PROPERTY_TYPES } from '../constants/pages.schema-editing.constants';
import { usePagesSchemaEditor } from '../hooks/use.pages.schema-editor';
import type { PageSchema } from '../types/pages.schema.types';
import { PagesSchemaPropertyRow } from './pages.schema.property-row';
import { PagesSchemaViewRow } from './pages.schema.view-row';

interface IProps {
  readonly onClose: () => void;
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/**
 * Where the shape of a collection is decided.
 *
 * Opened over the collection rather than on a page of its own, so what is being
 * changed stays in sight: adding a column and looking at the rows it will hold
 * is the same thought.
 */
export const PagesSchemaSettingsDialog = ({ onClose, schema, spaceId }: IProps) => {
  const t = useTranslations('pages.collection');
  const editor = usePagesSchemaEditor(schema, spaceId);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<PagePropertyType>(PAGE_PROPERTY_TYPE.SELECT);

  const addAndClear = () => {
    editor.addProperty(newLabel, newType);
    setNewLabel('');
  };

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('configureTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{t('configureDescription')}</p>
        <h3 className="text-muted-foreground text-xs uppercase tracking-wide">{t('propertiesTitle')}</h3>
        <ul className="m-0 list-none p-0">
          {editor.properties.map((property) => (
            <PagesSchemaPropertyRow editor={editor} key={property.key} property={property} />
          ))}
        </ul>
        <h3 className="border-border border-t pt-4 text-muted-foreground text-xs uppercase tracking-wide">
          {t('viewsTitle')}
        </h3>
        <ul className="m-0 list-none p-0">
          {editor.views.map((view) => (
            <PagesSchemaViewRow editor={editor} key={view.name} view={view} />
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 border-border border-t pt-4">
          <Input
            aria-label={t('propertyLabel')}
            className="max-w-56"
            disabled={editor.isSaving}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder={t('propertyLabel')}
            value={newLabel}
          />
          <Select
            disabled={editor.isSaving}
            onValueChange={(value) => setNewType(value as PagePropertyType)}
            value={newType}
          >
            <SelectTrigger aria-label={t('propertyType')} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_ADDABLE_PROPERTY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={editor.isSaving || newLabel.trim() === ''}
            onClick={addAndClear}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t('addProperty')}
          </Button>
        </div>
        <DialogFooter>
          <Button disabled={editor.isSaving} onClick={editor.save} type="button">
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
