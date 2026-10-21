'use client';

import type { PageFilterCondition } from '@neuma/shared';
import { PAGE_STATUS_GROUP_VALUES } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { usePagesCollectionLookups } from '../hooks/use.pages.collection-lookups';
import { readFilterValueKind } from '../lib/pages.filter-value.lib';
import { listPropertyOptions } from '../lib/pages.option-groups.lib';
import { getPagePersonOptionLabel } from '../lib/pages.properties.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PageFilterPath, PagesViewFiltering } from '../types/pages.view-filtering.types';

interface IProps {
  readonly condition: PageFilterCondition;
  readonly filtering: PagesViewFiltering;
  readonly path: PageFilterPath;
  readonly property: PageSchemaProperty;
}

/** An operator without a value keeps a placeholder, so the fields of the row keep their column alignment. */
export const PagesCollectionFilterValue = ({ condition, filtering, path, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const tProperties = useTranslations('pages.properties');
  const { people } = usePagesCollectionLookups();
  const kind = readFilterValueKind(property, condition.operator);
  const label = t('filterValueFor', { property: property.label });
  const textValue = typeof condition.value === 'string' ? condition.value : '';

  const chooseFrom = (choices: readonly { readonly label: string; readonly value: string }[]) => (
    <Select
      disabled={filtering.isSaving}
      onValueChange={(value) => filtering.setConditionValue(path, value)}
      value={textValue}
    >
      <SelectTrigger aria-label={label} className="w-40" size="sm">
        <SelectValue placeholder={t('filterValuePlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  switch (kind) {
    case 'NONE':
      return <span aria-hidden="true" className="w-40 shrink-0" />;
    case 'OPTION':
      return chooseFrom(listPropertyOptions(property).map((option) => ({ label: option.value, value: option.id })));
    case 'STATUS_GROUP':
      return chooseFrom(PAGE_STATUS_GROUP_VALUES.map((group) => ({ label: t(`statusGroups.${group}`), value: group })));
    case 'PERSON':
      return chooseFrom(
        people.map((person) => ({ label: getPagePersonOptionLabel(people, person), value: person.id })),
      );
    case 'BOOLEAN':
      return (
        <Select
          disabled={filtering.isSaving}
          onValueChange={(value) => filtering.setConditionValue(path, value === 'true')}
          value={typeof condition.value === 'boolean' ? String(condition.value) : ''}
        >
          <SelectTrigger aria-label={label} className="w-40" size="sm">
            <SelectValue placeholder={t('filterValuePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{tProperties('yes')}</SelectItem>
            <SelectItem value="false">{tProperties('no')}</SelectItem>
          </SelectContent>
        </Select>
      );
    case 'DATE':
      return (
        <Input
          aria-label={label}
          className="w-40"
          defaultValue={textValue}
          disabled={filtering.isSaving}
          onBlur={(event) => filtering.setConditionValue(path, event.target.value === '' ? null : event.target.value)}
          type="date"
        />
      );
    case 'NUMBER':
      return (
        <Input
          aria-label={label}
          className="w-40"
          defaultValue={typeof condition.value === 'number' ? String(condition.value) : ''}
          disabled={filtering.isSaving}
          onBlur={(event) =>
            filtering.setConditionValue(path, event.target.value === '' ? null : Number(event.target.value))
          }
          type="number"
        />
      );
    default:
      return (
        <Input
          aria-label={label}
          className="w-40"
          defaultValue={textValue}
          disabled={filtering.isSaving}
          onBlur={(event) => filtering.setConditionValue(path, event.target.value)}
          placeholder={t('filterValuePlaceholder')}
        />
      );
  }
};
