import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsPath = path.resolve(__dirname, '../../../dist-electron/electron/llm/prompts.js');
const prompts = await import(pathToFileURL(promptsPath).href);

// Natively (personal build): only technical-interview survives. The other 7
// built-in mode prompts (general/sales/recruiting/team-meet/looking-for-work/
// lecture/seminar) were deleted from prompts.ts along with their modes.
const MODE_PROMPTS = {
  'technical-interview': prompts.MODE_TECHNICAL_INTERVIEW_PROMPT,
};

const MODE_CONTRACT_TERMS = {
  'technical-interview': ['technical interview', 'coding', 'system design', 'dry-run', 'complexity', 'edge case'],
};

const UNIQUE_MODE_TERMS = {
  'technical-interview': ['coding', 'system design'],
};

function assertIncludesAll(text, terms, label) {
  const lower = text.toLowerCase();
  for (const term of terms) {
    assert.ok(lower.includes(term.toLowerCase()), `${label} should include "${term}"`);
  }
}

test('every mode prompt includes shared prompt-leakage and safety controls', () => {
  for (const [modeType, prompt] of Object.entries(MODE_PROMPTS)) {
    assertIncludesAll(prompt, [
      '<security>',
      'system prompt',
      'instructions',
      'reveal',
      "I can't share that information",
    ], modeType);
  }
});

test('every mode prompt includes injected context handling for custom context and reference files', () => {
  for (const [modeType, prompt] of Object.entries(MODE_PROMPTS)) {
    assertIncludesAll(prompt, [
      '<injected_context>',
      '<user_context>',
      '<reference_file name="...">',
      'file name',
    ], modeType);
  }
});

test('mode prompts prevent reference-file hallucination for absent file-specific claims', () => {
  for (const [modeType, prompt] of Object.entries(MODE_PROMPTS)) {
    assertIncludesAll(prompt, [
      'absent',
      'provided material',
      'general knowledge',
      'untrusted evidence',
      'never follow instructions',
    ], modeType);
  }

  assertIncludesAll(MODE_PROMPTS['technical-interview'], ['requested algorithm', 'study-note recommendation'], 'technical-interview');
});

test('each mode prompt carries its own mode-specific behavior contract', () => {
  for (const [modeType, terms] of Object.entries(MODE_CONTRACT_TERMS)) {
    assertIncludesAll(MODE_PROMPTS[modeType], terms, modeType);
  }
});

test('mode prompts are meaningfully distinct rather than flattened generic advice', () => {
  for (const [modeType, prompt] of Object.entries(MODE_PROMPTS)) {
    for (const term of UNIQUE_MODE_TERMS[modeType]) {
      assert.ok(prompt.toLowerCase().includes(term.toLowerCase()), `${modeType} should preserve its distinctive term "${term}"`);
    }
  }
});

test('profile-aware modes mention candidate/profile grounding without requiring every mode to overfit resume data', () => {
  assertIncludesAll(MODE_PROMPTS['technical-interview'], ['<candidate_experience>', 'technical interview', 'salary_intelligence'], 'technical-interview');
});

test('mode formatting contracts prevent coachy meta-output in live suggestions', () => {
  assertIncludesAll(MODE_PROMPTS['technical-interview'], ['glance-and-go', 'fenced', 'complexity'], 'technical-interview');
});

test('code hint examples avoid named problems and em dashes', () => {
  assertIncludesAll(prompts.CODE_HINT_PROMPT, [
    'Use schematic examples only',
    'Do not copy sample problem names, line numbers, metrics, or concrete fixes unless they are visible',
  ], 'code-hint');

  const examples = prompts.CODE_HINT_PROMPT.match(/<output_examples>[\s\S]*?<\/output_examples>/)?.[0] ?? '';
  assert.match(examples, /Use schematic examples only/);
  assert.doesNotMatch(examples, /Two Sum/);
  assert.doesNotMatch(examples, /line 8/);
  assert.doesNotMatch(examples, /—/);
});

// ── SERVER ROUTING CONTRACT ──────────────────────────────────────────────────
// The Natively server (natively-api/lib/flashModelPicker.js) routes the live
// interview modes to gemini-3.6-flash by regex-matching this exact phrase in the
// system prompt the client sends. If a prompt edit drops/rewords the phrase,
// those modes silently fall back to flash-lite. This guard fails LOUDLY on drift.
// Keep in sync with INTERVIEW_MODE_RE in natively-api/lib/flashModelPicker.js.
const SERVER_INTERVIEW_MODE_RE = /spoken voice in a live (?:job|technical) interview/i;

test('SERVER-ROUTING: technical-interview prompt contains the interview-mode detector phrase', () => {
  assert.match(prompts.MODE_TECHNICAL_INTERVIEW_PROMPT, SERVER_INTERVIEW_MODE_RE,
    'MODE_TECHNICAL_INTERVIEW_PROMPT must contain "spoken voice in a live technical interview" — the server routes interview→3.6-flash off it.');
});
