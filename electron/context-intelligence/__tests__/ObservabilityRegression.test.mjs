// electron/context-intelligence/__tests__/ObservabilityRegression.test.mjs
//
// Phase 12: end-to-end observability regression tests.
//
// Verifies that Phase 11 telemetry extensions write correctly and stay
// internally consistent:
//   1. intentDistribution counter accumulates per-intent
//   2. compareDecisions() OD3 detects interviewClassification divergences
//   3. Debug record interview section is sourced from the frozen TurnDecision
//   4. promptSectionsRendered is verbose-gated in the debug record
//
// None of these tests call the retrieval layer or any LLM.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const load = (p) => import(pathToFileURL(path.join(base, p)).href);

const { recordTurnMetrics, getRolloutMetrics, resetRolloutMetrics } =
  await load('observability/rollout-metrics.js');
const { compareDecisions } = await load('observability/answer-trace.js');
const { beginTurnCollector } = await load('debug/turn-collector.js');

// ── shared fixtures ──────────────────────────────────────────────────────────

const identity = (over = {}) => ({
  sessionId: 's1', turnId: 'turn_t1',
  requestId: `req_${Math.random().toString(36).slice(2)}`,
  conversationGeneration: 1, modeId: 'technical-interview', surface: 'manual_chat',
  ...over,
});

const traceStub = (over = {}) => ({
  requestId: 'r', requestSequence: 1, scope: { userId: 'u' }, surface: 'manual_chat',
  originalQuestion: 'What is a closure?', resolvedQuestion: 'What is a closure?',
  resolutionConfidence: 1, modeId: 'technical-interview', modePolicyVersion: '1.1.0',
  questionTypes: ['GENERAL_CS'], groundingPolicy: 'OPEN_KNOWLEDGE',
  authorizedSources: [], prohibitedSources: [], plannedSourceTypes: [],
  retrievalPath: 'FAST',
  retrievalAttempts: [],
  acceptedEvidence: [], rejectedEvidence: [],
  answerability: 'OPEN_KNOWLEDGE',
  claimPlan: [], fallbackUsed: 'NONE', promptTokenEstimate: 400,
  latency: {}, providerAttempts: [], status: 'COMPLETED', errorCodes: [], engine: 'v3',
  ...over,
});

const decisionStub = (over = {}) => ({
  rawQuestion: 'What is a closure?', resolvedQuestion: 'What is a closure?',
  isFollowUp: false, questionTypes: ['GENERAL_CS'],
  claimRequirements: [],
  retrievalPlan: { path: 'FAST', shouldRetrieve: false, sourceTypes: [], queries: [], maximumAcceptedEvidence: 0 },
  groundingPolicy: 'OPEN_KNOWLEDGE',
  ...over,
});

const interviewIntent = (over = {}) => ({
  intent: 'concept_explanation',
  domain: ['general_cs'],
  questionStyle: 'what',
  interviewerBehavior: 'QUESTION',
  contextRequirements: {
    conversation: false, resume: false, projects: false,
    code: false, documents: false, stories: false, generalKnowledge: true,
  },
  expectedAnswer: {
    depth: 'standard', structure: 'direct_definition',
    includeExample: true, includeTradeoffs: false, includeCode: false, includeComplexity: false,
  },
  followUpLikelihood: 'medium',
  ...over,
});

const answerStrategy = (over = {}) => ({
  id: 'define_concept',
  label: 'Define Concept',
  ...over,
});

const sinkTo = (records) => ({ write: (r) => records.push(r), print: () => {} });

// ── 1. intentDistribution ────────────────────────────────────────────────────

describe('intentDistribution counter (OD4)', () => {
  beforeEach(() => resetRolloutMetrics());

  test('accumulates per-intent from interviewClassification on the trace', () => {
    recordTurnMetrics(traceStub({ interviewClassification: { intent: 'concept_explanation' } }));
    recordTurnMetrics(traceStub({ interviewClassification: { intent: 'concept_explanation' } }));
    recordTurnMetrics(traceStub({ interviewClassification: { intent: 'system_design' } }));

    const { counters } = getRolloutMetrics();
    assert.equal(counters.intentDistribution.concept_explanation, 2);
    assert.equal(counters.intentDistribution.system_design, 1);
  });

  test('does not accumulate when interviewClassification is absent', () => {
    recordTurnMetrics(traceStub()); // no interviewClassification
    const { counters } = getRolloutMetrics();
    assert.equal(Object.keys(counters.intentDistribution).length, 0,
      'intentDistribution must stay empty when the field is absent from the trace');
  });

  test('guards against undefined intent key — does not throw, does not write undefined', () => {
    recordTurnMetrics(traceStub({ interviewClassification: { intent: undefined } }));
    const { counters } = getRolloutMetrics();
    assert.ok(!('undefined' in counters.intentDistribution),
      'undefined intent must not create a key in intentDistribution');
  });

  test('accumulates correctly across multiple intents in sequence', () => {
    const intents = ['lld', 'system_design', 'lld', 'behavioral', 'lld'];
    for (const intent of intents) {
      recordTurnMetrics(traceStub({ interviewClassification: { intent } }));
    }
    const { counters } = getRolloutMetrics();
    assert.equal(counters.intentDistribution.lld, 3);
    assert.equal(counters.intentDistribution.system_design, 1);
    assert.equal(counters.intentDistribution.behavioral, 1);
  });
});

