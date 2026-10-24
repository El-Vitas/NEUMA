'use client';

import type { PagePropertyOption } from '@neuma/shared';
import { cn } from '@/lib/utils';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsRow } from './pages.schema.settings-row';

interface IProps {
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly option: PagePropertyOption;
  readonly propertyKey: string;
}

export const PagesSchemaSettingsOptionRow = ({ onGo, option, propertyKey }: IProps) => (
  <PagesSchemaSettingsRow
    label={option.value}
    onClick={() => onGo({ level: 'OPTION', optionId: option.id, propertyKey })}
    value={
      <span
        aria-hidden="true"
        className={cn('inline-block size-3 rounded-full', readPageOptionColorClass(option.color))}
      />
    }
  />
);
