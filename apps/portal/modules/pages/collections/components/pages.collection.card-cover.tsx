'use client';

import { cn } from '@/lib/utils';
import { ImageWithFallback } from '@/shared/components/ui/image-with-fallback';
import { resolvePageAssetUrl } from '../../attachments/lib/pages.attachments.lib';
import { usePagesCardAppearance } from '../hooks/use.pages.card-appearance';
import { usePagesCollectionLookups } from '../hooks/use.pages.collection-lookups';
import { readCardCoverFileId, readCardCoverHeight } from '../lib/pages.card-cover.lib';
import type { PageRow } from '../types/pages.schema.types';

interface IProps {
  readonly row: PageRow;
}

/** The first image of the cover property, above the title of a card; nothing when the row has no image there. */
export const PagesCollectionCardCover = ({ row }: IProps) => {
  const { attachedFiles } = usePagesCollectionLookups();
  const { coverProperty, size } = usePagesCardAppearance();
  const fileId = readCardCoverFileId(row, coverProperty, attachedFiles);
  if (fileId === null) return null;

  return (
    <div
      className={cn('relative -mx-3 -mt-3 overflow-hidden rounded-t-md bg-muted', readCardCoverHeight(size))}
      data-testid="collection-card-cover"
    >
      <ImageWithFallback
        alt=""
        className="object-cover"
        fill
        sizes="(min-width: 640px) 22rem, 100vw"
        src={resolvePageAssetUrl(fileId)}
        unoptimized
      />
    </div>
  );
};
