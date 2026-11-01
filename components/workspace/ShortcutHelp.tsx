"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isTypingTarget } from "@/lib/utils";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Space", label: "Play or pause" },
  { keys: "J", label: "Back 10 seconds" },
  { keys: "L", label: "Forward 10 seconds" },
  { keys: "/", label: "Search transcript" },
  { keys: "A", label: "Ask AI" },
  { keys: "Esc", label: "Close or clear" },
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.defaultPrevented || isTypingTarget(e.target)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Keyboard shortcuts" aria-keyshortcuts="?" className="max-md:size-10">
          <Keyboard aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-3">
        <p className="mb-2 font-heading text-sm font-medium">Keyboard shortcuts</p>
        <ul className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="min-w-6 rounded-sm border border-border bg-background px-1.5 py-0.5 text-center font-sans text-xs text-foreground">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
