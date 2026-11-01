import { Skeleton } from "@/components/ui/skeleton";

const SUMMARY_BLOCKS = [0, 1, 2];
const TRANSCRIPT_LINES = [0, 1, 2, 3, 4, 5];

export default function MeetingLoading() {
  return (
    <div className="lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:overflow-hidden" aria-busy="true">
      <span className="sr-only">Loading meeting</span>

      <section className="min-w-0 lg:overflow-y-auto" aria-hidden="true">
        <div className="px-5 pt-6 lg:px-10 lg:pt-8">
          <Skeleton className="h-8 w-3/4 max-w-md" />
          <Skeleton className="mt-3 h-4 w-56" />
          <div className="mt-4 flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="size-7 rounded-full ring-2 ring-background" />
            ))}
          </div>
        </div>

        <div className="sticky top-0 z-20 bg-background/95 px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        </div>

        <div className="space-y-8 px-5 pb-16 pt-4 lg:px-10">
          {SUMMARY_BLOCKS.map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </section>

      <section
        className="flex min-h-[70dvh] min-w-0 flex-col border-t border-border bg-card lg:min-h-0 lg:border-l lg:border-t-0"
        aria-hidden="true"
      >
        <div className="flex h-12 items-center gap-5 border-b border-border px-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-14" />
        </div>
        <div className="flex flex-col gap-5 p-5 lg:overflow-y-auto">
          {TRANSCRIPT_LINES.map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
