"use client";

import { useMemo } from "react";
import { ActionCard } from "@/components/workspace/ActionCard";
import type { ActionItemsState, Participant } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ActionBoardProps {
  state: ActionItemsState;
  participants: Participant[];
}

export function ActionBoard({ state, participants }: ActionBoardProps) {
  const { items, done, error, dismissError, update } = state;
  const total = items.length;

  const { todo, completed } = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.position - b.position);
    return {
      todo: sorted.filter((i) => !i.completed),
      completed: sorted.filter((i) => i.completed),
    };
  }, [items]);

  const allDone = total > 0 && done === total;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-warn"
        >
          <p className="min-w-0 flex-1">{error}</p>
          <button
            type="button"
            onClick={dismissError}
            className="shrink-0 rounded-md font-medium underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-warn"
          >
            Dismiss
          </button>
        </div>
      )}

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No action items were captured for this meeting.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              <span className="tnum">{done}</span> of <span className="tnum">{total}</span> done
            </p>
            <div
              role="progressbar"
              aria-label="Action items done"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  allDone ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <Group id="actions-todo" title="To do" count={todo.length}>
            {todo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing left to do.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {todo.map((item) => (
                  <ActionCard key={item.id} item={item} participants={participants} update={update} />
                ))}
              </ul>
            )}
          </Group>

          {completed.length > 0 && (
            <Group id="actions-done" title="Done" count={completed.length}>
              <ul className="flex flex-col gap-2">
                {completed.map((item) => (
                  <ActionCard key={item.id} item={item} participants={participants} update={update} />
                ))}
              </ul>
            </Group>
          )}
        </>
      )}
    </div>
  );
}

function Group({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="flex items-baseline gap-2 text-base font-semibold">
        {title}
        <span className="tnum text-sm font-normal text-muted-foreground">{count}</span>
      </h2>
      {children}
    </section>
  );
}
