import { MeetingList } from "@/components/meetings/MeetingList";
import { getMeetings } from "@/lib/data";

// Live data (task progress changes); never prerender at build time.
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const meetings = await getMeetings();
  const count = meetings.length;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {count} recorded {count === 1 ? "meeting" : "meetings"}
        </p>
      </header>
      <MeetingList meetings={meetings} />
    </div>
  );
}
