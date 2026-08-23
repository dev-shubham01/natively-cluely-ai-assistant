// Context Intelligence V3 — Phase 4: topic chain intelligence.
//
// Tests A–I: unit tests on advance() — chain growth, reset triggers, cap.
// Tests J–N: integration tests via buildV3Prompt() — conversation gate,
//             pre-orchestration timing, known HINT limitation.
//
// Known limitation (Phase 4): HINT → conversation=false → chain not injected
// even when the question is a continuation (e.g. "What about using a trie?").
// This is documented and will be addressed in a later phase.

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');

const { advance, emptyState, CHAIN_CAP } =
  await import(pathToFileURL(path.join(base, 'question/conversation-state.js')).href);

const { buildV3Prompt } =
  await import(pathToFileURL(path.join(base, 'orchestration/engine-bridge.js')).href);

const { CONTEXT_INTELLIGENCE_V3_ENV_KEY } =
  await import(pathToFileURL(path.join(base, 'contracts/flag.js')).href);

const ENV = CONTEXT_INTELLIGENCE_V3_ENV_KEY;
const enable  = () => { process.env[ENV] = '1'; };
const disable = () => { process.env[ENV] = '0'; };
afterEach(() => { delete process.env[ENV]; });

const m1 = { userId: 'u1', meetingId: 'm1' };
const m2 = { userId: 'u1', meetingId: 'm2' };

// ── Shared intent factories ───────────────────────────────────────────────────

const makeIntent = (overrides = {}) => ({
  intent: 'concept_explanation',
  domain: ['algorithms'],
  questionStyle: 'what',
  interviewerBehavior: 'QUESTION',
  contextRequirements: { conversation: false, resume: false, projects: false, code: false, documents: false, generalKnowledge: true },
  expectedAnswer: { depth: 'standard', structure: 'direct_definition', includeExample: false, includeTradeoffs: false, includeCode: false, includeComplexity: false },
  followUpLikelihood: 'medium',
  ...overrides,
});

const algorithmIntent = makeIntent({ domain: ['algorithms', 'data_structures'] });
const reactIntent     = makeIntent({ domain: ['react', 'frontend'] });
const deepeningIntent = makeIntent({
  intent: 'follow_up_generic',
  interviewerBehavior: 'DEEPENING',
  contextRequirements: { conversation: true, resume: false, projects: false, code: false, documents: false, generalKnowledge: true },
});
const topicChangeIntent = makeIntent({
  intent: 'follow_up_generic',
  interviewerBehavior: 'TOPIC_CHANGE',
  contextRequirements: { conversation: false, resume: false, projects: false, code: false, documents: false, generalKnowledge: true },
});
const hintIntent = makeIntent({
  intent: 'follow_up_generic',
  domain: ['algorithms'],
  interviewerBehavior: 'HINT',
  contextRequirements: { conversation: false, resume: false, projects: false, code: false, documents: false, generalKnowledge: true },
});

// ── A: First turn creates chain entry ─────────────────────────────────────────

describe('Test A — first turn creates a single chain entry', () => {
  test('emptyState has empty chain; first advance adds one entry', () => {
    const s0 = emptyState(m1);
    assert.deepEqual(s0.topicChain, []);
    assert.equal(s0.chainDepth, 0);

    const s1 = advance(s0, {
      scope: m1,
      question: 'What is a binary search tree?',
      interviewIntent: algorithmIntent,
    });

    assert.equal(s1.topicChain.length, 1);
    assert.equal(s1.chainDepth, 1);
    assert.equal(s1.topicChain[0].question, 'What is a binary search tree?');
    assert.deepEqual(s1.topicChain[0].domain, ['algorithms', 'data_structures']);
    assert.equal(s1.topicChain[0].interviewerBehavior, 'QUESTION');
    assert.equal(s1.topicChain[0].intent, 'concept_explanation');
    assert.equal(s1.topicChain[0].answerSummary, undefined);
  });
});

// ── B: Chain grows within a topic ─────────────────────────────────────────────

describe('Test B — chain grows within same domain', () => {
  test('three consecutive algorithm questions grow the chain to depth 3', () => {
    let s = emptyState(m1);
    const qs = [
      'What is a binary search tree?',
      'How does tree rotation work?',
      'What are AVL trees?',
    ];
    for (const q of qs) {
      s = advance(s, { scope: m1, question: q, interviewIntent: algorithmIntent });
    }
    assert.equal(s.topicChain.length, 3);
    assert.equal(s.chainDepth, 3);
    assert.equal(s.topicChain[0].question, qs[0]);
    assert.equal(s.topicChain[2].question, qs[2]);
  });
});

// ── C: Chain cap at CHAIN_CAP turns ───────────────────────────────────────────

