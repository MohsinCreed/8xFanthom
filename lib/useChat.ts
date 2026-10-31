"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { ChatMessage, ChatStreamEvent, PillId } from "@/lib/types";

export interface UiMessage extends ChatMessage {
  pending?: boolean;
  failed?: boolean;
}
export type ChatStatus = "loading" | "idle" | "streaming" | "error";
export type ChatErrorCode = "rate_limited" | "upstream" | "internal" | "network";
export interface UseChat {
  messages: UiMessage[];
  status: ChatStatus;
  error: null | { code: ChatErrorCode; message: string };
  send: (text: string, pill?: PillId) => Promise<void>;
  stop: () => void;
  retry: () => void;
}

const SESSION_KEY = "8x-chat-session";
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MESSAGES: Record<ChatErrorCode, string> = {
  rate_limited: "The AI is busy right now. Try again in a moment.",
  upstream: "The AI could not answer that. Try again.",
  internal: "Something went wrong on our side. Try again.",
  network: "Could not reach the server. Check your connection and try again.",
};

let memorySession: string | null = null;

function getSessionId(): string {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored && ID_RE.test(stored)) return stored;
    const id = makeId();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return (memorySession ??= makeId());
  }
}

function makeId(): string {
  const id = nanoid(21);
  if (ID_RE.test(id)) return id;
  return crypto.randomUUID();
}

/** Splits a buffer into complete SSE events; returns the unconsumed tail. Malformed events are skipped. */
export function parseSseChunk(buffer: string): { events: ChatStreamEvent[]; rest: string } {
  const parts = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = parts.pop() ?? "";
  const events: ChatStreamEvent[] = [];
  for (const part of parts) {
    for (const line of part.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        const evt = JSON.parse(line.slice(5).trim());
        if (evt && typeof evt.type === "string") events.push(evt as ChatStreamEvent);
      } catch {
        // ignore malformed line
      }
    }
  }
  return { events, rest };
}

export function useChat(meetingId: string): UseChat {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("loading");
  const [error, setError] = useState<UseChat["error"]>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const last = useRef<{ text: string; pill?: PillId } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");
    setMessages([]);
    setError(null);
    const sessionId = getSessionId();
    fetch(`/api/chat/${encodeURIComponent(meetingId)}?sessionId=${encodeURIComponent(sessionId)}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data: { messages?: ChatMessage[] }) => {
        if (ctrl.signal.aborted) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setStatus("idle");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus("idle");
      });
    return () => {
      ctrl.abort();
      streamAbort.current?.abort();
      busy.current = false;
    };
  }, [meetingId]);

  const send = useCallback(
    async (text: string, pill?: PillId) => {
      const trimmed = text.trim();
      if (!trimmed || busy.current) return;
      busy.current = true;
      last.current = { text: trimmed, pill };
      const ctrl = new AbortController();
      streamAbort.current = ctrl;
      const key = nanoid(8);
      const userId = `tmp-u-${key}`;
      const asstId = `tmp-a-${key}`;
      const now = new Date().toISOString();
      setError(null);
      setStatus("streaming");
      setMessages((m) => [
        ...m,
        { id: userId, role: "user", content: trimmed, pill: pill ?? null, created_at: now },
        { id: asstId, role: "assistant", content: "", pill: null, created_at: now, pending: true },
      ]);

      const patch = (fn: (m: UiMessage) => UiMessage) =>
        setMessages((all) => all.map((m) => (m.id === asstId || m.id === doneId ? fn(m) : m)));
      let doneId = "";
      let buffered = "";
      let raf = 0;
      const flush = () => {
        raf = 0;
        if (!buffered) return;
        const chunk = buffered;
        buffered = "";
        patch((m) => ({ ...m, content: m.content + chunk }));
      };
      const fail = (code: ChatErrorCode) => {
        flush();
        setError({ code, message: MESSAGES[code] });
        setStatus("error");
        setMessages((all) =>
          all.flatMap((m) =>
            m.id !== asstId ? [m] : m.content ? [{ ...m, pending: false, failed: true }] : [],
          ),
        );
      };

      let failed = false;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId, sessionId: getSessionId(), message: trimmed, pill }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          fail(res.status === 429 || body?.error === "rate_limited" ? "rate_limited" : res.status >= 500 ? "internal" : "upstream");
          failed = true;
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let finished = false;
          const handle = (evt: ChatStreamEvent) => {
            if (evt.type === "token") {
              buffered += evt.text;
              if (!raf) raf = requestAnimationFrame(flush);
            } else if (evt.type === "done") {
              finished = true;
              flush();
              doneId = evt.messageId;
              setMessages((all) =>
                all.map((m) => (m.id === asstId ? { ...m, id: evt.messageId, pending: false } : m)),
              );
            } else if (evt.type === "error") {
              failed = true;
              fail(evt.code);
            }
          };
          for (;;) {
            const { value, done } = await reader.read();
            buf += decoder.decode(value, { stream: !done });
            const parsed = parseSseChunk(done ? buf + "\n\n" : buf);
            buf = parsed.rest;
            parsed.events.forEach(handle);
            if (done) break;
          }
          if (!finished && !failed) {
            failed = true;
            fail("network");
          }
        }
      } catch (e) {
        if (ctrl.signal.aborted || (e as Error)?.name === "AbortError") {
          flush();
          patch((m) => ({ ...m, pending: false }));
          setMessages((all) => all.filter((m) => m.id !== asstId || m.content));
        } else {
          failed = true;
          fail("network");
        }
      } finally {
        if (raf) cancelAnimationFrame(raf);
        busy.current = false;
        if (streamAbort.current === ctrl) streamAbort.current = null;
        if (!failed) setStatus("idle");
      }
    },
    [meetingId],
  );

  const stop = useCallback(() => streamAbort.current?.abort(), []);

  const retry = useCallback(() => {
    const prev = last.current;
    if (!prev || busy.current) return;
    setMessages((all) => {
      let i = all.length - 1;
      while (i >= 0 && all[i].role !== "user") i--;
      return i >= 0 ? all.slice(0, i) : all;
    });
    void send(prev.text, prev.pill);
  }, [send]);

  return { messages, status, error, send, stop, retry };
}
