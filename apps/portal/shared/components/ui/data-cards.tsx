'use client';

import { MoreHorizontal } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

interface DataCardsProps<T> {
  readonly data: T[];
  readonly CardComponent: ComponentType<{ item: T }>;
  readonly keyExtractor: (item: T) => string;
  readonly className?: string;
}

export type { DataCardsProps };

export const DataCards = <T,>({ data, CardComponent, keyExtractor, className }: DataCardsProps<T>) => {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-3 p-4 md:hidden', className)}>
      {data.map((item) => (
        <div className="relative rounded-none border border-border bg-card p-4" key={keyExtractor(item)}>
          <CardComponent item={item} />
          <button
            aria-label="Acciones"
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-none text-muted-foreground hover:bg-accent hover:text-foreground"
            type="button"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
