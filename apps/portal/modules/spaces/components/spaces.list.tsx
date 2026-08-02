import { LockKeyhole, Users } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { SPACE_ROUTES } from '../constants/spaces.constants';
import { getSpaceVisibilityLabel } from '../lib/spaces.lib';
import type { SpaceSummary } from '../types/spaces.types';

interface IProps {
  readonly spaces: readonly SpaceSummary[];
}

export const SpacesList = ({ spaces }: IProps) => {
  if (spaces.length === 0) {
    return <EmptyState message="Todavía no hay espacios disponibles." />;
  }

  return (
    <ul aria-label="Espacios disponibles" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {spaces.map((space) => (
        <li key={space.id}>
          <Link
            className="group flex min-h-32 flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={SPACE_ROUTES.detail(space.id)}
          >
            <span>
              <span className="flex items-start justify-between gap-3">
                <span className="font-semibold text-foreground text-lg group-hover:text-primary-soft">
                  {space.name}
                </span>
                {space.visibility === 'RESTRICTED' ? (
                  <LockKeyhole aria-label="Espacio restringido" className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Users aria-label="Espacio interno" className="size-4 shrink-0 text-muted-foreground" />
                )}
              </span>
              <span className="mt-1 block text-muted-foreground text-sm">/{space.slug}</span>
            </span>
            <span className="text-muted-foreground text-xs">{getSpaceVisibilityLabel(space.visibility)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
