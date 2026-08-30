// electron/context-intelligence/evaluation/answer-quality.eval.mjs
//
// Phase 22 — offline LLM answer-quality evaluation runner.
//
// NOT a .test.mjs file — excluded from the node --test CI glob intentionally.
// Run manually:  npm run eval:interview
//
// Requirements:
//   ANTHROPIC_API_KEY=<key>  (required for LLM generation and judging)
//   EVAL_MODEL=<model>       (optional, defaults to claude-haiku-4-5-20251001)
//   npm run build:electron   (dist-electron must be up to date)

import Anthropic from '@anthropic-ai/sdk';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Guard: require API key before doing anything else ────────────────────────

const API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
if (!API_KEY) {
  console.error(
    '\n[eval:interview] ANTHROPIC_API_KEY is not set.\n' +
    'Export the key before running:\n' +
    '  export ANTHROPIC_API_KEY=sk-ant-...\n' +
    '  npm run eval:interview\n' +
    '\nThe runner requires a valid key to generate answers and run the judge.\n' +
    'No files have been modified. Exiting without error.\n',
  );
  process.exit(0); // graceful — no CI failure
}

// ── Load dist-electron modules ───────────────────────────────────────────────

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');

let decide, composePrompt, MODE_POLICIES;
try {
  ({ decide }         = await import(pathToFileURL(path.join(base, 'orchestration/orchestrator.js')).href));
  ({ composePrompt }  = await import(pathToFileURL(path.join(base, 'generation/prompt-composer.js')).href));
  ({ MODE_POLICIES }  = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href));
} catch (err) {
  console.error(
    '\n[eval:interview] Failed to load dist-electron modules.\n' +
    'Run  npm run build:electron  first.\n\n' + err.message + '\n',
  );
  process.exit(1);
}

const POLICY = MODE_POLICIES['technical-interview'];

// ── Models ───────────────────────────────────────────────────────────────────

