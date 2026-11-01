'use client';

import { CalendarRange } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { usePagesViewSaving } from '../hooks/use.pages.view-saving';
import { listDatePropertyKeys } from '../lib/pages.calendar.lib';
import { setViewDateProperty } from '../lib/pages.view-editing.lib';
import { setViewEndDateProperty } from '../lib/pages.view-filtering.lib';
import type { PageSchema } from '../types/pages.schema.types';
import { PagesCollectionDatePropertySelect } from './pages.collection.date-property-select';

interface IProps {
  readonly activeViewName: string;
  readonly dateProperty: null | string;
  readonly endDateProperty: null | string;
  /** Without a start the view draws nothing, so the settings are offered open, right where the drawing would be. */
  readonly isOpenInline?: boolean;
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/** Which date properties place the bars: one range property, or a start and another property where each ends. */
export const PagesCollectionTimelineDateSettings = ({
  activeViewName,
  dateProperty,
  endDateProperty,
  isOpenInline = false,
  schema,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const { apply, isSaving } = usePagesViewSaving(schema, activeViewName, spaceId);
  const dateKeys = listDatePropertyKeys(schema.properties);
  const labelOf = (key: string): string => schema.properties.find((property) => property.key === key)?.label ?? key;

  const fields = (
    <div className="space-y-2">
      <PagesCollectionDatePropertySelect
        disabled={isSaving}
        emptyLabel={t('timelineNoStart')}
        heading={t('timelineStartProperty')}
        keys={dateKeys}
        labelFor={t('timelineStartPropertyFor', { view: activeViewName })}
        labelOf={labelOf}
        onChange={(key) => apply((current) => setViewDateProperty(current, activeViewName, key))}
        value={dateProperty}
      />
      <PagesCollectionDatePropertySelect
        disabled={isSaving || dateProperty === null}
        emptyLabel={t('timelineEndInStart')}
        heading={t('timelineEndProperty')}
        keys={dateKeys.filter((key) => key !== dateProperty)}
        labelFor={t('timelineEndPropertyFor', { view: activeViewName })}
        labelOf={labelOf}
        onChange={(key) => apply((current) => setViewEndDateProperty(current, activeViewName, key))}
        value={endDateProperty}
      />
    </div>
  );

  if (isOpenInline) return <div className="w-72">{fields}</div>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={t('timelineDates')}
          className="min-h-11 rounded-md text-muted-foreground"
          size="sm"
          type="button"
          variant="ghost"
        >
          <CalendarRange aria-hidden="true" className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        {fields}
      </PopoverContent>
    </Popover>
  );
};
