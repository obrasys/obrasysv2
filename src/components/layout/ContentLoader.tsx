import { Skeleton } from '@/components/ui/skeleton';

/**
 * Content-area skeleton shown while a lazy-loaded page is being fetched.
 * Renders INSIDE the app shell so sidebar/topbar remain visible.
 */
export function ContentLoader() {
  return (
    <div className="flex-1 p-6 space-y-5 animate-in fade-in duration-150">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
