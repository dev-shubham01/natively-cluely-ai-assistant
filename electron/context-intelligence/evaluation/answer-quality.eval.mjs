// electron/context-intelligence/evaluation/answer-quality.eval.mjs
//
// Phase 22/23 — offline LLM answer-quality evaluation runner.
//
// NOT a .test.mjs file — excluded from the node --test CI glob intentionally.
// Run manually:  npm run eval:interview
//
// Requirements:
//   GEMINI_API_KEY=<key>     (required — same key used by the rest of the project)
//   EVAL_MODEL=<model>       (optional, defaults to gemini-3.1-flash-lite)
//   EVAL_DELAY_MS=<number>   (optional, inter-fixture delay in ms, defaults to 5000)
//                            Increase to 8000+ when hitting Gemini free-tier rate limits
//                            (free tier: 15 req/min; each fixture uses 2 API calls)
//   npm run build:electron   (dist-electron must be up to date)

import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Guard: require API key before doing anything else ────────────────────────

const API_KEY = process.env.GEMINI_API_KEY ?? '';
if (!API_KEY) {
  console.error(
    '\n[eval:interview] GEMINI_API_KEY is not set.\n' +
    'Export the key before running:\n' +
    '  export GEMINI_API_KEY=AIza...\n' +
    '  npm run eval:interview\n' +
    '\nThe runner requires a valid Gemini key to generate answers and run the judge.\n' +
    'No files have been modified. Exiting without error.\n',
  );
  process.exit(0); // graceful — no CI failure
}

// ── Load dist-electron modules ───────────────────────────────────────────────

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');

let decide, composePrompt, MODE_POLICIES;
try {
  ({ decide }        = await import(pathToFileURL(path.join(base, 'orchestration/orchestrator.js')).href));
  ({ composePrompt } = await import(pathToFileURL(path.join(base, 'generation/prompt-composer.js')).href));
  ({ MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href));
} catch (err) {
  console.error(
    '\n[eval:interview] Failed to load dist-electron modules.\n' +
    'Run  npm run build:electron  first.\n\n' + err.message + '\n',
  );
  process.exit(1);
}

const POLICY = MODE_POLICIES['technical-interview'];

// ── Models ───────────────────────────────────────────────────────────────────

