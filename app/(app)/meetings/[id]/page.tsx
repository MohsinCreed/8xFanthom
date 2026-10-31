import { notFound } from "next/navigation";
import { getMeetingWorkspace } from "@/lib/data";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMeetingWorkspace(id).catch(() => null);
  if (!data) notFound();
  return <WorkspaceShell data={data} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMeetingWorkspace(id).catch(() => null);
  return { title: data ? `${data.meeting.title} | Recall` : "Meeting not found | Recall" };
}