// ── 2. compareDecisions() OD3 ───────────────────────────────────────────────

describe('compareDecisions() OD3 — interviewClassification diffs', () => {
  const mkIC = (intent, behavior, strategyId, cr = {}) => ({
    intent, behavior, strategyId, storyBankActivated: cr.stories ?? false,
    contextRequirements: {
      conversation: false, resume: false, projects: false,
      code: false, documents: false, stories: false, generalKnowledge: false,
      ...cr,
    },
  });

  test('no divergence when interviewClassification is identical', () => {
    const ic = mkIC('concept_explanation', 'QUESTION', 'define_concept', { generalKnowledge: true });
    const legacy = traceStub({ interviewClassification: ic });
    const v3     = traceStub({ interviewClassification: ic });
    const diffs = compareDecisions(legacy, v3);
    const icDiffs = diffs.filter((d) => d.field.startsWith('interviewClassification'));
    assert.equal(icDiffs.length, 0, 'identical classification must produce no diffs');
  });

  test('detects intent divergence', () => {
    const legacy = traceStub({ interviewClassification: mkIC('concept_explanation', 'QUESTION', 'define_concept') });
    const v3     = traceStub({ interviewClassification: mkIC('mechanism_explanation', 'QUESTION', 'explain_mechanism') });
    const diffs = compareDecisions(legacy, v3);
    const intentDiff = diffs.find((d) => d.field === 'interviewClassification.intent');
    assert.ok(intentDiff, 'intent divergence must be reported');
    assert.equal(intentDiff.legacy, 'concept_explanation');
    assert.equal(intentDiff.v3, 'mechanism_explanation');
  });

  test('detects behavior divergence', () => {
    const legacy = traceStub({ interviewClassification: mkIC('follow_up_generic', 'QUESTION', 'continue_thread') });
    const v3     = traceStub({ interviewClassification: mkIC('follow_up_generic', 'FOLLOW_UP', 'continue_thread') });
    const diffs = compareDecisions(legacy, v3);
    const behavDiff = diffs.find((d) => d.field === 'interviewClassification.behavior');
    assert.ok(behavDiff, 'behavior divergence must be reported');
  });

  test('detects strategyId divergence', () => {
    const legacy = traceStub({ interviewClassification: mkIC('follow_up_generic', 'PUSHBACK', 'continue_thread') });
    const v3     = traceStub({ interviewClassification: mkIC('follow_up_generic', 'PUSHBACK', 'defend_position') });
    const diffs = compareDecisions(legacy, v3);
    const stratDiff = diffs.find((d) => d.field === 'interviewClassification.strategyId');
    assert.ok(stratDiff, 'strategyId divergence must be reported');
    assert.equal(stratDiff.legacy, 'continue_thread');
    assert.equal(stratDiff.v3, 'defend_position');
  });

  test('detects contextRequirements divergence', () => {
    const legacy = traceStub({ interviewClassification: mkIC('concept_explanation', 'QUESTION', 'define_concept', { generalKnowledge: true }) });
    const v3     = traceStub({ interviewClassification: mkIC('concept_explanation', 'QUESTION', 'define_concept', { resume: true, generalKnowledge: true }) });
    const diffs = compareDecisions(legacy, v3);
    const crDiff = diffs.find((d) => d.field === 'interviewClassification.contextRequirements');
    assert.ok(crDiff, 'contextRequirements divergence must be reported');
  });

  test('skips OD3 comparison when either trace lacks interviewClassification (additive guard)', () => {
    const withIC    = traceStub({ interviewClassification: mkIC('concept_explanation', 'QUESTION', 'define_concept') });
    const withoutIC = traceStub(); // no interviewClassification

    const diffs1 = compareDecisions(withIC, withoutIC);
    const diffs2 = compareDecisions(withoutIC, withIC);

    const hasCmp = (d) => d.some((x) => x.field.startsWith('interviewClassification'));
    assert.ok(!hasCmp(diffs1), 'no IC comparison when v3 lacks the field');
    assert.ok(!hasCmp(diffs2), 'no IC comparison when legacy lacks the field');
  });
});

// ── 3. Debug record interview section ────────────────────────────────────────

