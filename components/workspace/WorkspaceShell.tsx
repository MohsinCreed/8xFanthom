"use client";

import { useState } from "react";
import type { MeetingWorkspaceData } from "@/lib/types";
import { AskAiButton, ChatDrawer } from "./ChatDrawer";
import { PlayerProvider } from "./PlayerProvider";
import { AudioPlayer } from "./AudioPlayer";
import { TranscriptPane } from "./TranscriptPane";
import { SummaryPanel } from "./SummaryPanel";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function WorkspaceShell({ data }: { data: MeetingWorkspaceData }) {
  const { meeting, participants, segments, actionItems, clips } = data;
  const chapters = meeting.summary_json?.chapters ?? [];
  const done = actionItems.filter((a) => a.completed).length;
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <PlayerProvider src={meeting.audio_url} duration={meeting.duration} segments={segments}>
      <div className="lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:overflow-hidden">
        <section className="min-w-0 lg:overflow-y-auto" aria-label="Recording and summary">
          <div className="px-5 pt-6 lg:px-10 lg:pt-8">
            <WorkspaceHeader meeting={meeting} participants={participants} />
          </div>
          <div className="sticky top-0 z-20 bg-background/95 px-5 py-4 backdrop-blur lg:px-10">
            <AudioPlayer
              segments={segments}
              participants={participants}
              chapters={chapters}
              clips={clips}
            />
          </div>
          <div className="px-5 pb-16 pt-4 lg:px-10">
            <SummaryPanel summary={meeting.summary_json} participantsCount={participants.length} />
          </div>
        </section>

        <section
          className="flex min-h-[70dvh] min-w-0 flex-col border-t border-border bg-card lg:min-h-0 lg:border-l lg:border-t-0"
          aria-label="Transcript and tasks"
        >
          <Tabs defaultValue="transcript" className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList variant="line" className="h-12 w-full justify-start gap-1 rounded-none border-b border-border bg-transparent px-4">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="actions">
                Action items
                <span className="tnum ml-1.5 text-xs text-muted-foreground">
                  {done}/{actionItems.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="clips">
                Clips
                <span className="tnum ml-1.5 text-xs text-muted-foreground">{clips.length}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" className="min-h-0 flex-1">
              <TranscriptPane
                segments={segments}
                participants={participants}
                className="h-full max-h-[75dvh] lg:max-h-none"
              />
            </TabsContent>
            <TabsContent value="actions" className="overflow-y-auto p-6 text-sm text-muted-foreground">
              The action board arrives in the next phase.
            </TabsContent>
            <TabsContent value="clips" className="overflow-y-auto p-6 text-sm text-muted-foreground">
              Clip creation and sharing arrive in a later phase.
            </TabsContent>
          </Tabs>
        </section>
      </div>
      <AskAiButton open={chatOpen} onOpenChange={setChatOpen} />
      <ChatDrawer meetingId={meeting.id} open={chatOpen} onOpenChange={setChatOpen} />
    </PlayerProvider>
  );
}
