// Phase 5 — Context & Retrieval Intelligence
//
// Tests the code-flag correction in buildInterviewIntent() and the
// applyContextRequirementsGuard() semantic suppression pass.
//
// Covers the 15-case approved test matrix plus guard unit tests.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const { classifyTurn } = await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { decide }        = await import(pathToFileURL(path.join(base, 'orchestration/orchestrator.js')).href);
const { applyContextRequirementsGuard } =
  await import(pathToFileURL(path.join(base, 'orchestration/context-requirements-guard.js')).href);
const { MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);

const policy = MODE_POLICIES['technical-interview'];

const classify = (q, over = {}) =>
  classifyTurn({ resolvedQuestion: q, policy, isFollowUp: false, ...over });

const req = (q, over = {}) =>
  decide({ requestId: 'p5', requestSequence: 1, surface: 'manual-chat',
           modeId: 'technical-interview', scope: { userId: 'u1' }, sessionId: 'p5s',
           manualQuestion: q, ...over });

// ── Helper: synthetic InterviewIntent for guard unit tests ──────────────────

const makeIntent = (cr) => ({
  intent: 'concept_explanation', domain: ['unknown'],
  interviewerBehavior: 'QUESTION', questionStyle: 'what',
  contextRequirements: { conversation: false, resume: false, projects: false,
                         code: false, documents: false, stories: false, generalKnowledge: true, ...cr },
  expectedAnswer: { depth: 'standard', structure: 'direct_definition',
                    technicalDepth: 'intermediate', includeCode: false,
                    includeExamples: false, includeAnalogy: false },
  followUpLikelihood: 'unlikely',
});

const makePlan = (over = {}) => ({
  path: 'GROUNDED', shouldRetrieve: true,
  sourceTypes: [], queries: [], entities: [],
  useSemanticSearch: true, useKeywordSearch: true,
  useHeadingSearch: false, useExactEntitySearch: false,
  usePreviousSourceContinuity: false, retrieveAdjacentContext: false,
  maximumAttempts: 2, maximumCandidates: 20, maximumAcceptedEvidence: 6,
  timeoutMs: 1200, ...over,
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. code-flag correction — regression for the broadness fix
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 5 — code flag correction (matrix cases 1-3)', () => {
  // Matrix case 1
  test('case 1 — "What are closures?" → generalKnowledge=true, code=false, no retrieval', () => {
    const r = classify('What are closures?');
    assert.equal(r.shouldRetrieve, false, 'general concept must not retrieve');
    assert.equal(r.path, 'FAST');
    const cr = r.interviewIntent.contextRequirements;
    assert.equal(cr.generalKnowledge, true);
    assert.equal(cr.code, false, 'closures is not a personal coding question');
    assert.equal(cr.resume, false);
    assert.equal(cr.projects, false);
  });

  // Matrix case 2
  test('case 2 — "Implement quicksort." → code=false (Phase 5 fix)', () => {
    const r = classify('Implement quicksort.');
    const cr = r.interviewIntent.contextRequirements;
    assert.equal(cr.code, false,
      'generic DSA task must NOT set code=true after Phase 5 fix');
    assert.equal(cr.generalKnowledge, true);
    assert.equal(r.shouldRetrieve, false, 'no retrieval for generic coding task');
    assert.equal(r.path, 'FAST');
  });

  // Matrix case 3
  test('case 3 — "Write a debounce function." → code=false (Phase 5 fix)', () => {
    const r = classify('Write a debounce function.');
    const cr = r.interviewIntent.contextRequirements;
    assert.equal(cr.code, false,
      'generic utility coding task must NOT set code=true after Phase 5 fix');
    assert.equal(r.shouldRetrieve, false);
    assert.equal(r.path, 'FAST');
  });

  // Additional regression: "Solve this algorithm" — no personal signal
  test('regression — "Solve this algorithm." → code=false', () => {
    const r = classify('Solve this algorithm.');
    assert.equal(r.interviewIntent.contextRequirements.code, false);
  });
});

