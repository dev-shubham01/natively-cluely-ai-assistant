// electron/context-intelligence/__tests__/StrategyReachability.test.mjs
//
// Phase 12: strategy reachability coverage.
//
// Asserts that every one of the 19 StrategyId values is producible by at
// least one question through classifyTurn → selectStrategy. All trigger
// questions were probed against the current dist-electron build before
// being recorded here — no expected value was invented.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');

const { classifyTurn } = await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);
const { selectStrategy } = await import(pathToFileURL(path.join(base, 'strategies/selector.js')).href);

const POLICY = MODE_POLICIES['technical-interview'];

function classify(question) {
  const result = classifyTurn({ resolvedQuestion: question, policy: POLICY, isFollowUp: false });
  const ii = result.interviewIntent;
  if (!ii) return { intent: null, strategyId: null, behavior: null };
  const strategy = selectStrategy(ii.intent, ii.interviewerBehavior);
  return { intent: ii.intent, strategyId: strategy?.id ?? null, behavior: ii.interviewerBehavior };
}

// Each entry: [strategyId, trigger question].
// Trigger questions were selected to be unambiguous — each probe produced
// exactly the listed strategy without alternative phrasings being needed.
const REACHABILITY_CASES = [
  ['define_concept',         'What is a closure?'],
  ['explain_mechanism',      'How does the JavaScript event loop work?'],
  ['justify_decision',       'Why did you go with Kubernetes?'],
  ['analyze_options',        'What are the tradeoffs between microservices and monolith?'],
  ['implement_solution',     'Implement a binary search tree.'],
  ['trace_bug',              'Debug this function.'],
  ['optimize_approach',      'How would you optimize this query?'],
  ['design_system',          'Design a URL shortener.'],
  ['design_classes',         'Design the classes for a parking lot.'],
  ['describe_project',       'Tell me about your most recent project.'],
  ['narrate_experience',     'Tell me about a difficult technical problem you solved.'],
  ['tell_behavioral_story',  'Tell me about a time you disagreed with a teammate.'],
  ['introduce_self',         'Tell me about yourself.'],
  ['analyze_scale',          'How would you scale this to handle millions of users?'],
  ['continue_thread',        'Why?'],
  ['defend_position',        'That seems overly complicated though, why not just use Redis?'],
  ['acknowledge_correction', "That's wrong — it's not O(n log n), it's O(n²)."],
  ['restate_clearly',        'Can you explain that more clearly?'],
  ['deepen_explanation',     'And?'],
];

describe('Strategy reachability — all 19 StrategyId values', () => {
  for (const [strategyId, question] of REACHABILITY_CASES) {
    test(`${strategyId} is reachable`, () => {
      const actual = classify(question);
      assert.equal(
        actual.strategyId,
        strategyId,
        `Expected strategyId="${strategyId}" for question "${question}" ` +
        `but got strategyId="${actual.strategyId}" (intent="${actual.intent}", behavior="${actual.behavior}")`,
      );
    });
  }

  test('all 19 strategy ids are covered', () => {
    assert.equal(REACHABILITY_CASES.length, 19, 'REACHABILITY_CASES must have exactly 19 entries');
    const ids = new Set(REACHABILITY_CASES.map(([id]) => id));
    assert.equal(ids.size, 19, 'Each strategy id must appear exactly once');
  });
});
