// electron/context-intelligence/__tests__/Phase16ClassificationCorrectness.test.mjs
//
// Phase 16 — Classification Correctness suite.
//
// Verifies three categories:
//   A. Source-invariance matrix: all 18 intents produce stable intent
//      regardless of whether attached documents / resume are present.
//   B. D1 (INTRODUCTION_RE) fix: "walk us/me through [adj] background"
//      and "tell me a little about yourself" → introduction.
//   C. D2 (DEBUGGING regex) fix: specific code-debugging questions →
//      debugging; general approach questions → concept_explanation.
//   D. D3 (EXPERIENCE_CHALLENGE_RE) fix: "the hardest/most difficult"
//      superlative form → experience_question.
//
// All expectations derived from V1 product requirements, not from
// pre-fix implementation behaviour.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const { classifyTurn } = await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);
const { selectStrategy } = await import(pathToFileURL(path.join(base, 'strategies/selector.js')).href);

const POLICY = MODE_POLICIES['technical-interview'];

function classify(question, { hasAttachedDocuments = false } = {}) {
  const result = classifyTurn({ resolvedQuestion: question, policy: POLICY, isFollowUp: false, hasAttachedDocuments });
  const ii = result.interviewIntent;
  return {
    intent:   ii?.intent,
    strategy: selectStrategy(ii?.intent, ii?.interviewerBehavior)?.id,
    cr:       ii?.contextRequirements ?? {},
  };
}

// Helper: assert same intent with and without attached documents
function assertSourceInvariant(t, question, expectedIntent) {
  const withoutDocs = classify(question, { hasAttachedDocuments: false });
  const withDocs    = classify(question, { hasAttachedDocuments: true });
  assert.equal(withoutDocs.intent, expectedIntent,
    `[no-docs] "${question}" → ${withoutDocs.intent} (expected ${expectedIntent})`);
  assert.equal(withDocs.intent, expectedIntent,
    `[with-docs] "${question}" → ${withDocs.intent} (expected ${expectedIntent})`);
  assert.equal(withoutDocs.intent, withDocs.intent,
    `[invariance] "${question}" changed intent when docs attached`);
}