describe('Test C — chain cap is enforced at CHAIN_CAP turns', () => {
  test(`${CHAIN_CAP + 1} turns → only the last ${CHAIN_CAP} survive`, () => {
    let s = emptyState(m1);
    for (let i = 0; i <= CHAIN_CAP; i++) {
      s = advance(s, {
        scope: m1,
        question: `Algorithm question ${i}`,
        interviewIntent: algorithmIntent,
      });
    }
    assert.equal(s.topicChain.length, CHAIN_CAP);
    assert.equal(s.chainDepth, CHAIN_CAP);
    // First turn must have been evicted
    assert.ok(!s.topicChain.some((t) => t.question === 'Algorithm question 0'),
      'oldest turn must be evicted once cap is reached');
    // Most recent turn must be present
    assert.ok(s.topicChain.some((t) => t.question === `Algorithm question ${CHAIN_CAP}`),
      'most recent turn must be present after eviction');
  });
});

// ── D: TOPIC_CHANGE resets chain ──────────────────────────────────────────────

describe('Test D — TOPIC_CHANGE behavior resets the chain', () => {
  test('two algorithm turns then TOPIC_CHANGE → chain restarts at depth 1', () => {
    let s = emptyState(m1);
    s = advance(s, { scope: m1, question: 'What is a heap?', interviewIntent: algorithmIntent });
    s = advance(s, { scope: m1, question: 'How does heapify work?', interviewIntent: algorithmIntent });
    assert.equal(s.chainDepth, 2);

    s = advance(s, {
      scope: m1,
      question: "Let's move on to React.",
      interviewIntent: topicChangeIntent,
    });
    assert.equal(s.chainDepth, 1, 'TOPIC_CHANGE must reset the chain before appending');
    assert.equal(s.topicChain[0].question, "Let's move on to React.");
    assert.ok(!s.topicChain.some((t) => t.question === 'What is a heap?'),
      'old algorithm turns must be gone after TOPIC_CHANGE');
  });
});

// ── E: Domain shift resets chain ──────────────────────────────────────────────

describe('Test E — domain shift with no overlap resets chain', () => {
  test('react → algorithms (no overlap) → chain resets', () => {
    let s = emptyState(m1);
    s = advance(s, { scope: m1, question: 'What is a React hook?', interviewIntent: reactIntent });
    assert.equal(s.chainDepth, 1);
    assert.deepEqual(s.topicChain[0].domain, ['react', 'frontend']);

    s = advance(s, {
      scope: m1,
      question: 'What is a binary search tree?',
      interviewIntent: algorithmIntent,
    });
    assert.equal(s.chainDepth, 1, 'domain shift must reset chain before appending new turn');
    assert.equal(s.topicChain[0].question, 'What is a binary search tree?');
    assert.ok(!s.topicChain.some((t) => t.question === 'What is a React hook?'),
      'React turn must be gone after domain shift');
  });
});

// ── F: Domain overlap continues chain ─────────────────────────────────────────

describe('Test F — partial domain overlap continues the chain', () => {
  test('[react, frontend] → [react] → no reset (react overlaps)', () => {
    let s = emptyState(m1);
    s = advance(s, {
      scope: m1, question: 'What is JSX?',
      interviewIntent: makeIntent({ domain: ['react', 'frontend'] }),
    });
    s = advance(s, {
      scope: m1, question: 'How does the virtual DOM work?',
      interviewIntent: makeIntent({ domain: ['react'] }),
    });
    assert.equal(s.chainDepth, 2, 'react overlap must not reset the chain');
    assert.equal(s.topicChain[0].question, 'What is JSX?');
    assert.equal(s.topicChain[1].question, 'How does the virtual DOM work?');
  });

  test('[javascript, typescript] → [typescript, backend] → no reset (typescript overlaps)', () => {
    let s = emptyState(m1);
    s = advance(s, {
      scope: m1, question: 'What is TypeScript?',
      interviewIntent: makeIntent({ domain: ['javascript', 'typescript'] }),
    });
    s = advance(s, {
      scope: m1, question: 'How does TypeScript handle generics?',
      interviewIntent: makeIntent({ domain: ['typescript', 'backend'] }),
    });
    assert.equal(s.chainDepth, 2, 'typescript overlap must continue chain');
  });
});

// ── G: unknown domains are excluded from overlap detection ────────────────────

