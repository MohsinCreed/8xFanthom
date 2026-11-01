import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 5;

export default function MeetingsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-10" aria-busy="true">
      <span className="sr-only">Loading meetings</span>
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="mb-6 h-9 w-full" />

      <ul className="flex flex-col">
        <li className="border-b border-border px-3 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </li>
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <li key={i} className="border-b border-border px-3 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
