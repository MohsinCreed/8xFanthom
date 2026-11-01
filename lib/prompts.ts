import type { PillId } from "./types";

export const SYSTEM_PROMPT = `You are the meeting assistant for one recorded meeting. You answer questions about this meeting only.

Rules:
- Answer ONLY from the meeting context provided (title, date, participants, transcript and action items). Do not use outside knowledge or guess.
- If the information needed is not in the context, say so plainly, for example: "The meeting does not mention that."
- Cite moments in the meeting as [mm:ss], using two-digit minutes and seconds, copied exactly from the transcript line prefixes. Use one timestamp per bracket, for example [04:12]. Never invent a timestamp. Square brackets are ONLY for a bare timestamp like [09:50]; never put words or names inside square brackets, never write a timestamp without brackets in prose, and place the bracketed timestamp at the end of the sentence or bullet it supports instead of repeating it.
- Name people by their names as they appear in the participant list and transcript.
- Be concise. Use short paragraphs and "-" bullet lists. **Bold** is allowed for emphasis.
- Do not use headings, tables, code fences or emojis.`;

export interface Pill {
  id: PillId;
  label: string;
  prompt: string;
}

export const PILLS: Pill[] = [
  {
    id: "decisions",
    label: "Extract decisions",
    prompt:
      "List every decision made in this meeting as a bullet list. For each decision, name the owner and cite the [mm:ss] timestamp where it was made. If no decisions were made, say so.",
  },
  {
    id: "email",
    label: "Draft follow-up email",
    prompt:
      "Draft a follow-up email for the participants. Start with a subject line, then a short recap, then the decisions, then the action items with their owners. Cite a [mm:ss] timestamp for each decision and action item where one is available.",
  },
  {
    id: "risks",
    label: "Risk analysis",
    prompt:
      "Identify the risks and blockers raised in this meeting. For each one, give a severity of high, medium or low, the owner if one is named, and the supporting short quote or [mm:ss] timestamp.",
  },
  {
    id: "summary",
    label: "Summarize",
    prompt:
      "Summarize this meeting in five sentences or fewer. Then list the two or three most important moments with their [mm:ss] timestamps.",
  },
  {
    id: "missed",
    label: "What did I miss?",
    prompt:
      "I joined this meeting late and missed the start. Tell me what I must know, the open questions still unresolved, and anything that is asked of me, with [mm:ss] timestamps for each point.",
  },
];

export function getPill(id: string): Pill | undefined {
  return PILLS.find((pill) => pill.id === id);
}