// gemini-3.1-flash-lite is the project's benchmark model (see package.json benchmark:* scripts).
const GENERATION_MODEL = process.env.EVAL_MODEL       ?? 'gemini-3.1-flash-lite';
const JUDGE_MODEL      = process.env.EVAL_JUDGE_MODEL ?? 'gemini-3.1-flash-lite';
// Inter-fixture delay to stay within Gemini free-tier rate limit (15 req/min).
// Each fixture uses 2 API calls (generate + judge). At 5 s between fixtures the
// effective rate is ~20 calls/min on fast hardware; increase EVAL_DELAY_MS to
// 8000 when hitting 429 errors (24 calls across ~100 s ≈ 14.4 calls/min).
const EVAL_DELAY_MS    = Number(process.env.EVAL_DELAY_MS ?? '5000');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURES = [
  {
    id: 'aq_001',
    question: 'What is a closure?',
    expectedIntent: 'concept_explanation',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_002',
    question: 'How does garbage collection work in JavaScript?',
    expectedIntent: 'mechanism_explanation',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_003',
    question: 'Implement a function to detect a cycle in a linked list.',
    expectedIntent: 'coding_task',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_004',
    question: 'Design a URL shortener at scale.',
    expectedIntent: 'system_design',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'deep',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_005',
    // Phase 23: replaced "Tell me about a time you had to meet a tight deadline."
    // (behavioral, requires personal evidence → noEvidenceNotice fires correctly but
    // makes the fixture ungradeable without mock evidence). Replaced with a mechanism
    // question that exercises explain_mechanism and needs no personal evidence.
    question: 'How does the JavaScript event loop work?',
    expectedIntent: 'mechanism_explanation',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_006',
    // Phase 23: replaced "Are you familiar with Kubernetes?" (knowledge_check with
    // personal familiarity claim → noEvidenceNotice fires, ungradeable without evidence).
    // Replaced with a pure knowledge question that routes to concept_explanation with
    // no personal-evidence requirement and exercises the define_concept strategy.
    question: 'What is Kubernetes?',
    expectedIntent: 'concept_explanation',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_007',
    question: 'What are the tradeoffs between SQL and NoSQL databases?',
    expectedIntent: 'comparison',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_008',
    // Phase 23: original "Why is my React component re-rendering too many times?"
    // triggered AI-assistant response mode (voice=1). Rephrased to interviewer framing.
    // "What are common causes..." (second version) got strat=3 because TRACE_BUG is
    // procedural (symptom → hypotheses → diagnose → fix) but the question asked for
    // general knowledge. Replaced with a scenario-based question that naturally exercises
    // the full TRACE_BUG diagnostic protocol — specific symptom, interviewer framing.
    question: 'A React component re-renders on every keystroke even though its props have not changed. Walk me through how you would debug this.',
    expectedIntent: 'debugging',
    expectedFollowUpLikelihood: 'medium',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth'],
    notes: 'Medium likelihood — pacing not checked',
  },
  {
    id: 'aq_009',
    question: 'How would you scale a social media feed to 100 million daily active users?',
    expectedIntent: 'scalability',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'deep',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_010',
    // Phase 23: replaced "Tell me about yourself." (introduction → requires resume
    // evidence for a meaningful self-intro; noEvidenceNotice fires correctly but makes
    // the fixture ungradeable). Replaced with a tradeoff question that exercises
    // analyze_options with no personal evidence requirement.
    question: 'What are the tradeoffs of using TypeScript over JavaScript?',
    expectedIntent: 'tradeoff',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_011',
    // Phase 23: replaced "Walk me through a challenging technical project you have
    // worked on." (experience_question → requires personal evidence; actual classifier
    // routing was experience_question via EXPERIENCE_CHALLENGE_RE, and the fixture's
    // expectedIntent 'project_context' was also wrong). Replaced with an LLD question
    // that exercises design_classes with no personal evidence requirement.
    question: 'Design a parking lot with object-oriented classes.',
    expectedIntent: 'lld',
    expectedFollowUpLikelihood: 'high',
    expectedDepth: 'deep',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth', 'pacing'],
  },
  {
    id: 'aq_012',
    question: 'How would you optimize a slow database query?',
    expectedIntent: 'optimization',
    expectedFollowUpLikelihood: 'medium',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth'],
    notes: 'Optimization intent — medium likelihood',
  },
];

// ── Gemini helpers ────────────────────────────────────────────────────────────

function extractText(response) {
  // Method 1: direct response.text (string property on the SDK result object)
  if (typeof response.text === 'string' && response.text.length > 0) return response.text;
  // Method 2: SDK accessor (some SDK versions expose response.text as a function)
  if (typeof response.text === 'function') {
    try { const t = response.text(); if (t) return t; } catch {}
  }
  // Method 3: candidates array
  const candidate = response.candidates?.[0];
  if (!candidate) return '';
  const parts = candidate.content?.parts;
  if (Array.isArray(parts)) return parts.map((p) => p?.text ?? '').join('');
  if (typeof candidate.content === 'string') return candidate.content;
  return '';
}

async function geminiGenerate(client, model, systemInstruction, userMessage, maxOutputTokens = 512) {
  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    config: {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      maxOutputTokens,
      temperature: 0.4,
    },
  });
  return extractText(response);
}

// ── Deterministic pre-filter ─────────────────────────────────────────────────

