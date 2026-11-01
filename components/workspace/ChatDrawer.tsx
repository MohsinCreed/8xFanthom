"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowUp, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import { isTypingTarget } from "@/lib/utils";
import { useChat } from "@/lib/useChat";
import { PILLS, getPill } from "@/lib/prompts";
import { usePlayer } from "./PlayerProvider";
import { ChatMessageBody } from "./ChatMessageBody";

const MAX_CHARS = 2000;
const FOLLOW_THRESHOLD = 48;

const ASK_AI_ID = "ask-ai-button";

/** Floating "Ask AI" button plus the `A` shortcut. Render next to ChatDrawer inside the workspace. */
export function AskAiButton({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "a" && e.key !== "A") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat) return;
      if (e.defaultPrevented) return;
      if (isTypingTarget(e.target)) return;
      if (e.target instanceof HTMLElement && e.target.closest('[role="dialog"]')) return;
      e.preventDefault();
      onOpenChange(!open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Stays mounted while the drawer is open so focus can return to it on close.
  return (
    <Button
      id={ASK_AI_ID}
      type="button"
      hidden={open}
      onClick={() => onOpenChange(true)}
      aria-keyshortcuts="A"
      className="fixed bottom-5 right-5 z-40 h-10 gap-2 rounded-md px-4 max-lg:bottom-20 lg:bottom-6 lg:right-6"
    >
      <Sparkles aria-hidden className="size-4" />
      Ask AI
    </Button>
  );
}

/**
 * The chat drawer. This component stays mounted while the drawer is closed, so useChat
 * (history and any in-flight stream) lives here and survives open/close.
 */
export function ChatDrawer({
  meetingId,
  open,
  onOpenChange,
}: {
  meetingId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { seek } = usePlayer();
  const { messages, status, error, send, stop, retry } = useChat(meetingId);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const followRef = useRef(true);
  const streaming = status === "streaming";

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD;
  };

  // Follow new tokens unless the user scrolled up.
  useLayoutEffect(() => {
    if (open && followRef.current) scrollToBottom();
  }, [messages, status, error, open, scrollToBottom]);

  // Jump to the latest message each time the drawer opens.
  useEffect(() => {
    if (open) followRef.current = true;
  }, [open]);

  // Return focus to the textarea once a reply finishes.
  useEffect(() => {
    if (open && !streaming && status !== "loading") inputRef.current?.focus({ preventScroll: true });
  }, [streaming, status, open]);

  // Announce completion of a streamed reply for screen readers (the log itself stays aria-live off).
  const [announce, setAnnounce] = useState("");
  const wasStreaming = useRef(false);
  useEffect(() => {
    if (wasStreaming.current && !streaming && !error) {
      setAnnounce("Reply ready");
      const t = setTimeout(() => setAnnounce(""), 3000);
      wasStreaming.current = streaming;
      return () => clearTimeout(t);
    }
    wasStreaming.current = streaming;
  }, [streaming, error]);

  const submit = () => {
    const text = draft.trim();
    if (!text || streaming || status === "loading") return;
    followRef.current = true;
    setDraft("");
    void send(text);
  };

  const sendPill = (id: (typeof PILLS)[number]["id"], prompt: string) => {
    followRef.current = true;
    void send(prompt, id);
  };

  const empty = status !== "loading" && messages.length === 0;
  const blocked = streaming || status === "loading";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-label="Ask about this meeting"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById(ASK_AI_ID)?.focus({ preventScroll: true });
          }}
          // Non-modal: clicking the player or transcript must not close the drawer.
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-background text-sm text-foreground outline-none duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-right-10 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-10 data-[state=closed]:fade-out-0 lg:w-[420px]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden className="size-4 text-primary" />
              <DialogPrimitive.Title className="font-heading text-base font-medium">
                Ask about this meeting
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Close chat" className="max-md:size-10">
                <X aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </header>

          <p role="status" className="sr-only">
            {announce}
          </p>

          <div
            ref={listRef}
            onScroll={onScroll}
            role="log"
            aria-live="off"
            aria-label="Conversation"
            tabIndex={0}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            {status === "loading" && (
              <div className="space-y-4" aria-busy="true" aria-label="Loading conversation">
                <Skeleton className="ml-auto h-9 w-2/3" />
                <Skeleton className="h-20 w-5/6" />
                <Skeleton className="ml-auto h-9 w-1/2" />
              </div>
            )}

            {empty && (
              <div className="py-8 text-center">
                <p className="mx-auto max-w-[28ch] text-sm text-muted-foreground">
                  Ask anything about this recording. Answers cite the moments they come from.
                </p>
              </div>
            )}

            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const live = streaming && isLast && m.role === "assistant";
              if (m.role === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                      {(m.pill && getPill(m.pill)?.label) || m.content}
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="flex justify-start">
                  <div className={cn("max-w-[92%] break-words", m.failed && "opacity-70")}>
                    {m.pending && !m.content ? (
                      <p className="text-sm text-muted-foreground motion-safe:animate-pulse">Thinking</p>
                    ) : (
                      <ChatMessageBody content={m.content} onSeek={(s) => seek(s)} streaming={live} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 border-t border-border bg-card px-4 pb-4 pt-3">
            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <span>{error.message}</span>
                <Button type="button" variant="outline" size="sm" onClick={retry}>
                  Try again
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested prompts">
              {PILLS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => sendPill(p.id, p.prompt)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs max-md:min-h-9 font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                maxLength={MAX_CHARS}
                rows={2}
                disabled={blocked}
                aria-label="Message"
                placeholder="Ask a question"
                className="min-h-[3.25rem] max-h-40 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              />
              {streaming ? (
                <Button type="button" variant="outline" onClick={stop} aria-label="Stop generating" className="h-[3.25rem] gap-1.5">
                  <Square aria-hidden className="size-3.5 fill-current" />
                  Stop
                </Button>
              ) : (
                <Button type="submit" disabled={blocked || !draft.trim()} aria-label="Send message" className="h-[3.25rem] gap-1.5">
                  <ArrowUp aria-hidden className="size-4" />
                  Send
                </Button>
              )}
            </form>
            {draft.length > MAX_CHARS - 200 && (
              <p className="tnum text-right text-xs text-muted-foreground">
                {draft.length}/{MAX_CHARS}
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
