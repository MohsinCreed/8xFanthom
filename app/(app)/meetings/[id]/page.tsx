import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMeetingWorkspace } from "@/lib/data";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

type Props = { params: Promise<{ id: string }> };

export default async function MeetingPage({ params }: Props) {
  const { id } = await params;
  // Real errors throw to the error boundary; only a missing row is a 404.
  const data = await getMeetingWorkspace(id);
  if (!data) notFound();
  return <WorkspaceShell data={data} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const data = await getMeetingWorkspace(id);
    return { title: data ? data.meeting.title : "Meeting not found" };
  } catch {
    return { title: "Meeting" };
  }
}