const WRONG_VOICE_RE   = /\bas an ai\b|\bi'?d be happy to\b|\bcertainly!|\bgreat question!|\bof course!|\babsolutely!|\bi cannot provide\b|\bi'?m unable to\b/i;
const TEMPLATE_LEAK_RE = /^#{2,3}\s/m;
const FABRICATION_RE   = /\bin my (?:previous|current|last|former) (?:role|job|company|team)\b|\bwhen i (?:built|created|developed|implemented|worked on)\b|\bat my (?:previous|current|last) (?:company|employer|job)\b/i;

const GENERAL_KNOWLEDGE_INTENTS = new Set([
  'concept_explanation', 'mechanism_explanation', 'coding_task',
  'comparison', 'tradeoff', 'knowledge_check', 'debugging', 'optimization',
]);

function deterministicPreFilter(answer, fixture, actualIntent) {
  const flags = [];

  if (WRONG_VOICE_RE.test(answer)) flags.push('wrong_voice');

  if (fixture.expectedIntent !== 'coding_task' && TEMPLATE_LEAK_RE.test(answer)) {
    flags.push('template_leak');
  }

  const wordCount = answer.trim().split(/\s+/).length;
  if (fixture.expectedDepth === 'deep' && wordCount < 30) flags.push('too_brief');

  const intentForCheck = actualIntent || fixture.expectedIntent;
  if (GENERAL_KNOWLEDGE_INTENTS.has(intentForCheck) && FABRICATION_RE.test(answer)) {
    flags.push('fabricated_claim');
  }

  return flags;
}

// ── LLM judge ────────────────────────────────────────────────────────────────

const JUDGE_SYSTEM =
  'You are an expert technical interview answer evaluator. ' +
  'Your job is to grade an AI-generated answer against a rubric. ' +
  'Respond with a JSON object only — no prose, no markdown code fences.';

function buildJudgeUserMessage(fixture, actualIntent, steps, answer) {
  const stepList = Array.isArray(steps) && steps.length
    ? steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
    : '  (strategy steps not available)';

  return (
    `Intent: ${actualIntent || fixture.expectedIntent}\n` +
    `Expected depth: ${fixture.expectedDepth} (brief=1-2 sentences, standard=moderate, deep=comprehensive)\n` +
    `Follow-up likelihood: ${fixture.expectedFollowUpLikelihood} ` +
    `(high=leave clear entry points, low=answer directly and completely, medium=neutral)\n\n` +
    `Strategy steps the answer should follow:\n${stepList}\n\n` +
    `Rate the answer on these dimensions:\n\n` +
    `voice (1-5):\n` +
    `  5 = sounds like a person thinking out loud mid-conversation\n` +
    `  4 = natural, occasional written-text feel\n` +
    `  3 = borderline — some natural flow, some formal writing\n` +
    `  2 = mostly reads like documentation or an AI assistant\n` +
    `  1 = clearly AI: "Certainly!", meta-commentary, or over-formal tone\n\n` +
    `strategy_adherence (1-5):\n` +
    `  5 = follows the strategy steps in the correct order with appropriate detail\n` +
    `  4 = mostly follows, minor omissions\n` +
    `  3 = partial — some steps missing or out of order\n` +
    `  2 = little resemblance to the strategy steps\n` +
    `  1 = ignores the strategy completely\n\n` +
    `depth: "pass" or "fail"\n` +
    `  pass = depth matches expected level\n` +
    `  fail = too long for brief, too short for deep, or otherwise wrong depth\n\n` +
    `pacing: "pass" or "fail"\n` +
    `  pass = pacing matches follow-up likelihood\n` +
    `    (high: thorough but leaves entry points; low: complete and direct; medium: neutral)\n` +
    `  fail = wrong pacing for the follow-up likelihood\n\n` +
    `Respond with ONLY this JSON (no markdown, no prose):\n` +
    `{"voice":<1-5>,"strategy_adherence":<1-5>,"depth":"pass"|"fail","pacing":"pass"|"fail","explanation":"<what failed, or all pass>"}\n\n` +
    `Question: ${fixture.question}\n\n` +
    `Answer to evaluate:\n${answer}`
  );
}