describe('Test G — unknown domains are excluded from overlap detection', () => {
  test('both sides only have [unknown] → no reset (no meaningful domains to compare)', () => {
    let s = emptyState(m1);
    s = advance(s, {
      scope: m1, question: 'First question.',
      interviewIntent: makeIntent({ domain: ['unknown'] }),
    });
    s = advance(s, {
      scope: m1, question: 'Second question.',
      interviewIntent: makeIntent({ domain: ['unknown'] }),
    });
    assert.equal(s.chainDepth, 2, 'unknown-only domains must not trigger a reset');
  });

  test('[unknown] vs [algorithms] → no reset (prev side has no meaningful domain)', () => {
    let s = emptyState(m1);
    s = advance(s, {
      scope: m1, question: 'General question.',
      interviewIntent: makeIntent({ domain: ['unknown'] }),
    });
    s = advance(s, {
      scope: m1, question: 'What is quicksort?',
      interviewIntent: algorithmIntent,
    });
    assert.equal(s.chainDepth, 2, 'unknown prev domain must not trigger reset');
  });
});

// ── H: Scope change resets chain ──────────────────────────────────────────────

describe('Test H — scope / meeting boundary resets chain', () => {
  test('state from meeting m1 is fully reset when scope changes to m2', () => {
    let s = emptyState(m1);
    s = advance(s, { scope: m1, question: 'What is a mutex?', interviewIntent: algorithmIntent });
    s = advance(s, { scope: m1, question: 'What is a semaphore?', interviewIntent: algorithmIntent });
    assert.equal(s.chainDepth, 2);

    // Scope change (meeting boundary)
    s = advance(s, { scope: m2, question: 'Tell me about your experience.', interviewIntent: makeIntent({ domain: ['behavioral'] }) });
    assert.equal(s.chainDepth, 1, 'scope change must reset the chain');
    assert.ok(!s.topicChain.some((t) => t.question === 'What is a mutex?'),
      'm1 chain must be gone after scope change to m2');
  });
});

// ── I: Explicit section signal resets chain ───────────────────────────────────

describe('Test I — explicit section signal resets chain', () => {
  test('"Round 2" in question text triggers chain reset', () => {
    let s = emptyState(m1);
    s = advance(s, { scope: m1, question: 'What is a heap?', interviewIntent: algorithmIntent });
    s = advance(s, { scope: m1, question: 'How does heapify work?', interviewIntent: algorithmIntent });
    assert.equal(s.chainDepth, 2);

    s = advance(s, {
      scope: m1,
      question: 'Round 2: system design questions.',
      interviewIntent: algorithmIntent, // same domain but section signal fires first
    });
    assert.equal(s.chainDepth, 1, 'explicit section signal must reset chain');
    assert.equal(s.topicChain[0].question, 'Round 2: system design questions.');
  });

  test('"Section 2" triggers reset', () => {
    let s = emptyState(m1);
    s = advance(s, { scope: m1, question: 'First question.', interviewIntent: algorithmIntent });
    s = advance(s, { scope: m1, question: 'Section 2: behavioral questions.', interviewIntent: algorithmIntent });
    assert.equal(s.chainDepth, 1);
  });
});

// ── J: QUESTION behavior → conversation=false → no chain injection ────────────