// ── A. Source-invariance matrix — all 18 intents ────────────────────────────
describe('Phase 16 — A: Source-invariance for all 18 intents', () => {

  test('concept_explanation is source-invariant', () => {
    assertSourceInvariant(test, 'What is eventual consistency?', 'concept_explanation');
    assertSourceInvariant(test, 'Explain the CAP theorem.', 'concept_explanation');
    assertSourceInvariant(test, 'What is a closure in JavaScript?', 'concept_explanation');
  });

  test('mechanism_explanation is source-invariant', () => {
    assertSourceInvariant(test, 'How does the HTTP request-response cycle work?', 'mechanism_explanation');
    assertSourceInvariant(test, 'How does garbage collection work in V8?', 'mechanism_explanation');
    assertSourceInvariant(test, 'How does TCP congestion control work?', 'mechanism_explanation');
  });

  test('technology_decision is source-invariant', () => {
    assertSourceInvariant(test, 'Why did you choose PostgreSQL over MySQL?', 'technology_decision');
    assertSourceInvariant(test, 'Why did you go with MongoDB?', 'technology_decision');
    assertSourceInvariant(test, 'Why did you choose Node.js for the backend?', 'technology_decision');
  });

  test('comparison is source-invariant', () => {
    assertSourceInvariant(test, 'Compare REST and GraphQL.', 'comparison');
    assertSourceInvariant(test, "What's the difference between PostgreSQL and MongoDB?", 'comparison');
    assertSourceInvariant(test, 'REST versus gRPC — what are the differences?', 'comparison');
  });

  test('tradeoff is source-invariant', () => {
    assertSourceInvariant(test, 'What are the tradeoffs of using microservices?', 'tradeoff');
    assertSourceInvariant(test, 'What are the tradeoffs of using a message queue?', 'tradeoff');
    assertSourceInvariant(test, 'What are the pros and cons of eventual consistency?', 'tradeoff');
  });

  test('coding_task is source-invariant', () => {
    assertSourceInvariant(test, 'Write a function to reverse a linked list.', 'coding_task');
    assertSourceInvariant(test, 'Implement binary search.', 'coding_task');
    assertSourceInvariant(test, 'Write a function to find the kth largest element in an array.', 'coding_task');
  });

  test('debugging is source-invariant', () => {
    assertSourceInvariant(test, 'Debug this function.', 'debugging');
    assertSourceInvariant(test, 'How would you debug a memory leak?', 'debugging');
    assertSourceInvariant(test, 'Why is this code throwing a null pointer exception?', 'debugging');
    assertSourceInvariant(test, 'What is wrong with this code?', 'debugging');
    assertSourceInvariant(test, 'Find the bug in this code.', 'debugging');
    assertSourceInvariant(test, 'Why does this loop run infinitely?', 'debugging');
  });

  test('optimization is source-invariant', () => {
    assertSourceInvariant(test, 'How would you optimize a slow database query?', 'optimization');
    assertSourceInvariant(test, 'How do you reduce latency in a microservices architecture?', 'optimization');
    assertSourceInvariant(test, 'How would you speed up this API endpoint?', 'optimization');
  });

  test('system_design is source-invariant', () => {
    assertSourceInvariant(test, 'Design a URL shortener.', 'system_design');
    assertSourceInvariant(test, 'Design a notification system.', 'system_design');
    assertSourceInvariant(test, 'How would you design Twitter?', 'system_design');
  });

  test('lld is source-invariant', () => {
    assertSourceInvariant(test, 'Design the class structure for a parking lot system.', 'lld');
    assertSourceInvariant(test, 'Design the classes for a chess game.', 'lld');
    assertSourceInvariant(test, 'Design a library management system using OOP principles.', 'lld');
  });

  test('project_context is source-invariant', () => {
    assertSourceInvariant(test, 'Tell me about your most recent project.', 'project_context');
    assertSourceInvariant(test, 'Tell me about a project you worked on.', 'project_context');
    assertSourceInvariant(test, 'Tell me about a project you shipped.', 'project_context');
  });

  test('project_deep_dive is source-invariant', () => {
    assertSourceInvariant(test, 'How did you handle failures in the service you shipped?', 'project_deep_dive');
    assertSourceInvariant(test, 'How did you debug the issue in your project?', 'project_deep_dive');
    assertSourceInvariant(test, 'How did you implement the caching layer in your project?', 'project_deep_dive');
  });

  test('experience_question is source-invariant', () => {
    assertSourceInvariant(test, 'Tell me about a difficult technical problem you solved.', 'experience_question');
    assertSourceInvariant(test, 'Describe a time when you had to meet a tight deadline.', 'experience_question');
    assertSourceInvariant(test, 'Describe the hardest bug you ever debugged.', 'experience_question');
    assertSourceInvariant(test, 'Walk me through the most difficult decision you made.', 'experience_question');
  });

  test('behavioral is source-invariant', () => {
    assertSourceInvariant(test, 'Tell me about a time you disagreed with a manager.', 'behavioral');
    assertSourceInvariant(test, 'Give me an example of when you had to meet a tight deadline.', 'behavioral');
    assertSourceInvariant(test, 'Tell me about a time you failed.', 'behavioral');
  });

  test('introduction is source-invariant', () => {
    assertSourceInvariant(test, 'Tell me about yourself.', 'introduction');
    assertSourceInvariant(test, 'Introduce yourself.', 'introduction');
    assertSourceInvariant(test, 'Walk me through your background.', 'introduction');
    assertSourceInvariant(test, 'Walk me through your professional background.', 'introduction');
    assertSourceInvariant(test, 'Walk us through your background.', 'introduction');
    assertSourceInvariant(test, 'Tell me a little about yourself.', 'introduction');
  });

  test('scalability is source-invariant', () => {
    assertSourceInvariant(test, 'How would you scale this system to 10 million users?', 'scalability');
    assertSourceInvariant(test, 'How would you handle a 10x increase in traffic?', 'scalability');
    assertSourceInvariant(test, 'How would you handle load scaling?', 'scalability');
  });

  test('knowledge_check is source-invariant', () => {
    assertSourceInvariant(test, 'Are you familiar with Kafka?', 'knowledge_check');
    assertSourceInvariant(test, 'Do you know about graph databases?', 'knowledge_check');
    assertSourceInvariant(test, 'Have you heard of Apache Flink?', 'knowledge_check');
  });

  test('follow_up_generic is source-invariant', () => {
    assertSourceInvariant(test, 'Can you elaborate on that?', 'follow_up_generic');
    assertSourceInvariant(test, 'Go on.', 'follow_up_generic');
    assertSourceInvariant(test, 'Can you give an example?', 'follow_up_generic');
  });
});

