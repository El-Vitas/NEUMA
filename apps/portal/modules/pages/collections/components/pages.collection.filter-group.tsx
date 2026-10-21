'use client';

import type { PageFilter, PageFilterGroup } from '@neuma/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { canNestFilterGroup, readFilterNodeKey } from '../lib/pages.view-filtering.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PageFilterPath, PagesFilterEditing } from '../types/pages.view-filtering.types';
import { PagesCollectionFilterCondition } from './pages.collection.filter-condition';
import { PagesCollectionFilterJoin } from './pages.collection.filter-join';

interface IProps {
  readonly filtering: PagesFilterEditing;
  readonly group: PageFilterGroup;
  /** Empty for the root group, which cannot be removed. */
  readonly path: PageFilterPath;
  readonly properties: readonly PageSchemaProperty[];
}

export const PagesCollectionFilterGroup = ({ filtering, group, path, properties }: IProps) => {
  const t = useTranslations('pages.collection');
  const isRoot = path.length === 0;
  const propertyOf = (key: string): PageSchemaProperty | undefined =>
    properties.find((property) => property.key === key);

  /** A condition on a deleted property renders nothing: it has no operators or value to offer. */
  const describeNode = (node: PageFilter, nodePath: PageFilterPath): null | ReactNode => {
    if (node.kind === 'GROUP') {
      return <PagesCollectionFilterGroup filtering={filtering} group={node} path={nodePath} properties={properties} />;
    }
    const property = propertyOf(node.propertyKey);
    if (property === undefined) return null;
    return (
      <PagesCollectionFilterCondition condition={node} filtering={filtering} path={nodePath} property={property} />
    );
  };

  return (
    <div className={isRoot ? 'space-y-1' : 'min-w-0 flex-1 space-y-1 border border-border bg-muted/30 p-2'}>
      {isRoot && group.conditions.length === 0 && <p className="text-muted-foreground text-sm">{t('noFilters')}</p>}
      <ul className="m-0 list-none space-y-1 p-0">
        {group.conditions.map((node, index) => {
          const inside = describeNode(node, [...path, index]);
          if (inside === null) return null;
          return (
            <li className="flex items-start gap-2" key={readFilterNodeKey([...path, index])}>
              <PagesCollectionFilterJoin
                disabled={filtering.isSaving}
                onChange={(operator) => filtering.setGroupOperator(path, operator)}
                operator={group.operator}
                position={index}
              />
              {inside}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-1 pl-14">
        <Select
          disabled={filtering.isSaving || properties.length === 0}
          onValueChange={(value) => {
            const property = propertyOf(value);
            if (property !== undefined) filtering.addCondition(path, property);
          }}
          value=""
        >
          <SelectTrigger
            aria-label={t('addFilter')}
            className="min-h-11 border-transparent px-2 text-muted-foreground shadow-none hover:text-foreground"
            size="sm"
          >
            <Plus aria-hidden="true" className="size-4" />
            <SelectValue placeholder={t('addFilter')} />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.key} value={property.key}>
                {property.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canNestFilterGroup(path) && (
          <Button
            className="min-h-11 text-muted-foreground hover:text-foreground"
            disabled={filtering.isSaving}
            onClick={() => filtering.addGroup(path)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t('addFilterGroup')}
          </Button>
        )}
        {/* Text, not a cross: a cross in the conditions' column would read as removing one of them. */}
        {!isRoot && (
          <Button
            className="ml-auto min-h-11 text-muted-foreground text-xs hover:text-destructive"
            disabled={filtering.isSaving}
            onClick={() => filtering.removeNode(path)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t('removeFilterGroup')}
          </Button>
        )}
      </div>
    </div>
  );
};
