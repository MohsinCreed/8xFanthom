export interface TimedSegment {
  start_time: number;
  end_time: number;
  text: string;
}

export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Index of the last segment with start_time <= t (binary search), or -1 before the first. */
export function findActiveIndex(segments: TimedSegment[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start_time <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/** `[mm:ss] Name: text` per line — the compact form sent to the LLM. */
export function compactTranscript(
  segments: (TimedSegment & { speaker: string })[],
): string {
  return segments
    .map((s) => `[${fmtTime(s.start_time)}] ${s.speaker}: ${s.text}`)
    .join("\n");
}
