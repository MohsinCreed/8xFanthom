"use client";

import { Check } from "lucide-react";
import { usePlayer } from "@/components/workspace/PlayerProvider";
import { AssigneePicker } from "@/components/workspace/AssigneePicker";
import { fmtTime } from "@/lib/transcript";
import type { ActionItem, ActionItemsState, Participant } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<ActionItem["priority"], string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

const PRIORITY_CLASS: Record<ActionItem["priority"], string> = {
  high: "bg-amber-50 text-warn",
  medium: "bg-muted text-foreground",
  low: "bg-muted text-muted-foreground",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats `YYYY-MM-DD` without going through Date, so no timezone drift. */
function fmtDue(due: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(due);
  if (!m) return due;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return due;
  return `${month} ${Number(m[3])}`;
}

interface ActionCardProps {
  item: ActionItem;
  participants: Participant[];
  update: ActionItemsState["update"];
}

export function ActionCard({ item, participants, update }: ActionCardProps) {
  const { seek } = usePlayer();
  const done = item.completed;
  const timeLabel = item.source_time != null ? fmtTime(item.source_time) : null;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-md border border-border p-3 transition-colors",
        done ? "bg-success-soft" : "bg-card",
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`Mark as ${done ? "not done" : "done"}: ${item.task}`}
        onClick={() => void update(item.id, { completed: !done })}
        className={cn(
          "relative mt-0.5 flex size-5 shrink-0 before:absolute before:-inset-3 before:content-[''] items-center justify-center rounded border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          done
            ? "border-success bg-success text-white"
            : "border-muted-foreground bg-card hover:border-primary",
        )}
      >
        {done && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p
          className={cn(
            "text-[15px] leading-snug",
            done && "text-muted-foreground line-through",
          )}
        >
          {item.task}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
              PRIORITY_CLASS[item.priority],
            )}
          >
            {PRIORITY_LABEL[item.priority]}
          </span>
          {item.due_date && (
            <span className="text-muted-foreground">Due {fmtDue(item.due_date)}</span>
          )}
          {timeLabel && item.source_time != null && (
            <button
              type="button"
              onClick={() => seek(item.source_time as number, { play: true })}
              aria-label={`Jump to ${timeLabel}`}
              className="tnum rounded-full bg-primary-soft px-2 py-0.5 font-medium max-md:inline-flex max-md:min-h-9 max-md:items-center max-md:px-3 text-primary outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
            >
              {timeLabel}
            </button>
          )}
        </div>
      </div>

      <AssigneePicker
        assigneeId={item.assignee_id}
        participants={participants}
        onChange={(assignee_id) => void update(item.id, { assignee_id })}
      />
    </li>
  );
}
