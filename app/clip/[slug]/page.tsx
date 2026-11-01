import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipPlayer } from "@/components/clips/ClipPlayer";
import { ShareButton } from "@/components/clips/ShareButton";
import { getPublicClip } from "@/lib/data";
import { fmtTime } from "@/lib/transcript";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicClip(slug);
  if (!data) return { title: "Clip not found | 8x Fathom" };
  const { clip, meeting } = data;
  const title = `${clip.title} | 8x Fathom`;
  const description = `${meeting.title}, ${fmtTime(clip.end_time - clip.start_time)} clip`;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    ...(site ? { metadataBase: new URL(site) } : {}),
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "8x Fathom" },
    twitter: { card: "summary", title, description },
  };
}

export default async function ClipPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicClip(slug);
  if (!data) notFound();
  const { clip, meeting, participants, segments } = data;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Link
        href="/meetings"
        className="inline-flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-foreground"
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
        8x Fathom AI
      </Link>

      <header className="mt-8 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">{clip.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            From {meeting.title}, <span className="tnum">{fmtTime(clip.end_time - clip.start_time)}</span> clip
          </p>
        </div>
        <ShareButton slug={clip.share_slug} />
      </header>

      <ClipPlayer
        src={meeting.audio_url}
        duration={meeting.duration}
        start={clip.start_time}
        end={clip.end_time}
        segments={segments}
        participants={participants}
      />

      <p className="mt-8 text-sm">
        <Link href={`/meetings/${meeting.id}`} className="text-primary underline-offset-4 hover:underline">
          Open full meeting at <span className="tnum">{fmtTime(clip.start_time)}</span>
        </Link>
      </p>
    </main>
  );
}