describe('debug record — interview section sourced from frozen TurnDecision', () => {
  test('interview section present and correct when decision has interviewIntent', () => {
    const records = [];
    const ii = interviewIntent();
    const as = answerStrategy();
    const d = decisionStub({ interviewIntent: ii, answerStrategy: as });

    const c = beginTurnCollector(identity(), { level: 'standard', includeContent: false, ...sinkTo(records) });
    c.recordDecisionTrace({ trace: traceStub(), decision: d });
    c.recordAnswer('A closure is...', true, null);
    c.complete();

    assert.equal(records.length, 1);
    const rec = records[0];
    assert.ok(rec.interview, 'interview section must be present when decision has interviewIntent');
    assert.equal(rec.interview.intent,              ii.intent);
    assert.equal(rec.interview.behavior,            ii.interviewerBehavior);
    assert.equal(rec.interview.strategyId,          as.id);
    assert.equal(rec.interview.storyBankActivated,  ii.contextRequirements.stories);
    assert.deepEqual(rec.interview.contextRequirements, ii.contextRequirements);
  });

  test('interview section absent when decision has no interviewIntent', () => {
    const records = [];
    const c = beginTurnCollector(identity(), { level: 'standard', includeContent: false, ...sinkTo(records) });
    c.recordDecisionTrace({ trace: traceStub(), decision: decisionStub() });
    c.recordAnswer('answer', true, null);
    c.complete();

    assert.equal(records.length, 1);
    assert.ok(!records[0].interview, 'interview section must be absent without interviewIntent');
  });

  test('interview section reflects frozen decision values, not recomputed values', () => {
    const records = [];
    const ii = interviewIntent({ intent: 'lld', interviewerBehavior: 'QUESTION' });
    const as = answerStrategy({ id: 'design_classes' });
    const d = decisionStub({ interviewIntent: ii, answerStrategy: as });

    const c = beginTurnCollector(identity(), { level: 'standard', includeContent: false, ...sinkTo(records) });
    c.recordDecisionTrace({ trace: traceStub(), decision: Object.freeze(d) });
    c.recordAnswer('answer', true, null);
    c.complete();

    const rec = records[0];
    assert.equal(rec.interview.intent,     'lld',           'intent must match frozen decision');
    assert.equal(rec.interview.strategyId, 'design_classes', 'strategyId must match frozen decision');
  });
});

// ── 4. promptSectionsRendered verbose gate ────────────────────────────────────

describe('promptSectionsRendered — verbose-gated in debug record', () => {
  test('absent from interview section at standard level even if present on trace', () => {
    const records = [];
    const ii = interviewIntent();
    const d  = decisionStub({ interviewIntent: ii, answerStrategy: answerStrategy() });
    const t  = traceStub({ promptSectionsRendered: ['SYSTEM', 'CONTEXT', 'ANSWER_STRATEGY'] });

    const c = beginTurnCollector(identity(), { level: 'standard', includeContent: false, ...sinkTo(records) });
    c.recordDecisionTrace({ trace: t, decision: d });
    c.recordAnswer('A closure is...', true, null);
    c.complete();

    const rec = records[0];
    assert.ok(rec.interview, 'interview section must be present');
    assert.ok(!rec.interview.promptSectionsRendered,
      'promptSectionsRendered must be absent at standard level (OD2 gate)');
  });

  test('present in interview section at verbose level when trace carries it', () => {
    const records = [];
    const sections = ['SYSTEM', 'CONTEXT', 'ANSWER_STRATEGY', 'GENERAL_KNOWLEDGE'];
    const ii = interviewIntent();
    const d  = decisionStub({ interviewIntent: ii, answerStrategy: answerStrategy() });
    const t  = traceStub({ promptSectionsRendered: sections });

    const c = beginTurnCollector(identity(), { level: 'verbose', includeContent: false, ...sinkTo(records) });
    c.recordDecisionTrace({ trace: t, decision: d });
    c.recordAnswer('A closure is...', true, null);
    c.complete();

    const rec = records[0];
    assert.ok(rec.interview, 'interview section must be present');
    assert.deepEqual(rec.interview.promptSectionsRendered, sections,
      'promptSectionsRendered must be present and match trace at verbose level');
  });

  test('absent from interview section at verbose level when trace does NOT carry it', () => {
    const records = [];
    const ii = interviewIntent();
    const d  = decisionStub({ interviewIntent: ii, answerStrategy: answerStrategy() });
    const t  = traceStub(); // no promptSectionsRendered

    const c = beginTurnCollector(identity(), { level: 'verbose', includeContent: false, ...sinkTo(records) });
    c.recordDecisionTrace({ trace: t, decision: d });
    c.recordAnswer('answer', true, null);
    c.complete();

    const rec = records[0];
    assert.ok(!rec.interview.promptSectionsRendered,
      'promptSectionsRendered must be absent when trace does not carry it, even at verbose level');
  });
});