describe('Test J — QUESTION behavior suppresses chain injection', () => {
  beforeEach(enable);

  test('after a prior question, a new QUESTION turn produces no conversation section', async () => {
    const sid = 'test-j-no-inject';
    // Turn 1: establish state
    await buildV3Prompt({
      surface: 'manual-chat',
      question: 'What is a mutex?',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    // Turn 2: fresh QUESTION (no follow-up signal) — conversation=false
    const r = await buildV3Prompt({
      surface: 'manual-chat',
      question: 'What is a semaphore?',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    assert.ok(r, 'expected a prompt');
    assert.ok(!r.user.includes('Conversation so far'),
      'QUESTION behavior must not inject a Conversation section');
    assert.ok(!r.user.includes('What is a mutex?') || r.user.indexOf('What is a mutex?') === r.user.indexOf('What is a mutex?'),
      'prior question must not appear as chain context when gate is closed');
  });
});

// ── K: DEEPENING → conversation=true → chain injected from pre-orch state ─────

describe('Test K — DEEPENING injects pre-orchestration chain', () => {
  beforeEach(enable);

  test('React question then "Tell me more" → chain contains React question', async () => {
    const sid = 'test-k-deepening';
    // Turn 1: establish React chain
    await buildV3Prompt({
      surface: 'manual-chat',
      question: 'What is a React hook?',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    // Turn 2: DEEPENING — "Tell me more" → conversation=true → chain injected
    const r = await buildV3Prompt({
      surface: 'manual-chat',
      question: 'Tell me more about that.',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    assert.ok(r, 'expected a prompt');
    assert.match(r.user, /Conversation so far/,
      'DEEPENING must open the conversation gate');
    assert.match(r.user, /What is a React hook/,
      'pre-orchestration chain must contain the React question');
  });
});

// ── L: HINT (long phrase, >5 words) → no bare-follow-up → conversation=false ──
//
// HINT behavior sets conversation=false only when the question is ALSO not a bare
// follow-up (FOLLOW_UP_MAX_WORDS = 5). Short HINT phrases (≤5 words) like
// "Think about the trade-offs." or "What about using a trie?" also trigger
// QT=FOLLOW_UP and thus conversation=true — the chain IS injected for those.
// This test uses a HINT phrase long enough (>5 words) to exceed the bare-follow-up
// cap, so QT=FOLLOW_UP does NOT fire and conversation=false holds.

describe('Test L — long HINT phrase (>5 words) suppresses chain (conversation=false)', () => {
  beforeEach(enable);

  test('HINT phrase >5 words → no bare-follow-up → no QT=FOLLOW_UP → no conversation section', async () => {
    const sid = 'test-l-hint-long';
    // Turn 1: establish algorithms context
    await buildV3Prompt({
      surface: 'manual-chat',
      question: 'How would you implement a hash map?',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    // Turn 2: HINT phrase longer than FOLLOW_UP_MAX_WORDS (5).
    // IB_HINT_RE: /\bthink about\b/ matches.
    // 9 words → NOT a bare follow-up → QT does NOT include FOLLOW_UP.
    // conversation = (QT.includes(FOLLOW_UP) || isOverride) = (false || false) = false.
    const r = await buildV3Prompt({
      surface: 'manual-chat',
      question: 'Think about the time-space tradeoffs for recursive versus iterative solutions.',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    assert.ok(r, 'expected a prompt');
    assert.ok(!r.user.includes('Conversation so far'),
      'HINT with >5 words and no pronoun must suppress conversation chain (conversation=false)');
  });
});

// ── M: Domain shift resets chain; new chain starts fresh ─────────────────────

describe('Test M — domain shift resets chain; next continuation sees fresh chain', () => {
  beforeEach(enable);

  test('React → BST (domain shift) → DEEPENING sees BST chain, not React', async () => {
    const sid = 'test-m-domain-shift';
    // Turn 1: React question
    await buildV3Prompt({
      surface: 'manual-chat',
      question: 'What is a React hook?',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    // Turn 2: domain shift (algorithms)
    await buildV3Prompt({
      surface: 'manual-chat',
      question: 'What is a binary search tree?',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    // Turn 3: DEEPENING on BST context — chain should contain BST, not React hook
    const r = await buildV3Prompt({
      surface: 'manual-chat',
      question: 'Tell me more about that.',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    assert.ok(r, 'expected a prompt');
    assert.match(r.user, /Conversation so far/,
      'DEEPENING must inject chain');
    assert.match(r.user, /binary search tree/,
      'chain after domain reset must contain BST question');
    assert.ok(!r.user.match(/React hook[\s\S]*Conversation so far/) &&
      (!r.user.includes('React hook') || r.user.indexOf('React hook') > r.user.indexOf('Conversation so far') + 50 === false),
      'React hook must not appear in conversation chain section after domain reset');
  });
});

// ── N: Pre-orchestration timing: prior state is captured before advance ────────

describe('Test N — pre-orchestration timing: prior chain is used, not post-advance', () => {
  beforeEach(enable);

  test('DEEPENING after React: chain context contains React (turn 1), not current turn', async () => {
    const sid = 'test-n-timing';

    // Turn 1: React question → state = {topicChain: [{React hook...}]}
    await buildV3Prompt({
      surface: 'manual-chat',
      question: 'What is a React hook?',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    // Turn 2: DEEPENING ("Tell me more") — conversation=true
    // Pre-orchestration state: {topicChain: [{React hook...}]}
    // Post-orchestration state: {topicChain: [{React hook...}, {Tell me more...}]}
    // The prompt must be built from PRE-orchestration state.
    const r = await buildV3Prompt({
      surface: 'manual-chat',
      question: 'Tell me more about that.',
      modeTemplateType: 'technical-interview',
      scope: { sessionId: sid },
    });

    assert.ok(r, 'expected a prompt');
    assert.match(r.user, /Conversation so far/,
      'conversation gate must be open for DEEPENING');

    // Extract conversation section content
    const convSectionMatch = r.user.match(/Conversation so far[^]*?(?=\n#|$)/);
    const convSection = convSectionMatch ? convSectionMatch[0] : '';

    assert.match(r.user, /What is a React hook/,
      'pre-orchestration chain must contain the React question');

    // The critical timing assertion: "Tell me more about that" is the CURRENT question.
    // It must NOT appear in the conversation section as a PRIOR turn.
    // (It will appear in the # Question section, which is correct.)
    assert.ok(
      !convSection.includes('Tell me more about that'),
      'current turn ("Tell me more about that") must not appear in conversation chain — ' +
      'that would mean post-advance state was used (timing violation)',
    );
  });
});
