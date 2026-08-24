// electron/context-intelligence/__tests__/GoldenDataset.test.mjs
//
// Phase 11 golden dataset evaluation test.
//
// Runs all 46 golden cases against the current dist-electron build
// and asserts the acceptance criteria:
//   - Overall pass rate ≥ 90% (≥ 42 of 46)
//   - High-risk pass rate = 100%
//   - CR false-positive count = 0 on high-risk cases
//
// This file runs on every PR (OD1). It does NOT call the retrieval layer
// or any LLM — decision layer only.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');

const { classifyTurn } = await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);
const { selectStrategy } = await import(pathToFileURL(path.join(base, 'strategies/selector.js')).href);
const { GOLDEN_CASES } = await import(pathToFileURL(path.join(base, 'evaluation/golden-cases.js')).href);
const { evaluateCase, buildGradeReport, printGradeReport } =
  await import(pathToFileURL(path.join(base, 'evaluation/golden-evaluator.js')).href);

const POLICY = MODE_POLICIES['technical-interview'];

/**
 * Run one golden case against the live decision layer.
 * Returns ActualClassification (same shape as golden-case-schema.ts defines).
 */
function runCase(gc) {
  const result = classifyTurn({ resolvedQuestion: gc.question, policy: POLICY, isFollowUp: false });
  const ii = result.interviewIntent;
  if (!ii) {
    return { intent: '', strategy: '', behavior: '', contextRequirements: {}, storyBankActivated: false };
  }
  const strategy = selectStrategy(ii.intent, ii.interviewerBehavior);
  return {
    intent:              ii.intent,
    strategy:            strategy?.id ?? '',
    behavior:            ii.interviewerBehavior,
    contextRequirements: ii.contextRequirements,
    storyBankActivated:  ii.contextRequirements.stories,
  };
}

// ── run all cases and build the report ──────────────────────────────────────

const results = GOLDEN_CASES.map((gc) => evaluateCase(gc, runCase(gc)));
const report  = buildGradeReport(results);

// OD5: console table grade report (always emitted, even on pass)
printGradeReport(report);

// ── per-case individual tests ────────────────────────────────────────────────

describe('Golden Dataset — per-case', () => {
  for (const r of results) {
    test(`${r.id}: ${r.question.slice(0, 50)}`, () => {
      assert.equal(
        r.grade,
        'PASS',
        `[${r.id}] FAIL — failures: [${r.failures.join(', ')}]\n` +
        `  expected intent=${GOLDEN_CASES.find(c => c.id === r.id).expected.intent} ` +
        `strategy=${GOLDEN_CASES.find(c => c.id === r.id).expected.strategy} ` +
        `behavior=${GOLDEN_CASES.find(c => c.id === r.id).expected.behavior}\n` +
        `  actual   intent=${r.actual.intent} strategy=${r.actual.strategy} behavior=${r.actual.behavior}`,
      );
    });
  }
});

// ── acceptance criteria ──────────────────────────────────────────────────────

describe('Golden Dataset — acceptance criteria', () => {
  test('overall pass rate ≥ 90%', () => {
    assert.ok(
      report.passRate >= 0.9,
      `Pass rate ${(report.passRate * 100).toFixed(1)}% < 90% — ` +
      `${report.failed} failures: ${results.filter(r => r.grade === 'FAIL').map(r => r.id).join(', ')}`,
    );
  });

  test('high-risk pass rate = 100%', () => {
    assert.equal(
      report.highRiskPassRate,
      1,
      `High-risk pass rate ${(report.highRiskPassRate * 100).toFixed(1)}% < 100% — ` +
      `${report.highRiskCases - report.highRiskPassed} high-risk failures: ` +
      results.filter(r => r.risk === 'high' && r.grade === 'FAIL').map(r => r.id).join(', '),
    );
  });

  test('CR false-positive count = 0 on high-risk cases', () => {
    assert.equal(
      report.crFalsePositiveCount,
      0,
      `${report.crFalsePositiveCount} CR false positive(s) on high-risk cases`,
    );
  });
});