async function runJudge(client, fixture, actualIntent, steps, answer) {
  const raw = await geminiGenerate(
    client, JUDGE_MODEL, JUDGE_SYSTEM,
    buildJudgeUserMessage(fixture, actualIntent, steps, answer),
    256,
  );
  // Strip any accidental markdown fence
  const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(jsonText);
  return {
    voice:              Number(parsed.voice),
    strategy_adherence: Number(parsed.strategy_adherence),
    depth:              parsed.depth === 'pass' ? 'pass' : 'fail',
    pacing:             parsed.pacing === 'pass' ? 'pass' : 'fail',
    explanation:        String(parsed.explanation ?? ''),
  };
}

// ── Grading logic ─────────────────────────────────────────────────────────────

function grade(fixture, preFilterFlags, judgeScores) {
  if (
    preFilterFlags.includes('wrong_voice') ||
    preFilterFlags.includes('template_leak') ||
    preFilterFlags.includes('fabricated_claim')
  ) {
    return 'FAIL';
  }

  if (!judgeScores) return preFilterFlags.length === 0 ? 'PASS' : 'FAIL';

  const required = new Set(fixture.requiredDimensions);
  if (required.has('voice')              && judgeScores.voice              < 4)       return 'FAIL';
  if (required.has('strategy_adherence') && judgeScores.strategy_adherence < 4)       return 'FAIL';
  if (required.has('depth')             && judgeScores.depth              !== 'pass') return 'FAIL';
  if (required.has('pacing')            && judgeScores.pacing             !== 'pass') return 'FAIL';
  if (required.has('grounding')         && judgeScores.grounding          !== 'pass') return 'FAIL';
  return 'PASS';
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function run() {
  const client = new GoogleGenAI({ apiKey: API_KEY });

  console.log(`\n[eval:interview] Phase 22/23 — LLM Answer Quality Evaluation`);
  console.log(`Generation model: ${GENERATION_MODEL}`);
  console.log(`Judge model:      ${JUDGE_MODEL}`);
  console.log(`Fixtures:         ${FIXTURES.length}`);
  console.log(`Inter-fixture delay: ${EVAL_DELAY_MS} ms  (set EVAL_DELAY_MS to adjust)\n`);

  const results = [];

  for (const fixture of FIXTURES) {
    const depthTag = fixture.expectedDepth === 'deep' ? '[deep/1024t] ' : '[std/512t]  ';
    process.stdout.write(`  ${fixture.id}  ${depthTag}${fixture.question.slice(0, 48).padEnd(48)} `);

    // 1. Classify and compose prompt
    const d = decide({
      requestId: fixture.id, requestSequence: 1,
      surface: 'manual_chat', modeId: 'technical-interview',
      scope: { userId: 'eval', modeId: 'technical-interview' },
      sessionId: 'eval-session',
      manualQuestion: fixture.question,
    });

    const actualIntent             = d.interviewIntent?.intent ?? '';
    const actualFollowUpLikelihood = d.interviewIntent?.followUpLikelihood ?? '';
    const steps                    = d.answerStrategy?.steps ?? [];

    const composed = composePrompt({ decision: d, policy: POLICY, evidence: [] });

    // 2. Generate answer — deep fixtures get a larger token budget so 8-step
    // strategies (ANALYZE_SCALE, DESIGN_SYSTEM) have room to cover every step.
    const genTokens = fixture.expectedDepth === 'deep' ? 1024 : 512;
    let answer = '';
    try {
      answer = await geminiGenerate(client, GENERATION_MODEL, composed.system, composed.user, genTokens);
      answer = answer.trim();
    } catch (err) {
      console.error(`\n  [${fixture.id}] Generation failed: ${err.message}`);
      results.push({
        caseId: fixture.id, question: fixture.question,
        actualIntent, actualFollowUpLikelihood, answer: '',
        scores: { voice: null, strategy_adherence: null, depth: null, pacing: null, grounding: null },
        flags: [], grade: 'FAIL', gradedBy: 'skipped',
        judgeExplanation: `Generation error: ${err.message}`,
      });
      continue;
    }

    // 3. Deterministic pre-filter
    const preFilterFlags = deterministicPreFilter(answer, fixture, actualIntent);

    // 4. LLM judge (skipped if deterministic failure already found)
    let judgeScores = null;
    let gradedBy = 'deterministic';

    const autoFail =
      preFilterFlags.includes('wrong_voice') ||
      preFilterFlags.includes('template_leak') ||
      preFilterFlags.includes('fabricated_claim');

    if (!autoFail) {
      try {
        judgeScores = await runJudge(client, fixture, actualIntent, steps, answer);
        gradedBy = 'deterministic+llm_judge';
      } catch (err) {
        console.error(`\n  [${fixture.id}] Judge failed: ${err.message}`);
        gradedBy = 'deterministic';
      }
    }

    const finalGrade  = grade(fixture, preFilterFlags, judgeScores);
    const gradeSymbol = finalGrade === 'PASS' ? '✓' : '✗';
    process.stdout.write(
      `${gradeSymbol}  ` +
      (judgeScores
        ? `voice=${judgeScores.voice} strat=${judgeScores.strategy_adherence} depth=${judgeScores.depth} pacing=${judgeScores.pacing}`
        : preFilterFlags.length > 0 ? `flags: ${preFilterFlags.join(',')}` : 'deterministic only'
      ) + '\n',
    );

    results.push({
      caseId: fixture.id,
      question: fixture.question,
      actualIntent,
      actualFollowUpLikelihood,
      answer,
      scores: judgeScores
        ? { voice: judgeScores.voice, strategy_adherence: judgeScores.strategy_adherence,
            depth: judgeScores.depth, pacing: judgeScores.pacing, grounding: null }
        : { voice: null, strategy_adherence: null, depth: null, pacing: null, grounding: null },
      flags: preFilterFlags,
      grade: finalGrade,
      gradedBy,
      judgeExplanation: judgeScores?.explanation,
    });

    // Rate-limit pacing: wait between fixtures so we don't exhaust the Gemini
    // free-tier quota (15 req/min). Skipped after the final fixture.
    const isLast = fixture === FIXTURES[FIXTURES.length - 1];
    if (EVAL_DELAY_MS > 0 && !isLast) {
      await new Promise((r) => setTimeout(r, EVAL_DELAY_MS));
    }
  }

  // 5. Aggregate
  const nonSkipped = results.filter((r) => r.gradedBy !== 'skipped');
  const passed     = nonSkipped.filter((r) => r.grade === 'PASS').length;
  const failed     = nonSkipped.filter((r) => r.grade === 'FAIL').length;
  const skipped    = results.filter((r)  => r.gradedBy === 'skipped').length;
  const passRate   = nonSkipped.length > 0 ? passed / nonSkipped.length : 0;

  const report = {
    date:       new Date().toISOString(),
    model:      GENERATION_MODEL,
    judgeModel: JUDGE_MODEL,
    totalCases: results.length,
    passed,
    failed,
    skipped,
    passRate,
    results,
  };

  console.log('\n── Results ─────────────────────────────────────────────────');
  console.log(`Total:   ${results.length}`);
  console.log(`Passed:  ${passed}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Pass rate (non-skipped): ${(passRate * 100).toFixed(1)}%`);
  console.log(passRate >= 0.8 ? '\n✓ PASS — ≥ 80% threshold met' : '\n✗ FAIL — below 80% threshold');

  // 6. Write JSON report
  const resultsDir = path.join(__dirname, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const datePart   = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(resultsDir, `${datePart}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport written to: ${reportPath}\n`);
}

run().catch((err) => {
  console.error('\n[eval:interview] Unexpected error:', err);
  process.exit(1);
});
