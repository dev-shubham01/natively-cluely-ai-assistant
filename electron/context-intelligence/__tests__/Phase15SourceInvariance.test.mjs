// Phase 15: SOURCE AVAILABILITY MUST NOT CHANGE SEMANTIC INTENT.
//
// V1 requirement (Phase 15 §9): the same question must produce the same
// semantic intent regardless of which personal sources are in the mode.
// Only retrieval availability, evidence count, and evidence quality may
// differ; intent and contextRequirements.projects/stories/resume may NOT
// flip based solely on source presence.
//
// Tests run via the dist-electron build so they exercise the real runtime.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const { classifyTurn } = await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);

// Build a minimal ClassificationInput for a given mode and question.
function mkInput(question, modeId = 'technical-interview', opts = {}) {
  const policy = MODE_POLICIES[modeId];
  return {
    resolvedQuestion: question,
    policy,
    isFollowUp: false,
    hasAttachedDocuments: opts.hasAttachedDocuments ?? false,
    ...opts,
  };
}

// Classify and return the stable semantic fields.
function classify(question, modeId, opts) {
  const r = classifyTurn(mkInput(question, modeId, opts));
  return {
    intent: r.interviewIntent?.intent,
    projects: r.interviewIntent?.contextRequirements?.projects,
    resume: r.interviewIntent?.contextRequirements?.resume,
    stories: r.interviewIntent?.contextRequirements?.stories,
    questionTypes: r.questionTypes,
  };
}

// ── Generic technical questions: intent stable across source states ───────────

describe('Phase 15 §9 — generic technical questions: intent invariant across source states', () => {
  // These questions have no personal semantic cue. Their intent must be the same
  // whether the mode has a résumé or not.
  const GENERIC_QUESTIONS = [
    'How does garbage collection work in V8?',
    'What is eventual consistency?',
    'How would you handle a 10x increase in traffic?',
    'How does Redis work?',
    'What is binary search?',
    'How does a hash map work?',
  ];

  for (const q of GENERIC_QUESTIONS) {
    test(`"${q.slice(0, 55)}" — intent same with and without attached documents`, () => {
      const without = classify(q, 'technical-interview', { hasAttachedDocuments: false });
      const with_ = classify(q, 'technical-interview', { hasAttachedDocuments: true });
      assert.equal(without.intent, with_.intent,
        `intent changed with hasAttachedDocuments: ${without.intent} → ${with_.intent}`);
    });

    test(`"${q.slice(0, 55)}" — must NOT be project_context`, () => {
      const r = classify(q);
      assert.notEqual(r.intent, 'project_context',
        `"${q}" became project_context — source-availability-driven routing (D-01)`);
      assert.notEqual(r.intent, 'project_deep_dive',
        `"${q}" became project_deep_dive — no personal cue present`);
    });

    test(`"${q.slice(0, 55)}" — projects=false and stories=false`, () => {
      const r = classify(q);
      assert.equal(r.projects, false,
        `projects=true for generic question "${q}" — D-01 defect`);
      assert.equal(r.stories, false,
        `stories=true for generic question "${q}" — D-01 defect`);
    });
  }
});

// ── Personal project questions: intent stable regardless of source availability ─

describe('Phase 15 §9 — personal project questions: intent invariant across source states', () => {
  // These questions have explicit personal semantic cues. Their intent must stay
  // project_context regardless of whether actual evidence is attached.
  const PERSONAL_QUESTIONS = [
    'Tell me about your most recent project.',
    'Tell me about a project you built.',
    'How did you implement caching in your project?',
  ];

  for (const q of PERSONAL_QUESTIONS) {
    test(`"${q.slice(0, 55)}" — intent is project_context or project_deep_dive`, () => {
      const r = classify(q);
      const personalIntents = ['project_context', 'project_deep_dive', 'technology_decision'];
      assert.ok(personalIntents.includes(r.intent),
        `"${q}" → intent=${r.intent}; expected a personal project intent`);
    });

    test(`"${q.slice(0, 55)}" — projects=true regardless of attached documents`, () => {
      const without = classify(q, 'technical-interview', { hasAttachedDocuments: false });
      const with_ = classify(q, 'technical-interview', { hasAttachedDocuments: true });
      assert.equal(without.projects, true,
        `projects=false without docs for personal question "${q}"`);
      assert.equal(with_.projects, true,
        `projects=false with docs for personal question "${q}"`);
      assert.equal(without.intent, with_.intent,
        `intent changed based on hasAttachedDocuments for personal question "${q}"`);
    });
  }
});

// ── D-03: intent layer must be authoritative for codingTask ──────────────────
//
// CODING_TASK may appear in questionTypes for DSA concept questions. The
// authoritative signal is interviewIntent.intent, which Phase 13 already
// corrected. These tests verify the classifier side of D-03.

describe('Phase 15 §9 — D-03: coding_task appears only when intent IS coding_task', () => {
  const CONCEPT_QUESTIONS = [
    'What is a binary search tree?',
    'How does binary search work?',
    'Explain dynamic programming.',
  ];

  for (const q of CONCEPT_QUESTIONS) {
    test(`"${q.slice(0, 55)}" — intent is NOT coding_task`, () => {
      const r = classify(q);
      assert.notEqual(r.intent, 'coding_task',
        `DSA concept question "${q}" must NOT produce coding_task intent`);
    });
  }

  test('"Implement binary search." → intent IS coding_task', () => {
    const r = classify('Implement binary search.');
    assert.equal(r.intent, 'coding_task', 'actual coding ask must produce coding_task intent');
  });
});
