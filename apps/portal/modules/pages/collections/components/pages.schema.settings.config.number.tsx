'use client';

import { PAGE_DEFAULT_CURRENCY, PAGE_NUMBER_FORMAT, PAGE_NUMBER_FORMAT_VALUES } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_DECIMAL_CHOICES, PAGE_DECIMALS_ANY_CHOICE } from '../constants/pages.schema-editing.constants';
import { readDecimalsChoice, readNumberFormatChoice } from '../lib/pages.schema-config.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly property: PageSchemaProperty;
}

/** A percent is typed as a percent and stored as a fraction, so changing the format never changes what rows hold. */
export const PagesSchemaSettingsConfigNumber = ({ editor, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const { currency, decimals, numberFormat } = property.config;

  const changeFormat = (chosen: string): void => {
    const format = readNumberFormatChoice(chosen);
    if (format === undefined) return;
    editor.changePropertyConfig(property.key, {
      currency: format === PAGE_NUMBER_FORMAT.CURRENCY ? (currency ?? PAGE_DEFAULT_CURRENCY) : null,
      numberFormat: format,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-2 text-sm">
        <span className="shrink-0 text-muted-foreground">{t('numberFormat')}</span>
        <Select disabled={editor.isSaving} onValueChange={changeFormat} value={numberFormat}>
          <SelectTrigger aria-label={t('numberFormat')} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_NUMBER_FORMAT_VALUES.map((format) => (
              <SelectItem key={format} value={format}>
                {t(`numberFormats.${format}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {numberFormat === PAGE_NUMBER_FORMAT.CURRENCY && (
        <div className="flex items-center justify-between gap-2 px-2 text-sm">
          <span className="shrink-0 text-muted-foreground">{t('currencyCode')}</span>
          <Input
            aria-label={t('currencyCode')}
            className="w-44"
            defaultValue={currency ?? PAGE_DEFAULT_CURRENCY}
            disabled={editor.isSaving}
            maxLength={3}
            onBlur={(event) =>
              editor.changePropertyConfig(property.key, { currency: event.target.value.toUpperCase() })
            }
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-2 text-sm">
        <span className="shrink-0 text-muted-foreground">{t('decimals')}</span>
        <Select
          disabled={editor.isSaving}
          onValueChange={(chosen) =>
            editor.changePropertyConfig(property.key, { decimals: readDecimalsChoice(chosen) })
          }
          value={decimals === null ? PAGE_DECIMALS_ANY_CHOICE : String(decimals)}
        >
          <SelectTrigger aria-label={t('decimals')} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PAGE_DECIMALS_ANY_CHOICE}>{t('decimalsAny')}</SelectItem>
            {PAGE_DECIMAL_CHOICES.map((choice) => (
              <SelectItem key={choice} value={String(choice)}>
                {choice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
