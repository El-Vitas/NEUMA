'use client';

import { ChevronDown, FileStack, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import type { PageSchemaProperty } from '../../collections/types/pages.schema.types';
import { usePagesTemplateRow } from '../hooks/use.pages.template-row';
import type { PageTemplateListing } from '../types/pages.templates.types';
import { PagesTemplatesPanel } from './pages.templates.panel';

interface IProps {
  readonly collectionId: string;
  readonly listing: PageTemplateListing;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** "New" makes a row from the default template; the arrow offers the others, a blank row and the list to manage. */
export const PagesTemplatesMenu = ({ collectionId, listing, properties, spaceId }: IProps) => {
  const t = useTranslations('pages.templates');
  const [isManaging, setIsManaging] = useState(false);
  const creation = usePagesTemplateRow({ collectionId, listing, properties, spaceId });

  return (
    <>
      <div className="flex items-center">
        <Button
          className={cn('min-h-11 gap-1 rounded-r-none px-3', FOCUS_RING_CLASS)}
          data-testid="collection-new-row"
          disabled={creation.isCreating}
          onClick={() => creation.createRow(undefined)}
          size="sm"
          type="button"
          variant="default"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('newRow')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t('chooseTemplate')}
              className={cn('min-h-11 min-w-9 rounded-l-none border-primary-foreground/30 border-l', FOCUS_RING_CLASS)}
              data-testid="collection-template-menu"
              size="icon"
              type="button"
              variant="default"
            >
              <ChevronDown aria-hidden="true" className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem data-testid="new-row-blank" onSelect={() => creation.createRow(null)}>
              {t('blankRow')}
            </DropdownMenuItem>
            {listing.templates.length > 0 && <DropdownMenuSeparator />}
            {listing.templates.map((template) => (
              <DropdownMenuItem
                data-testid="new-row-from-template"
                key={template.id}
                onSelect={() => creation.createRow(template.id)}
              >
                <span className="min-w-0 flex-1 truncate">{template.title}</span>
                {template.isDefault && <span className="text-muted-foreground text-xs">{t('defaultBadge')}</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="manage-templates" onSelect={() => setIsManaging(true)}>
              <FileStack aria-hidden="true" className="size-4" />
              {t('manage')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isManaging && (
        <PagesTemplatesPanel
          collectionId={collectionId}
          listing={listing}
          onClose={() => setIsManaging(false)}
          properties={properties}
          spaceId={spaceId}
        />
      )}
    </>
  );
};
