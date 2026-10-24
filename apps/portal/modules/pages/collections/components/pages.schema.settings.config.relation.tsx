'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { isSchemaRelationNew } from '../lib/pages.schema-editing.lib';
import type { PageRelatedRow, PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly collections: readonly PageRelatedRow[];
  readonly editor: PagesSchemaEditor;
  readonly property: PageSchemaProperty;
}

/** What a relation points to is chosen once: moving it later would leave rows pointing at the wrong collection. */
export const PagesSchemaSettingsConfigRelation = ({ collections, editor, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const checkboxId = `relation-two-way-${property.key}`;
  const { mirrorPropertyKey, targetCollectionId } = property.config;
  const target = collections.find((collection) => collection.id === targetCollectionId);

  if (!isSchemaRelationNew(property)) {
    return (
      <div className="space-y-1 px-2 text-sm">
        <p className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-muted-foreground">{t('relationTarget')}</span>
          <span className="truncate text-foreground">{target?.title ?? t('relationTargetHidden')}</span>
        </p>
        <p className="text-muted-foreground text-xs">
          {mirrorPropertyKey === null ? t('relationOneWay') : t('relationTwoWayActive')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-2 text-sm">
        <span className="shrink-0 text-muted-foreground">{t('relationTarget')}</span>
        <Select
          disabled={editor.isSaving}
          onValueChange={(collectionId) =>
            editor.changePropertyConfig(property.key, { targetCollectionId: collectionId })
          }
          value={targetCollectionId ?? ''}
        >
          <SelectTrigger aria-label={t('relationTarget')} className="w-44">
            <SelectValue placeholder={t('relationTargetPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {collection.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm" htmlFor={checkboxId}>
        <Checkbox
          checked={property.twoWay === true}
          disabled={editor.isSaving}
          id={checkboxId}
          onCheckedChange={(checked) => editor.setRelationTwoWay(property.key, checked === true)}
        />
        {t('relationTwoWay')}
      </label>
      <p className="px-2 text-muted-foreground text-xs">{t('relationTwoWayHint')}</p>
    </div>
  );
};
