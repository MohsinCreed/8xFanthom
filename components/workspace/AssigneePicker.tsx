"use client";

import { useState } from "react";
import { Check, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Participant } from "@/lib/types";
import { cn } from "@/lib/utils";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AssigneePickerProps {
  assigneeId: string | null;
  participants: Participant[];
  onChange: (assigneeId: string | null) => void;
}

export function AssigneePicker({ assigneeId, participants, onChange }: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const current = participants.find((p) => p.id === assigneeId) ?? null;

  const choose = (id: string | null) => {
    setOpen(false);
    if (id !== assigneeId) onChange(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Assignee: ${current ? current.name : "Unassigned"}. Change`}
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <AssigneeAvatar participant={current} />
        </button>
      </PopoverTrigger>
      <PopoverContent aria-label="Choose assignee">
        <ul className="flex flex-col" aria-label="Assignee">
          {participants.map((p) => (
            <li key={p.id}>
              <OptionButton selected={p.id === assigneeId} onClick={() => choose(p.id)}>
                <AssigneeAvatar participant={p} small />
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate">{p.name}</span>
                  {p.role && <span className="truncate text-xs text-muted-foreground">{p.role}</span>}
                </span>
              </OptionButton>
            </li>
          ))}
          <li>
            <OptionButton selected={assigneeId === null} onClick={() => choose(null)}>
              <AssigneeAvatar participant={null} small />
              <span className="flex-1 text-left">Unassigned</span>
            </OptionButton>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted",
        selected && "bg-primary-soft",
      )}
    >
      {children}
      {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );
}

function AssigneeAvatar({
  participant,
  small = false,
}: {
  participant: Participant | null;
  small?: boolean;
}) {
  const size = small ? "size-7 text-xs" : "size-8 text-xs";
  if (!participant) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground",
          size,
        )}
      >
        <User className="size-4" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        size,
      )}
      style={{ backgroundColor: participant.color }}
    >
      {initialsOf(participant.name)}
    </span>
  );
}
