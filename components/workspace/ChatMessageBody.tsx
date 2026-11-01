"use client";

import type { ReactNode } from "react";

export interface ChatMessageBodyProps {
  content: string;
  onSeek: (seconds: number) => void;
  streaming?: boolean;
}

interface ListBlock {
  kind: "ul" | "ol";
  items: string[];
}

type Block = { kind: "p"; text: string } | ListBlock;

const UL_LINE = /^[-*] (.*)$/;
const OL_LINE = /^\d+\. (.*)$/;
// Matches **bold** and [mm:ss] or [mm:ss-mm:ss]. A range links to its start time.
const INLINE = /\*\*([^*\n]+?)\*\*|\[(\d{1,3}):(\d{2})(?:-\d{1,3}:\d{2})?\]/g;
// A trailing fragment that could still grow into a timestamp, e.g. "[", "[04:", "[04:12-05:3".
const PARTIAL_TIMESTAMP = /^\[\d{0,3}(?::\d{0,2}(?:-\d{0,3}(?::\d{0,2})?)?)?$/;

/** While streaming, hide an unfinished `[...` tail that may still become a timestamp. */
function holdBackPartialTimestamp(text: string): string {
  const open = text.lastIndexOf("[");
  if (open === -1 || text.indexOf("]", open) !== -1) return text;
  return PARTIAL_TIMESTAMP.test(text.slice(open)) ? text.slice(0, open) : text;
}

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: ListBlock | null = null;

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const ul = UL_LINE.exec(line);
    const ol = ul ? null : OL_LINE.exec(line);

    if (line.trim() === "") {
      if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join("\n") });
      paragraph = [];
      if (list) blocks.push(list);
      list = null;
      continue;
    }

    if (ul || ol) {
      if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join("\n") });
      paragraph = [];
      const kind = ul ? "ul" : "ol";
      const item = (ul ?? ol)?.[1] ?? "";
      if (!list || list.kind !== kind) {
        if (list) blocks.push(list);
        list = { kind, items: [] };
      }
      list.items.push(item);
      continue;
    }

    if (list) blocks.push(list);
    list = null;
    paragraph.push(line);
  }

  if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join("\n") });
  if (list) blocks.push(list);
  return blocks;
}

function renderInline(text: string, onSeek: (seconds: number) => void, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${n++}`;

    if (match[1] !== undefined) {
      out.push(
        <strong key={key} className="font-semibold">
          {renderInline(match[1], onSeek, key)}
        </strong>,
      );
    } else {
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      const label = `${String(minutes).padStart(2, "0")}:${match[3]}`;
      out.push(
        <button
          key={key}
          type="button"
          aria-label={`Jump to ${label}`}
          onClick={() => onSeek(minutes * 60 + seconds)}
          className="tnum mx-0.5 inline-flex items-center rounded-sm bg-primary-soft px-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        >
          {label}
        </button>,
      );
    }

    last = start + match[0].length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ChatMessageBody({ content, onSeek, streaming = false }: ChatMessageBodyProps) {
  const text = streaming ? holdBackPartialTimestamp(content) : content;
  const blocks = parseBlocks(text);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const key = `block-${i}`;

        if (block.kind === "p") {
          return (
            <p key={key} className="whitespace-pre-line">
              {renderInline(block.text, onSeek, key)}
            </p>
          );
        }

        const items = block.items.map((item, j) => (
          <li key={`${key}-${j}`}>{renderInline(item, onSeek, `${key}-${j}`)}</li>
        ));

        return block.kind === "ul" ? (
          <ul key={key} className="list-disc space-y-1 pl-5">
            {items}
          </ul>
        ) : (
          <ol key={key} className="list-decimal space-y-1 pl-5">
            {items}
          </ol>
        );
      })}
    </div>
  );
}