// ── B. D1: INTRODUCTION_RE fix ───────────────────────────────────────────────
describe('Phase 16 — B: D1 INTRODUCTION_RE fix', () => {

  test('adjective before "background" routes to introduction', () => {
    const cases = [
      'Walk me through your professional background.',
      'Walk me through your career background.',
      'Walk me through your technical background.',
      'Can you walk me through your professional background?',
    ];
    for (const q of cases) {
      assert.equal(classify(q).intent, 'introduction', `"${q}" → expected introduction`);
    }
  });

  test('"us" variant routes to introduction', () => {
    assert.equal(classify('Walk us through your background.').intent, 'introduction');
    assert.equal(classify('Walk us through your professional background.').intent, 'introduction');
  });

  test('modifier before "about yourself" routes to introduction', () => {
    assert.equal(classify('Tell me a little about yourself.').intent, 'introduction');
    assert.equal(classify('Tell me briefly about yourself.').intent, 'introduction');
  });

  test('existing INTRODUCTION_RE phrasings still work', () => {
    assert.equal(classify('Tell me about yourself.').intent, 'introduction');
    assert.equal(classify('Introduce yourself.').intent, 'introduction');
    assert.equal(classify('Walk me through your background.').intent, 'introduction');
  });

  test('INTRODUCTION_RE does not fire on technical "background" questions', () => {
    // "background of a request" — technical context, not a candidate intro
    const r = classify('How would you describe the background of a request in HTTP?');
    assert.notEqual(r.intent, 'introduction', '"background of a request" must not fire intro');
  });
});

// ── C. D2: DEBUGGING regex fix ────────────────────────────────────────────────
describe('Phase 16 — C: D2 DEBUGGING regex fix', () => {

  test('"why is this [code-type] [verb]" routes to debugging', () => {
    const cases = [
      'Why is this code throwing a null pointer exception?',
      'Why is this function returning undefined?',
      'Why is my code failing?',
      'Why is this test failing?',
    ];
    for (const q of cases) {
      assert.equal(classify(q).intent, 'debugging', `"${q}" → expected debugging`);
    }
  });

  test('"why does this [code-type]" routes to debugging', () => {
    const cases = [
      'Why does this loop run infinitely?',
      'Why does this function not terminate?',
      'Why does this query return empty results?',
    ];
    for (const q of cases) {
      assert.equal(classify(q).intent, 'debugging', `"${q}" → expected debugging`);
    }
  });

  test('"what is wrong with this" routes to debugging', () => {
    assert.equal(classify('What is wrong with this code?').intent, 'debugging');
    assert.equal(classify("What's wrong with this code?").intent, 'debugging');
  });

  test('"find the bug" routes to debugging', () => {
    assert.equal(classify('Find the bug in this code.').intent, 'debugging');
    assert.equal(classify('Find the bugs in this implementation.').intent, 'debugging');
  });

  test('existing debugging patterns still work', () => {
    assert.equal(classify('Debug this function.').intent, 'debugging');
    assert.equal(classify('How would you debug a memory leak?').intent, 'debugging');
    assert.equal(classify('How do you debug a memory leak?').intent, 'debugging');
  });

  test('general debugging approach is concept_explanation, not debugging', () => {
    // "debugging" as a gerund — does NOT match \bdebug\b due to word boundary
    const r = classify('How do you approach debugging a distributed system?');
    assert.equal(r.intent, 'concept_explanation',
      '"How do you approach debugging" is a methodology question, not a specific debug session');
  });

  test('debugging questions are source-invariant', () => {
    const q = 'Why is this code throwing a null pointer exception?';
    const r1 = classify(q, { hasAttachedDocuments: false });
    const r2 = classify(q, { hasAttachedDocuments: true });
    assert.equal(r1.intent, 'debugging');
    assert.equal(r2.intent, 'debugging');
  });
});

// ── D. D3: EXPERIENCE_CHALLENGE_RE "the" + superlative fix ──────────────────
describe('Phase 16 — D: D3 EXPERIENCE_CHALLENGE_RE superlative fix', () => {

  test('"the hardest/toughest [X]" routes to experience_question', () => {
    const cases = [
      'Describe the hardest bug you ever debugged.',
      'Tell me about the toughest technical problem you faced.',
      'Walk me through the hardest project you shipped.',
    ];
    for (const q of cases) {
      assert.equal(classify(q).intent, 'experience_question', `"${q}" → expected experience_question`);
    }
  });

  test('"the most [adj]" routes to experience_question', () => {
    assert.equal(classify('Walk me through the most difficult decision you made.').intent, 'experience_question');
    assert.equal(classify('Describe the most challenging situation you handled.').intent, 'experience_question');
    assert.equal(classify('Tell me about the most complex problem you solved.').intent, 'experience_question');
  });

  test('"a [adj]" form still works (existing coverage)', () => {
    assert.equal(classify('Tell me about a challenging bug you had to fix.').intent, 'experience_question');
    assert.equal(classify('Tell me about a difficult technical problem you solved.').intent, 'experience_question');
  });

  test('experience_question has stories=true and is source-invariant', () => {
    const q = 'Describe the hardest bug you ever debugged.';
    const r1 = classify(q, { hasAttachedDocuments: false });
    const r2 = classify(q, { hasAttachedDocuments: true });
    assert.equal(r1.intent, 'experience_question');
    assert.equal(r2.intent, 'experience_question');
    assert.equal(r1.cr.stories, true, 'experience_question must activate story bank');
    assert.equal(r2.cr.stories, true);
  });
});