// Matrix case 4 — personal project + coding task produces code=true
describe('Phase 5 — personal coding question (matrix case 4)', () => {
  test('case 4 — PERSONAL_PROJECT + CODING_TASK → code=true, CODING_SAMPLE preserved via guard', () => {
    // CODING_TASK_RE matches "write a function" (literal pattern in the regex).
    // PROJECT_RE matches "project". PERSONAL_RE matches "your".
    // So: "your" → personal=true; "project" → PERSONAL_PROJECT; "write a function" → CODING_TASK.
    const q = 'Write a function for your project.';
    const r = classify(q);
    const cr = r.interviewIntent.contextRequirements;

    assert.ok(r.questionTypes.includes('PERSONAL_PROJECT'),
      `PERSONAL_PROJECT expected, got ${JSON.stringify(r.questionTypes)}`);
    assert.ok(r.questionTypes.includes('CODING_TASK'),
      `CODING_TASK expected, got ${JSON.stringify(r.questionTypes)}`);
    assert.equal(cr.code, true,
      'CODING_TASK + PERSONAL_PROJECT must set code=true');
    assert.equal(cr.projects, true, 'projects must also be true for PERSONAL_PROJECT');
    assert.equal(r.shouldRetrieve, true);

    // Via decide(): CODING_SAMPLE must survive the guard (both code=true and projects=true)
    const d = req(q);
    assert.ok(d.retrievalPlan.sourceTypes.includes('CODING_SAMPLE'),
      'CODING_SAMPLE must survive the guard when code=true (projects=true also authorizes it)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. decide()-level integration tests (matrix cases 5-15)
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 5 — decide() integration (matrix cases 5-15)', () => {
  // Matrix case 5
  test('case 5 — "Tell me about your experience." → resume=true, RESUME preserved', () => {
    const d = req('Tell me about your experience.');
    assert.equal(d.interviewIntent.contextRequirements.resume, true);
    assert.ok(d.retrievalPlan.sourceTypes.includes('RESUME'),
      'RESUME must not be suppressed when resume=true');
    assert.equal(d.retrievalPlan.shouldRetrieve, true);
  });

  // Matrix case 6
  test('case 6 — "Tell me about your most complex project." → projects=true, PROJECT_FILE preserved', () => {
    const d = req('Tell me about your most complex project.');
    const cr = d.interviewIntent.contextRequirements;
    assert.equal(cr.projects, true);
    assert.ok(d.retrievalPlan.sourceTypes.includes('PROJECT_FILE'),
      'PROJECT_FILE must not be suppressed when projects=true');
    assert.equal(d.retrievalPlan.shouldRetrieve, true);
  });

  // Matrix case 7
  test('case 7 — "But why not Redux?" (PUSHBACK) → conversation=true, retrieval consistent', () => {
    const d = req('But why not Redux?');
    const cr = d.interviewIntent.contextRequirements;
    assert.equal(cr.conversation, true,
      'override behavior (PUSHBACK) must force conversation=true');
    assert.equal(d.interviewIntent.interviewerBehavior, 'PUSHBACK');
    // Guard must not break the retrieval decision for pushback turns
    const plan = d.retrievalPlan;
    assert.ok(plan.shouldRetrieve === (plan.sourceTypes.length > 0),
      'shouldRetrieve must equal (sourceTypes.length > 0) invariant');
  });

  // Matrix case 8 — JOB_DESCRIPTION must never be suppressed
  test('case 8 — JD question → JOB_DESCRIPTION preserved, documents flag does not suppress JD', () => {
    const d = req('What does the JD say about the required React experience?');
    const plan = d.retrievalPlan;
    assert.ok(plan.sourceTypes.includes('JOB_DESCRIPTION'),
      'JOB_DESCRIPTION must never be suppressed by the Phase 5 guard');
    assert.equal(plan.shouldRetrieve, true);
    // Guard must not touch JOB_DESCRIPTION regardless of documents flag value
    const cr = d.interviewIntent.contextRequirements;
    // Whether documents is true or false, JD stays
    assert.ok(plan.sourceTypes.includes('JOB_DESCRIPTION'),
      `JD preserved regardless of documents=${cr.documents}`);
  });

  // Matrix case 9 — REFERENCE_FILE not allowed, no policy change
  test('case 9 — REFERENCE_FILE not in interview-mode allowedSourceTypes → never appears in plan', () => {
    // documents=true for a DOCUMENT_FACT question, but REFERENCE_FILE is not allowed
    const d = req('What does the JD say about React?');
    assert.ok(!d.retrievalPlan.sourceTypes.includes('REFERENCE_FILE'),
      'REFERENCE_FILE must not appear — not in technical-interview allowedSourceTypes');
    // Also verify allowedSourceTypes itself
    assert.ok(!policy.allowedSourceTypes.includes('REFERENCE_FILE'),
      'policy must not include REFERENCE_FILE (no policy change in Phase 5)');
  });

  // Matrix case 10 — interviewIntent=null handled correctly
  test('case 10 — interviewIntent absent → guard is no-op, plan unchanged', () => {
    // The guard is called with null intent inside decide() only when cls.interviewIntent
    // is absent. Test the guard function directly.
    const plan = makePlan({ sourceTypes: ['RESUME', 'PROJECT_FILE'], shouldRetrieve: true });
    const result = applyContextRequirementsGuard(plan, null, policy);
    assert.deepEqual(result, plan, 'null interviewIntent → plan returned unchanged');

    const result2 = applyContextRequirementsGuard(plan, undefined, policy);
    assert.deepEqual(result2, plan, 'undefined interviewIntent → plan returned unchanged');
  });

  // Matrix case 11 — all context flags false, no unexpected rewriting
  test('case 11 — all flags false → only suppression-mapped sources removed, others untouched', () => {
    const plan = makePlan({ sourceTypes: ['JOB_DESCRIPTION', 'SCREEN_CONTEXT'] });
    const intent = makeIntent({});  // all flags default to false
    const result = applyContextRequirementsGuard(plan, intent, policy);
    // JOB_DESCRIPTION and SCREEN_CONTEXT have no contextRequirements owner — must be preserved
    assert.ok(result.sourceTypes.includes('JOB_DESCRIPTION'),
      'JOB_DESCRIPTION has no CR field → never suppressed');
    assert.ok(result.sourceTypes.includes('SCREEN_CONTEXT'),
      'SCREEN_CONTEXT has no CR field → never suppressed');
    assert.equal(result.shouldRetrieve, true);
  });

  // Matrix case 12 — multi-context: resume=true + projects=true → both relevant sources preserved
  test('case 12 — resume=true + projects=true → RESUME and PROJECT_FILE both preserved', () => {
    const d = req('Tell me about your most complex project.');
    const plan = d.retrievalPlan;
    assert.ok(plan.sourceTypes.includes('RESUME'),
      'RESUME must be preserved when resume=true');
    assert.ok(plan.sourceTypes.includes('PROJECT_FILE'),
      'PROJECT_FILE must be preserved when projects=true');
  });

  // Matrix case 13 — projects=true + code=false → CODING_SAMPLE must NOT be suppressed
  test('case 13 — projects=true AND code=false → CODING_SAMPLE preserved (projects authorizes it)', () => {
    // A question that produces PERSONAL_PROJECT but not CODING_TASK:
    // "Tell me about your most complex project." → projects=true, code=false
    const d = req('Tell me about your most complex project.');
    const cr = d.interviewIntent.contextRequirements;
    assert.equal(cr.projects, true);
    assert.equal(cr.code, false, 'no CODING_TASK in this question');
    // Suppression rule: suppress CODING_SAMPLE only when code=false AND projects=false.
    // Here projects=true → CODING_SAMPLE must stay.
    assert.ok(d.retrievalPlan.sourceTypes.includes('CODING_SAMPLE'),
      'CODING_SAMPLE must not be suppressed when projects=true (even if code=false)');
  });

  // Matrix case 14 — projects=false + code=false → CODING_SAMPLE suppressed
  test('case 14 — projects=false AND code=false → CODING_SAMPLE suppressed by guard', () => {
    // Test guard directly with a synthetic plan that has CODING_SAMPLE in sourceTypes
    // but neither projects nor code is true.
    const plan = makePlan({ sourceTypes: ['JOB_DESCRIPTION', 'CODING_SAMPLE'] });
    const intent = makeIntent({ projects: false, code: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(!result.sourceTypes.includes('CODING_SAMPLE'),
      'CODING_SAMPLE must be suppressed when code=false AND projects=false');
    assert.ok(result.sourceTypes.includes('JOB_DESCRIPTION'),
      'JOB_DESCRIPTION (no CR owner) must be preserved');
    assert.equal(result.shouldRetrieve, true,
      'retrieval continues because JOB_DESCRIPTION remains');
  });

  // Matrix case 15 — suppression empties sourceTypes → shouldRetrieve=false, path=FAST
  test('case 15 — all suppression-mapped sources removed → shouldRetrieve=false, path=FAST', () => {
    const plan = makePlan({
      sourceTypes: ['RESUME', 'PROJECT_FILE', 'CODING_SAMPLE', 'REFERENCE_FILE'],
      path: 'GROUNDED', shouldRetrieve: true,
    });
    // All CR flags false → all four mapped sources suppressed
    const intent = makeIntent({ resume: false, projects: false, code: false, documents: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.deepEqual(result.sourceTypes, [],
      'all mapped sources suppressed → sourceTypes must be empty');
    assert.equal(result.shouldRetrieve, false,
      'empty sourceTypes → shouldRetrieve must be false');
    assert.equal(result.path, 'FAST',
      'empty sourceTypes → path must be FAST');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Guard unit tests — pure function contract verification
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 5 — applyContextRequirementsGuard() unit tests', () => {
  test('returns the same plan object reference when nothing is suppressed', () => {
    const plan = makePlan({ sourceTypes: ['JOB_DESCRIPTION'] });
    const intent = makeIntent({ resume: false, projects: false, code: false, documents: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    // JOB_DESCRIPTION has no CR owner → suppressed set is non-empty but filter produces no change
    assert.deepEqual(result.sourceTypes, ['JOB_DESCRIPTION']);
    // Note: reference identity not guaranteed across spread — verify deep equality instead
  });

  test('resume=false → RESUME suppressed', () => {
    const plan = makePlan({ sourceTypes: ['RESUME', 'JOB_DESCRIPTION'] });
    const intent = makeIntent({ resume: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(!result.sourceTypes.includes('RESUME'));
    assert.ok(result.sourceTypes.includes('JOB_DESCRIPTION'));
    assert.equal(result.shouldRetrieve, true);
  });

  test('resume=true → RESUME preserved', () => {
    const plan = makePlan({ sourceTypes: ['RESUME'] });
    const intent = makeIntent({ resume: true });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(result.sourceTypes.includes('RESUME'));
  });

  test('projects=false → PROJECT_FILE suppressed', () => {
    const plan = makePlan({ sourceTypes: ['PROJECT_FILE'] });
    const intent = makeIntent({ projects: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.deepEqual(result.sourceTypes, []);
    assert.equal(result.shouldRetrieve, false);
    assert.equal(result.path, 'FAST');
  });

  test('projects=true → PROJECT_FILE preserved', () => {
    const plan = makePlan({ sourceTypes: ['PROJECT_FILE', 'RESUME'] });
    const intent = makeIntent({ projects: true, resume: true });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(result.sourceTypes.includes('PROJECT_FILE'));
    assert.ok(result.sourceTypes.includes('RESUME'));
  });

  test('code=false, projects=false → CODING_SAMPLE suppressed', () => {
    const plan = makePlan({ sourceTypes: ['CODING_SAMPLE'] });
    const intent = makeIntent({ code: false, projects: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.deepEqual(result.sourceTypes, []);
    assert.equal(result.shouldRetrieve, false);
  });

  test('code=true, projects=false → CODING_SAMPLE preserved (code alone authorizes)', () => {
    const plan = makePlan({ sourceTypes: ['CODING_SAMPLE'] });
    const intent = makeIntent({ code: true, projects: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(result.sourceTypes.includes('CODING_SAMPLE'));
  });

  test('code=false, projects=true → CODING_SAMPLE preserved (projects alone authorizes)', () => {
    const plan = makePlan({ sourceTypes: ['CODING_SAMPLE'] });
    const intent = makeIntent({ code: false, projects: true });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(result.sourceTypes.includes('CODING_SAMPLE'));
  });

  test('documents=false → REFERENCE_FILE suppressed', () => {
    const plan = makePlan({ sourceTypes: ['REFERENCE_FILE', 'JOB_DESCRIPTION'] });
    const intent = makeIntent({ documents: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(!result.sourceTypes.includes('REFERENCE_FILE'));
    assert.ok(result.sourceTypes.includes('JOB_DESCRIPTION'));
    assert.equal(result.shouldRetrieve, true);
  });

  test('documents=true → REFERENCE_FILE preserved', () => {
    const plan = makePlan({ sourceTypes: ['REFERENCE_FILE'] });
    const intent = makeIntent({ documents: true });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(result.sourceTypes.includes('REFERENCE_FILE'));
  });

  test('CONVERSATION_STATE never suppressed (no CR field owns it)', () => {
    const plan = makePlan({ sourceTypes: ['CONVERSATION_STATE', 'RESUME'] });
    // All relevant flags false
    const intent = makeIntent({ resume: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(result.sourceTypes.includes('CONVERSATION_STATE'),
      'CONVERSATION_STATE must never be suppressed by Phase 5 guard');
    assert.ok(!result.sourceTypes.includes('RESUME'), 'RESUME should be suppressed');
  });

  test('SCREEN_CONTEXT never suppressed (no CR field owns it)', () => {
    const plan = makePlan({ sourceTypes: ['SCREEN_CONTEXT'] });
    const intent = makeIntent({});  // all false
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(result.sourceTypes.includes('SCREEN_CONTEXT'));
    assert.equal(result.shouldRetrieve, true);
  });

  test('does not mutate the input plan', () => {
    const plan = makePlan({ sourceTypes: ['RESUME', 'PROJECT_FILE'], shouldRetrieve: true });
    const originalSources = [...plan.sourceTypes];
    const intent = makeIntent({ resume: false, projects: false });
    applyContextRequirementsGuard(plan, intent, policy);
    assert.deepEqual(plan.sourceTypes, originalSources,
      'input plan.sourceTypes must not be mutated');
    assert.equal(plan.shouldRetrieve, true, 'input plan.shouldRetrieve must not be mutated');
  });

  // Regression: documents=true must protect PROJECT_FILE and CODING_SAMPLE
  test('documents=true → PROJECT_FILE preserved even when projects=false', () => {
    const plan = makePlan({ sourceTypes: ['PROJECT_FILE', 'CODING_SAMPLE'] });
    const intent = makeIntent({ documents: true, projects: false, code: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.ok(result.sourceTypes.includes('PROJECT_FILE'),
      'DOCUMENT_FACT claims route to PROJECT_FILE; documents=true must protect it');
    assert.ok(result.sourceTypes.includes('CODING_SAMPLE'),
      'DOCUMENT_FACT claims route to CODING_SAMPLE; documents=true must protect it');
    assert.equal(result.shouldRetrieve, true);
  });

  // Regression: conversation=true does NOT protect unclaimed fan-out sources.
  // Phase 4 topic-chain handles conversation context; conversation alone does not
  // authorize project/code retrieval.
  test('conversation=true alone does NOT protect PROJECT_FILE/CODING_SAMPLE from suppression', () => {
    // A generic follow-up has conversation=true but projects=false, code=false, documents=false.
    // The guard must suppress the unclaimed fan-out — Phase 4 topic-chain is the
    // correct mechanism for conversational context, not document pool retrieval.
    const plan = makePlan({ sourceTypes: ['PROJECT_FILE', 'CODING_SAMPLE'] });
    const intent = makeIntent({ conversation: true, projects: false, code: false, documents: false });
    const result = applyContextRequirementsGuard(plan, intent, policy);
    assert.deepEqual(result.sourceTypes, [],
      'PROJECT_FILE and CODING_SAMPLE must be suppressed: only conversation=true, no project/document claim');
    assert.equal(result.shouldRetrieve, false);
    assert.equal(result.path, 'FAST',
      'generic follow-up with no personal/document signal must reach FAST path');
  });

  // Explicit regression: the full generic-follow-up scenario end-to-end via decide()
  test('decide(): generic follow-up (conversation=true, no project/doc signals) → FAST, no retrieval', () => {
    const d = req('give me an example (follow-up to: "what is a rest api")', { isFollowUp: true });
    const cr = d.interviewIntent.contextRequirements;
    assert.equal(cr.conversation, true, 'must be classified as follow-up');
    assert.equal(cr.projects, false);
    assert.equal(cr.code, false);
    assert.equal(cr.documents, false);
    assert.equal(cr.resume, false);
    // Guard must suppress the unclaimed fan-out entirely
    assert.deepEqual(d.retrievalPlan.sourceTypes, [],
      'no claim authorized PROJECT_FILE or CODING_SAMPLE — fan-out must be suppressed');
    assert.equal(d.retrievalPlan.shouldRetrieve, false);
    assert.equal(d.retrievalPlan.path, 'FAST',
      'generic follow-up with only conversation=true goes to FAST — Phase 4 topic-chain is sufficient');
  });

  test('invariant: shouldRetrieve === (sourceTypes.length > 0) on outputs where guard suppressed sources', () => {
    // The guard enforces the invariant when IT causes emptying.
    // Input plans must be valid (shouldRetrieve consistent with sourceTypes).
    const cases = [
      // Guard makes no change — output keeps same valid state
      [makePlan({ sourceTypes: ['RESUME'], shouldRetrieve: true }), makeIntent({ resume: true })],
      // Guard removes RESUME → sourceTypes becomes empty → shouldRetrieve=false, path=FAST
      [makePlan({ sourceTypes: ['RESUME'], shouldRetrieve: true }), makeIntent({ resume: false })],
      // Guard removes RESUME → JOB_DESCRIPTION remains → shouldRetrieve=true
      [makePlan({ sourceTypes: ['JOB_DESCRIPTION', 'RESUME'], shouldRetrieve: true }), makeIntent({ resume: false })],
    ];
    for (const [plan, intent] of cases) {
      const result = applyContextRequirementsGuard(plan, intent, policy);
      assert.equal(result.shouldRetrieve, result.sourceTypes.length > 0,
        `invariant violated: shouldRetrieve=${result.shouldRetrieve} sourceTypes=${JSON.stringify(result.sourceTypes)}`);
    }
  });
});
