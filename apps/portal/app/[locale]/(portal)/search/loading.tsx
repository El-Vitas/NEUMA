import { Skeleton } from '@/shared/components/ui/skeleton';

export default function Loading() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-48 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </main>
  );
}
