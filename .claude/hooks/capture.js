#!/usr/bin/env node
// Appends the verbatim prompt (UserPromptSubmit) and final response (Stop) to .agent-logs/.
// Usage: node capture.js prompt|response   (hook JSON on stdin)
const fs = require('fs');
const path = require('path');

const mode = process.argv[2];
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  try { run(JSON.parse(raw || '{}')); } catch (e) {
    fs.appendFileSync(path.join(__dirname, 'capture-errors.log'), new Date().toISOString() + ' ' + e.stack + '\n');
  }
});

function readTranscript(p) {
  if (!p || !fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter(b => b && b.type === 'text').map(b => b.text).join('\n');
}
function lastModel(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const m = entries[i].message;
    if (entries[i].type === 'assistant' && m && m.model && !m.model.startsWith('<')) return m.model;
  }
  return null;
}
function finalResponse(entries) {
  // last assistant text after the last real (non tool_result) user prompt
  let start = 0;
  entries.forEach((e, i) => {
    if (e.type === 'user' && e.message && textOf(e.message.content).trim()) start = i;
  });
  for (let i = entries.length - 1; i > start; i--) {
    const e = entries[i];
    if (e.type === 'assistant' && e.message) {
      const t = textOf(e.message.content);
      if (t.trim()) return t;
    }
  }
  return '';
}

function run(p) {
  const root = process.env.CLAUDE_PROJECT_DIR || p.cwd || process.cwd();
  const dir = path.join(root, '.agent-logs');
  fs.mkdirSync(dir, { recursive: true });
  const sid = p.session_id || 'unknown';
  const short = sid.slice(0, 8);
  const now = new Date().toISOString();
  const entries = readTranscript(p.transcript_path);
  const model = p.model || lastModel(entries) || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

  let file = fs.readdirSync(dir).find(f => f.endsWith(`_${sid}.md`));
  let body = '', firstTime = now;
  if (file) {
    file = path.join(dir, file);
    const txt = fs.readFileSync(file, 'utf8');
    const idx = txt.indexOf('\n---\n', 4);
    body = txt.slice(idx + 5);
    const m = txt.match(/first_prompt_time: (\S+)/);
    if (m) firstTime = m[1];
  } else {
    const stamp = now.replace(/\.\d+Z$/, '').replace('T', '_').replace(/:/g, '-');
    file = path.join(dir, `${stamp.slice(0, 10)}_${stamp.slice(11)}_${sid}.md`);
    body = `\n# Session Log - ${now.slice(0, 10)}\n\nSession: \`${short}\` | Project: \`${path.basename(root)}\` | Author: \`${author(root)}\`\n\n---\n`;
  }

  const prompts = (body.match(/\[LOG_ENTRY type=PROMPT /g) || []).length;
  let entry;
  if (mode === 'prompt') {
    const num = prompts + 1;
    entry = `\n[LOG_ENTRY type=PROMPT num=${num} session=${short}]\ntimestamp: ${now}\nmodel: ${model}\n\n${p.prompt || ''}\n\n`;
    body += entry;
  } else {
    const resp = p.last_assistant_message || finalResponse(entries);
    entry = `\n[LOG_ENTRY type=RESPONSE num=${prompts} session=${short}]\ntimestamp: ${now}\nmodel: ${model}\n\n${resp}\n\n`;
    body += entry;
  }
  const pt = [...body.matchAll(/\[LOG_ENTRY type=PROMPT [^\]]*\]\ntimestamp: (\S+)/g)].map(m => m[1]);
  const header = `---\nsession_id: ${sid}\ndate: ${firstTime.slice(0, 10)}\nauthor: ${author(root)}\nmodel: ${model}\ntool: claude-code\nproject: ${path.basename(root)}\ntotal_exchanges: ${pt.length}\nfirst_prompt_time: ${pt[0] || firstTime}\nlast_prompt_time: ${pt[pt.length - 1] || now}\n---\n`;
  fs.writeFileSync(file, header + body);
}

function author(root) {
  try { return require('child_process').execSync('git config user.name', { cwd: root }).toString().trim(); } catch { return 'unknown'; }
}
