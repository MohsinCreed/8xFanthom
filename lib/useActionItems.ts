"use client";

import { useCallback, useRef, useState } from "react";
import type { ActionItem, ActionItemPatch, ActionItemsState } from "@/lib/types";

const SAVE_ERROR = "Couldn't save that change. Try again.";

export function useActionItems(initial: ActionItem[]): ActionItemsState {
  const [items, setItems] = useState<ActionItem[]>(initial);
  const [error, setError] = useState<string | null>(null);
  // Mirror of state so update() can read pre-call values synchronously for rollback.
  const itemsRef = useRef<ActionItem[]>(initial);
  // Latest request number per item; a response from an older request is ignored.
  const latest = useRef<Map<string, number>>(new Map());

  const commit = useCallback((fn: (all: ActionItem[]) => ActionItem[]) => {
    itemsRef.current = fn(itemsRef.current);
    setItems(itemsRef.current);
  }, []);

  const update = useCallback(
    async (id: string, patch: ActionItemPatch) => {
      const current = itemsRef.current.find((i) => i.id === id);
      if (!current) return;
      const n = (latest.current.get(id) ?? 0) + 1;
      latest.current.set(id, n);

      const before: Partial<ActionItem> = {};
      for (const key of Object.keys(patch) as (keyof ActionItemPatch)[]) {
        (before as Record<string, unknown>)[key] = current[key];
      }
      const apply = (changes: Partial<ActionItem>) =>
        commit((all) => all.map((i) => (i.id === id ? { ...i, ...changes } : i)));

      setError(null);
      apply(patch);
      try {
        const res = await fetch(`/api/action-items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { item: ActionItem };
        if (latest.current.get(id) === n) apply(data.item);
      } catch {
        if (latest.current.get(id) !== n) return;
        apply(before);
        setError(SAVE_ERROR);
      }
    },
    [commit],
  );

  const dismissError = useCallback(() => setError(null), []);
  const done = items.filter((i) => i.completed).length;

  return { items, done, error, dismissError, update };
}
