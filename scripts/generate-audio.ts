/**
 * Pre-generates multi-voice TTS audio for every seed meeting.
 *   npx tsx scripts/generate-audio.ts [slug]
 * Output:
 *   public/audio/<slug>.mp3        stitched meeting audio
 *   seed/timings/<slug>.json       { duration, segments: [{ seq, start, end }] }
 * Per-segment mp3s are cached in .audio-cache/ so re-runs only synthesize changes.
 * Provider: Microsoft Edge neural voices via msedge-tts (no API key needed).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const ROOT = process.cwd();
const SEED_DIR = path.join(ROOT, "seed");
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const TIMINGS_DIR = path.join(SEED_DIR, "timings");
const CACHE_DIR = path.join(ROOT, ".audio-cache");

const FEMALE = [
  "en-US-JennyNeural",
  "en-GB-SoniaNeural",
  "en-US-AriaNeural",
  "en-AU-NatashaNeural",
  "en-US-MichelleNeural",
];
// Davis/Tony neural voices are no longer served by the Edge endpoint (verified: every request fails).
const MALE = [
  "en-US-GuyNeural",
  "en-GB-RyanNeural",
  "en-US-AndrewNeural",
  "en-AU-WilliamNeural",
  "en-US-BrianNeural",
  "en-US-ChristopherNeural",
  "en-US-EricNeural",
];

interface SeedParticipant {
  key: string;
  name: string;
  voice_hint?: string;
}
interface SeedMeeting {
  slug: string;
  participants: SeedParticipant[];
  segments: { p: string; text: string }[];
}

function assignVoices(participants: SeedParticipant[]): Record<string, string> {
  let f = 0;
  let m = 0;
  const out: Record<string, string> = {};
  for (const p of participants) {
    const female = /female|woman/i.test(p.voice_hint ?? "");
    out[p.key] = female ? FEMALE[f++ % FEMALE.length] : MALE[m++ % MALE.length];
  }
  return out;
}


/** Duration in seconds of an MPEG audio (Layer III) buffer, by walking frame headers. */
function mp3Duration(buf: Buffer): number {
  const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const SR: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  let pos = 0;
  if (buf.toString("latin1", 0, 3) === "ID3") {
    pos = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  }
  let seconds = 0;
  while (pos + 4 <= buf.length) {
    const h = buf.readUInt32BE(pos);
    const ver = (h >>> 19) & 3;
    const layer = (h >>> 17) & 3;
    const brIdx = (h >>> 12) & 15;
    const srIdx = (h >>> 10) & 3;
    if ((h >>> 21) !== 0x7ff || ver === 1 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) {
      pos++;
      continue;
    }
    const mpeg1 = ver === 3;
    const bitrate = (mpeg1 ? BR1 : BR2)[brIdx] * 1000;
    const sampleRate = SR[ver][srIdx];
    const pad = (h >>> 9) & 1;
    const samples = mpeg1 ? 1152 : 576;
    const size = Math.floor(((mpeg1 ? 144 : 72) * bitrate) / sampleRate) + pad;
    seconds += samples / sampleRate;
    pos += size;
  }
  return seconds;
}

async function synth(voice: string, text: string): Promise<Buffer> {
  const hash = crypto.createHash("sha1").update(`${voice}|${text}`).digest("hex");
  const cached = path.join(CACHE_DIR, `${hash}.mp3`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text);
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        audioStream.on("data", (c: Buffer) => chunks.push(c));
        audioStream.on("end", () => resolve());
        audioStream.on("error", reject);
      });
      tts.close();
      const buf = Buffer.concat(chunks);
      if (buf.length < 500) throw new Error("empty audio");
      fs.writeFileSync(cached, buf);
      return buf;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw new Error(`TTS failed for "${text.slice(0, 40)}…": ${String(lastErr)}`);
}

async function build(file: string) {
  const meeting: SeedMeeting = JSON.parse(fs.readFileSync(file, "utf8"));
  const voices = assignVoices(meeting.participants);
  console.log(`\n${meeting.slug}: ${meeting.segments.length} segments`);
  console.log(
    "voices:",
    meeting.participants.map((p) => `${p.name}=${voices[p.key]}`).join(", "),
  );

  const parts: Buffer[] = [];
  const timings: { seq: number; start: number; end: number }[] = [];
  let t = 0;
  for (let i = 0; i < meeting.segments.length; i++) {
    const seg = meeting.segments[i];
    const voice = voices[seg.p];
    if (!voice) throw new Error(`Unknown speaker key "${seg.p}" at seq ${i}`);
    const buf = await synth(voice, seg.text);
    const dur = mp3Duration(buf);
    if (!dur) throw new Error(`Could not read duration at seq ${i}`);
    timings.push({
      seq: i,
      start: Math.round(t * 100) / 100,
      end: Math.round((t + dur) * 100) / 100,
    });
    parts.push(buf);
    t += dur;
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${meeting.segments.length}`);
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(TIMINGS_DIR, { recursive: true });
  const full = Buffer.concat(parts);
  fs.writeFileSync(path.join(AUDIO_DIR, `${meeting.slug}.mp3`), full);
  const total = Math.round(mp3Duration(full) * 100) / 100;
  fs.writeFileSync(
    path.join(TIMINGS_DIR, `${meeting.slug}.json`),
    JSON.stringify({ duration: total, segments: timings }, null, 2),
  );
  console.log(`  → ${meeting.slug}.mp3  ${total}s (computed ${t.toFixed(2)}s)`);
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const only = process.argv[2];
  const files = fs
    .readdirSync(SEED_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(SEED_DIR, f))
    .filter((f) => !only || JSON.parse(fs.readFileSync(f, "utf8")).slug === only);
  if (!files.length) throw new Error("No seed meetings found");
  for (const f of files) await build(f);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
