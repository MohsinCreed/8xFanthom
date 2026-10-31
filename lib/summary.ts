import { z } from "zod";
import { getGroq, GROQ_MODEL } from "./groq";

export const SummarySchema = z.object({
  overview: z.string(),
  decisions: z.array(z.object({ text: z.string(), time: z.number() })),
  key_topics: z.array(z.string()),
  chapters: z.array(z.object({ title: z.string(), start_time: z.number() })),
  risks: z.array(
    z.object({
      text: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      time: z.number(),
    }),
  ),
});
export type Summary = z.infer<typeof SummarySchema>;

interface Input {
  title: string;
  participants: { name: string; role: string | null }[];
  segments: { speaker: string; text: string; start_time: number; end_time: number }[];
}

const SYSTEM = `You summarize meeting transcripts. Return ONLY a JSON object with keys:
overview (2-4 sentence string), decisions (array of {text, seq}), key_topics (array of 3-6 short strings),
chapters (array of {title, seq} — 4-6 chapters in chronological order, first chapter seq 0),
risks (array of {text, severity: "low"|"medium"|"high", seq}).
Each transcript line is prefixed with [seq|mm:ss]. "seq" must be the integer seq of the line where the item is discussed. Use only facts from the transcript.`;

/** Generates a structured summary; model cites seq indices which we map back to seconds. */
export async function generateSummary(input: Input): Promise<Summary> {
  const lines = input.segments
    .map((s, i) => {
      const m = Math.floor(s.start_time / 60);
      const sec = Math.floor(s.start_time % 60);
      return `[${i}|${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}] ${s.speaker}: ${s.text}`;
    })
    .join("\n");
  const roster = input.participants.map((p) => `${p.name} (${p.role ?? "participant"})`).join(", ");

  const res = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Meeting: ${input.title}\nParticipants: ${roster}\n\nTranscript:\n${lines}` },
    ],
  });

  const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}");
  const at = (seq: unknown) => {
    const i = Math.min(Math.max(Number(seq) || 0, 0), input.segments.length - 1);
    return input.segments[i].start_time;
  };
  return SummarySchema.parse({
    overview: raw.overview,
    key_topics: raw.key_topics ?? [],
    decisions: (raw.decisions ?? []).map((d: { text: string; seq: number }) => ({ text: d.text, time: at(d.seq) })),
    chapters: (raw.chapters ?? []).map((c: { title: string; seq: number }) => ({ title: c.title, start_time: at(c.seq) })),
    risks: (raw.risks ?? []).map((r: { text: string; severity: string; seq: number }) => ({
      text: r.text,
      severity: r.severity,
      time: at(r.seq),
    })),
  });
}
