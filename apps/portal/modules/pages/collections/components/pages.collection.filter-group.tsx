'use client';

import type { PageFilter, PageFilterGroup } from '@company-brain/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { canNestFilterGroup, readFilterNodeKey } from '../lib/pages.view-filtering.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PageFilterPath, PagesViewFiltering } from '../types/pages.view-filtering.types';
import { PagesCollectionFilterCondition } from './pages.collection.filter-condition';
import { PagesCollectionFilterJoin } from './pages.collection.filter-join';

interface IProps {
  readonly filtering: PagesViewFiltering;
  readonly group: PageFilterGroup;
  /** Dónde está este grupo dentro del filtro. Vacío es el de arriba, el que no se puede quitar. */
  readonly path: PageFilterPath;
  readonly properties: readonly PageSchemaProperty[];
}

/**
 * Un grupo de condiciones, y los grupos que lleve dentro.
 *
 * Se dibuja a sí mismo porque un grupo anidado es un grupo igual: lo único que
 * cambia es que el de arriba no se puede quitar —quitarlo sería quitar el filtro
 * entero, que es lo que hace «quitar todo»—.
 *
 * Cada línea empieza por cómo se une a la anterior y sigue por la propiedad, de
 * modo que las columnas quedan una debajo de otra y el grupo se lee como una
 * frase de arriba abajo en lugar de como tres controles sueltos por línea.
 */
export const PagesCollectionFilterGroup = ({ filtering, group, path, properties }: IProps) => {
  const t = useTranslations('pages.collection');
  const isRoot = path.length === 0;
  const propertyOf = (key: string): PageSchemaProperty | undefined =>
    properties.find((property) => property.key === key);

  /**
   * Una condición sobre una propiedad que ya no existe no se dibuja: no hay
   * operadores que ofrecerle ni valor que comparar.
   */
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
        {/* Con texto y no con una cruz: una cruz más, en la misma columna que las de las condiciones, se lee como quitar una de ellas. */}
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
