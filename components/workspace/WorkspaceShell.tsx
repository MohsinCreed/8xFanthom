"use client";

import { useRef, useState } from "react";
import type { ClipDraft, ClipsState, MeetingWorkspaceData, Segment } from "@/lib/types";
import { AskAiButton, ChatDrawer } from "./ChatDrawer";
import { PlayerProvider, usePlayer } from "./PlayerProvider";
import { AudioPlayer } from "./AudioPlayer";
import { TranscriptPane } from "./TranscriptPane";
import { SummaryPanel } from "./SummaryPanel";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { ActionBoard } from "./ActionBoard";
import { ClipCreator } from "@/components/clips/ClipCreator";
import { ClipList } from "@/components/clips/ClipList";
import { useActionItems } from "@/lib/useActionItems";
import { useClips } from "@/lib/useClips";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function WorkspaceShell({ data }: { data: MeetingWorkspaceData }) {
  const { meeting, participants, segments, actionItems, clips } = data;
  const chapters = meeting.summary_json?.chapters ?? [];
  const actionState = useActionItems(actionItems);
  const clipsState = useClips(clips, meeting.id);
  const [chatOpen, setChatOpen] = useState(false);
  const [tab, setTab] = useState("transcript");
  const [draft, setDraft] = useState<ClipDraft | null>(null);
  const rightRef = useRef<HTMLElement>(null);

  function jumpToTranscript() {
    setTab("transcript");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rightRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  // "Clip from here": prefill the creator with the line plus a short lead-out, then show it.
  function clipFromSegment(segment: Segment) {
    setDraft({
      startTime: segment.start_time,
      endTime: Math.min(segment.end_time + 15, meeting.duration),
      title: segment.text.slice(0, 60).trim(),
    });
    setTab("clips");
    // The clips tab mounts on the next render; focus the title once it exists.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.getElementById("clip-title")?.focus()),
    );
  }

  return (
    <PlayerProvider src={meeting.audio_url} duration={meeting.duration} segments={segments}>
      <div className="lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:overflow-hidden">
        <section className="min-w-0 max-lg:contents lg:overflow-y-auto" aria-label="Recording and summary">
          <div className="px-5 pt-6 lg:px-10 lg:pt-8">
            <WorkspaceHeader meeting={meeting} participants={participants} onJumpToTranscript={jumpToTranscript} />
          </div>
          <div className="sticky top-14 z-20 bg-background/95 px-5 py-2 backdrop-blur lg:top-0 lg:px-10 lg:py-4">
            <AudioPlayer
              segments={segments}
              participants={participants}
              chapters={chapters}
              clips={clipsState.clips}
            />
          </div>
          <div className="px-5 pb-16 pt-4 lg:px-10">
            <SummaryPanel summary={meeting.summary_json} participantsCount={participants.length} />
          </div>
        </section>

        <section
          ref={rightRef}
          className="flex min-h-[70dvh] scroll-mt-40 lg:scroll-mt-0 min-w-0 flex-col border-t border-border bg-card lg:min-h-0 lg:border-l lg:border-t-0"
          aria-label="Transcript and tasks"
        >
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList variant="line" className="h-12 w-full justify-start gap-1 rounded-none border-b border-border bg-transparent px-4">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="actions">
                Action items
                <span className="tnum ml-1.5 text-xs text-muted-foreground">
                  {actionState.done}/{actionState.items.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="clips">
                Clips
                <span className="tnum ml-1.5 text-xs text-muted-foreground">{clipsState.clips.length}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" forceMount className="min-h-0 flex-1 data-[state=inactive]:hidden">
              <TranscriptPane
                segments={segments}
                participants={participants}
                onClipFromSegment={clipFromSegment}
                className="h-[calc(100dvh-14rem)] min-h-80 lg:h-full lg:min-h-0"
                onRequestSearchFocus={() => setTab("transcript")}
              />
            </TabsContent>
            <TabsContent value="actions" className="overflow-y-auto pb-40 lg:pb-28">
              <ActionBoard state={actionState} participants={participants} />
            </TabsContent>
            <TabsContent value="clips" className="overflow-y-auto pb-40 lg:pb-28">
              <ClipsTab state={clipsState} draft={draft} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
      <AskAiButton open={chatOpen} onOpenChange={setChatOpen} />
      <ChatDrawer meetingId={meeting.id} open={chatOpen} onOpenChange={setChatOpen} />
    </PlayerProvider>
  );
}

/** Lives inside PlayerProvider so the creator can read the live duration. */
function ClipsTab({ state, draft }: { state: ClipsState; draft: ClipDraft | null }) {
  const { duration } = usePlayer();
  const { clips, error, dismissError, create, remove } = state;
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
      <ClipCreator duration={duration} draft={draft} onCreate={create} />
      <ClipList clips={clips} onDelete={remove} />
    </div>
  );
}
