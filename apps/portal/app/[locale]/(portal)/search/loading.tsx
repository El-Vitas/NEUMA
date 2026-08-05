import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/shared/components/ui/skeleton';

export default async function Loading() {
  const t = await getTranslations('portal.search');

  return (
    <section
      aria-busy="true"
      aria-label={t('title')}
      className="mx-auto w-full max-w-5xl space-y-7 p-4 sm:p-8 lg:pt-12"
    >
      <header className="max-w-2xl space-y-2">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-14 w-44 sm:h-16" />
      </header>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-full sm:w-24" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </section>
  );
}
