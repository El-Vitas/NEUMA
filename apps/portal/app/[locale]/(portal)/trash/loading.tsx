import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/shared/components/ui/skeleton';

export default async function Loading() {
  const t = await getTranslations('pages');

  return (
    <section
      aria-busy="true"
      aria-label={t('trash')}
      className="mx-auto w-full max-w-5xl space-y-7 p-4 sm:p-8 lg:pt-12"
    >
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-11 w-32" />
      </header>
      <Skeleton className="h-16 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </section>
  );
}