const GENERATION_MODEL = process.env.EVAL_MODEL ?? 'claude-haiku-4-5-20251001';
const JUDGE_MODEL      = process.env.EVAL_JUDGE_MODEL ?? 'claude-haiku-4-5-20251001';

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
    question: 'Tell me about a time you had to meet a tight deadline.',
    expectedIntent: 'behavioral',
    expectedFollowUpLikelihood: 'medium',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth'],
    notes: 'Medium likelihood — pacing not checked',
  },
  {
    id: 'aq_006',
    question: 'Are you familiar with Kubernetes?',
    expectedIntent: 'knowledge_check',
    expectedFollowUpLikelihood: 'low',
    expectedDepth: 'brief',
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
    question: 'Why is my React component re-rendering too many times?',
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
    question: 'Tell me about yourself.',
    expectedIntent: 'introduction',
    expectedFollowUpLikelihood: 'low',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth'],
    notes: 'Low likelihood — introduction rarely draws follow-up',
  },
  {
    id: 'aq_011',
    question: 'Walk me through a challenging technical project you have worked on.',
    expectedIntent: 'project_context',
    expectedFollowUpLikelihood: 'medium',
    expectedDepth: 'standard',
    requiredDimensions: ['voice', 'strategy_adherence', 'depth'],
    notes: 'Medium likelihood — pacing not checked',
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

// ── Deterministic pre-filter ─────────────────────────────────────────────────

const WRONG_VOICE_RE = /\bas an ai\b|\bi'?d be happy to\b|\bcertainly!|\bgreat question!|\bof course!|\babsolutely!|\bi cannot provide\b|\bi'?m unable to\b/i;
const TEMPLATE_LEAK_RE = /^#{2,3}\s/m;
const FABRICATION_RE   = /\bin my (?:previous|current|last|former) (?:role|job|company|team)\b|\bwhen i (?:built|created|developed|implemented|worked on)\b|\bat my (?:previous|current|last) (?:company|employer|job)\b/i;

// Intents where personal-experience markers are fabrications (no evidence supplied)
const GENERAL_KNOWLEDGE_INTENTS = new Set([
  'concept_explanation', 'mechanism_explanation', 'coding_task',
  'comparison', 'tradeoff', 'knowledge_check', 'debugging', 'optimization',
]);

function deterministicPreFilter(answer, fixture, actualIntent) {
  const flags = [];

  if (WRONG_VOICE_RE.test(answer))  flags.push('wrong_voice');

  // Heading leak in conversational answers (coding output may legitimately have markdown)
  if (fixture.expectedIntent !== 'coding_task' && TEMPLATE_LEAK_RE.test(answer)) {
    flags.push('template_leak');
  }

  // Too brief for a deep-intent question
  const wordCount = answer.trim().split(/\s+/).length;
  if (fixture.expectedDepth === 'deep' && wordCount < 30) flags.push('too_brief');

  // Fabricated personal experience in a general-knowledge question (no evidence provided)
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
  const msg = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 256,
    system: JUDGE_SYSTEM,
    messages: [{ role: 'user', content: buildJudgeUserMessage(fixture, actualIntent, steps, answer) }],
  });

  const raw = msg.content[0]?.text ?? '';
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
  // Hard-fail on deterministic signals — no need to call the judge
  if (
    preFilterFlags.includes('wrong_voice') ||
    preFilterFlags.includes('template_leak') ||
    preFilterFlags.includes('fabricated_claim')
  ) {
    return 'FAIL';
  }

  if (!judgeScores) return preFilterFlags.length === 0 ? 'PASS' : 'FAIL';

  const required = new Set(fixture.requiredDimensions);
  if (required.has('voice')              && judgeScores.voice              < 4)      return 'FAIL';
  if (required.has('strategy_adherence') && judgeScores.strategy_adherence < 4)      return 'FAIL';
  if (required.has('depth')             && judgeScores.depth              !== 'pass') return 'FAIL';
  if (required.has('pacing')            && judgeScores.pacing             !== 'pass') return 'FAIL';
  if (required.has('grounding')         && judgeScores.grounding          !== 'pass') return 'FAIL';
  return 'PASS';
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function run() {
  const client = new Anthropic({ apiKey: API_KEY });

  console.log(`\n[eval:interview] Phase 22 — LLM Answer Quality Evaluation`);
  console.log(`Generation model: ${GENERATION_MODEL}`);
  console.log(`Judge model:      ${JUDGE_MODEL}`);
  console.log(`Fixtures:         ${FIXTURES.length}\n`);

  const results = [];

  for (const fixture of FIXTURES) {
    process.stdout.write(`  ${fixture.id}  ${fixture.question.slice(0, 55).padEnd(55)} `);

    // 1. Classify and compose prompt
    const d = decide({
      requestId: fixture.id, requestSequence: 1,
      surface: 'manual_chat', modeId: 'technical-interview',
      scope: { userId: 'eval', modeId: 'technical-interview' },
      sessionId: 'eval-session',
      manualQuestion: fixture.question,
    });

    const actualIntent            = d.interviewIntent?.intent ?? '';
    const actualFollowUpLikelihood = d.interviewIntent?.followUpLikelihood ?? '';
    const steps                   = d.answerStrategy?.steps ?? [];

    const composed = composePrompt({ decision: d, policy: POLICY, evidence: [] });

    // 2. Generate answer
    let answer = '';
    try {
      const msg = await client.messages.create({
        model: GENERATION_MODEL,
        max_tokens: 512,
        system: composed.system,
        messages: [{ role: 'user', content: composed.user }],
      });
      answer = msg.content[0]?.text?.trim() ?? '';
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

    const finalGrade = grade(fixture, preFilterFlags, judgeScores);
    const gradeSymbol = finalGrade === 'PASS' ? '✓' : '✗';
    process.stdout.write(
      `${gradeSymbol}  ` +
      (judgeScores
        ? `voice=${judgeScores.voice} strat=${judgeScores.strategy_adherence} depth=${judgeScores.depth} pacing=${judgeScores.pacing}`
        : preFilterFlags.length > 0 ? `flags: ${preFilterFlags.join(',')}` : 'deterministic only'
      ) + '\n'
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
  }

  // 5. Aggregate
  const nonSkipped = results.filter((r) => r.gradedBy !== 'skipped');
  const passed     = nonSkipped.filter((r) => r.grade === 'PASS').length;
  const failed     = nonSkipped.filter((r) => r.grade === 'FAIL').length;
  const skipped    = results.filter((r) => r.gradedBy === 'skipped').length;
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
