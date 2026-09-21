'use client';

import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { moveSchemaOptionSideways } from '../lib/pages.schema-editing.lib';
import type { PagesGroupOrdering } from '../types/pages.group-ordering.types';
import type { PageSchema } from '../types/pages.schema.types';
import { usePagesShapeSaving } from './use.pages.shape-saving';

/**
 * Cambiar de sitio un grupo de una tabla, que es cambiar de sitio el valor que
 * ese grupo es.
 *
 * Vive en la propiedad y no en la vista, igual que el orden de las columnas de
 * un tablero: son el mismo orden mirado de otra manera, y tener uno por vista
 * haría que renombrar una opción en un sitio la dejara en otro lugar en el otro.
 *
 * Solo se puede con los valores declarados. El grupo de las filas sin valor no
 * es uno, y los que salen de una fecha o un número tampoco: esos los pone lo que
 * las filas traen puesto, y su orden es el de lo que guardan.
 */
export const usePagesGroupOrdering = (schema: PageSchema, groupByKey: string, spaceId: string): PagesGroupOrdering => {
  const shape = usePagesShapeSaving(schema, spaceId);
  const declaredValues = schema.properties.find((property) => property.key === groupByKey)?.options ?? null;

  return {
    canMove: (groupKey: string) =>
      declaredValues !== null &&
      groupKey !== UNASSIGNED_GROUP_KEY &&
      declaredValues.some((option) => option.value === groupKey),
    isBusy: shape.isSaving,
    move: (groupKey: string, direction: 'EARLIER' | 'LATER') =>
      shape.save(moveSchemaOptionSideways(schema.properties, groupByKey, groupKey, direction), schema.views),
  };
};
