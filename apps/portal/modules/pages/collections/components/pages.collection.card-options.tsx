'use client';

import { PAGE_CARD_SIZE_VALUES, PAGE_PROPERTY_TYPE, readPageViewConfiguration } from '@neuma/shared';
import { GalleryHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_GROUP } from '../constants/pages.collections.constants';
import { usePagesViewSaving } from '../hooks/use.pages.view-saving';
import { readCardSize } from '../lib/pages.card-cover.lib';
import { setViewCardSize, setViewCoverProperty } from '../lib/pages.view-filtering.lib';
import type { PageSchema } from '../types/pages.schema.types';

interface IProps {
  readonly activeViewName: string;
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/** How big the cards of a gallery or a board are, and which files property their cover comes from. */
export const PagesCollectionCardOptions = ({ activeViewName, schema, spaceId }: IProps) => {
  const t = useTranslations('pages.collection');
  const { apply, isSaving, views } = usePagesViewSaving(schema, activeViewName, spaceId);
  const configuration = readPageViewConfiguration(views.find((view) => view.name === activeViewName)?.configuration);
  const fileProperties = schema.properties.filter((property) => property.type === PAGE_PROPERTY_TYPE.FILES);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={t('cardOptions')}
          className="min-h-11 rounded-md text-muted-foreground"
          size="sm"
          type="button"
          variant="ghost"
        >
          <GalleryHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2">
        <p className="px-1 text-muted-foreground text-xs uppercase tracking-wide">{t('cardSize')}</p>
        <Select
          disabled={isSaving}
          onValueChange={(value) => apply((current) => setViewCardSize(current, activeViewName, readCardSize(value)))}
          value={configuration.cardSize}
        >
          <SelectTrigger aria-label={t('cardSize')} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_CARD_SIZE_VALUES.map((size) => (
              <SelectItem key={size} value={size}>
                {t(`cardSizes.${size}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="px-1 text-muted-foreground text-xs uppercase tracking-wide">{t('cardCover')}</p>
        <Select
          disabled={isSaving || fileProperties.length === 0}
          onValueChange={(value) =>
            apply((current) =>
              setViewCoverProperty(current, activeViewName, value === PAGE_VIEW_NO_GROUP ? null : value),
            )
          }
          value={configuration.coverProperty ?? PAGE_VIEW_NO_GROUP}
        >
          <SelectTrigger aria-label={t('cardCover')} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PAGE_VIEW_NO_GROUP}>{t('cardNoCover')}</SelectItem>
            {fileProperties.map((property) => (
              <SelectItem key={property.key} value={property.key}>
                {property.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fileProperties.length === 0 && (
          <p className="px-1 text-muted-foreground text-xs">{t('cardCoverNeedsFiles')}</p>
        )}
      </PopoverContent>
    </Popover>
  );
};
