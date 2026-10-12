'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';

interface IProps {
  readonly heading: string;
  readonly isSaving: boolean;
  readonly message: string;
  readonly onAddProperty: () => void;
}

export const PagesSchemaSettingsMissingProperty = ({ heading, isSaving, message, onAddProperty }: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <div className="space-y-2">
      <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{heading}</p>
      <div className="space-y-2 px-2">
        <p className="text-muted-foreground text-xs">{message}</p>
        <Button
          className="min-h-11 w-full justify-start"
          disabled={isSaving}
          onClick={onAddProperty}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('addProperty')}
        </Button>
      </div>
    </div>
  );
};
