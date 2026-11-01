import { Skeleton } from "@/components/ui/skeleton";

const TRANSCRIPT_LINES = [0, 1, 2, 3];

export default function ClipLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10" aria-busy="true">
      <span className="sr-only">Loading clip</span>
      <div aria-hidden="true">
        <Skeleton className="h-5 w-32" />

        <header className="mt-8 mb-6 space-y-3">
          <Skeleton className="h-8 w-2/3 sm:h-9" />
          <Skeleton className="h-4 w-1/2" />
        </header>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <Skeleton className="h-2 flex-1" />
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>

        <div className="mt-8 space-y-5">
          {TRANSCRIPT_LINES.map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
