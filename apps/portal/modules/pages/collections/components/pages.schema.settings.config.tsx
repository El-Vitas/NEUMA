'use client';

import { PAGE_PROPERTY_TYPE } from '@neuma/shared';
import type { PageRelatedRow, PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import { PagesSchemaSettingsConfigNumber } from './pages.schema.settings.config.number';
import { PagesSchemaSettingsConfigPerson } from './pages.schema.settings.config.person';
import { PagesSchemaSettingsConfigRelation } from './pages.schema.settings.config.relation';
import { PagesSchemaSettingsConfigUniqueId } from './pages.schema.settings.config.unique-id';

interface IProps {
  readonly collections: readonly PageRelatedRow[];
  readonly editor: PagesSchemaEditor;
  readonly property: PageSchemaProperty;
}

/** What a type needs beyond its name: only the types that have something to set show anything. */
export const PagesSchemaSettingsConfig = ({ collections, editor, property }: IProps) => {
  switch (property.type) {
    case PAGE_PROPERTY_TYPE.NUMBER:
      return <PagesSchemaSettingsConfigNumber editor={editor} property={property} />;
    case PAGE_PROPERTY_TYPE.PERSON:
      return <PagesSchemaSettingsConfigPerson editor={editor} property={property} />;
    case PAGE_PROPERTY_TYPE.UNIQUE_ID:
      return <PagesSchemaSettingsConfigUniqueId editor={editor} property={property} />;
    case PAGE_PROPERTY_TYPE.RELATION:
      return <PagesSchemaSettingsConfigRelation collections={collections} editor={editor} property={property} />;
    default:
      return null;
  }
};
