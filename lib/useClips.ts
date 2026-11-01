"use client";

import { useCallback, useRef, useState } from "react";
import type { Clip, ClipsState } from "@/lib/types";

const CREATE_ERROR = "Couldn't save that clip. Try again.";
const REMOVE_ERROR = "Couldn't delete that clip. Try again.";

const byStart = (a: Clip, b: Clip) => a.start_time - b.start_time;

export function useClips(initial: Clip[], meetingId: string): ClipsState {
  const [clips, setClips] = useState<Clip[]>(initial);
  const [error, setError] = useState<string | null>(null);
  // Mirror of state so remove() can read pre-call values synchronously for rollback.
  const clipsRef = useRef<Clip[]>(initial);

  const commit = useCallback((fn: (all: Clip[]) => Clip[]) => {
    clipsRef.current = fn(clipsRef.current);
    setClips(clipsRef.current);
  }, []);

  const create = useCallback(
    async (input: { title: string; startTime: number; endTime: number }) => {
      setError(null);
      try {
        const res = await fetch("/api/clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId, ...input }),
        });
        if (!res.ok) {
          let message = CREATE_ERROR;
          if (res.status === 400) {
            const data = (await res.json().catch(() => null)) as { message?: unknown } | null;
            if (typeof data?.message === "string") message = data.message;
          }
          setError(message);
          return null;
        }
        const { clip } = (await res.json()) as { clip: Clip };
        commit((all) => [...all, clip].sort(byStart));
        return clip;
      } catch {
        setError(CREATE_ERROR);
        return null;
      }
    },
    [meetingId, commit],
  );

  const remove = useCallback(
    async (id: string) => {
      const index = clipsRef.current.findIndex((c) => c.id === id);
      if (index === -1) return;
      const removed = clipsRef.current[index];

      setError(null);
      commit((all) => all.filter((c) => c.id !== id));
      try {
        const res = await fetch(`/api/clips/${id}`, {
          method: "DELETE",
          // Lets the delete finish if the page is reloaded or left mid-request.
          keepalive: true,
        });
        // A 404 means it is already gone, which is the state we want.
        if (!res.ok && res.status !== 404) throw new Error(`status ${res.status}`);
      } catch {
        commit((all) => {
          if (all.some((c) => c.id === id)) return all;
          const next = [...all];
          next.splice(Math.min(index, next.length), 0, removed);
          return next;
        });
        setError(REMOVE_ERROR);
      }
    },
    [commit],
  );

  const dismissError = useCallback(() => setError(null), []);

  return { clips, error, dismissError, create, remove };
}
