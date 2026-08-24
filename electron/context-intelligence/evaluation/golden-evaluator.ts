// electron/context-intelligence/evaluation/golden-evaluator.ts
//
// Phase 14 deterministic golden evaluator.
//
// Evaluates the DECISION layer only: classifyTurn → selectStrategy →
// contextRequirements. Does NOT call the retrieval layer or any LLM.
// Takes actual classification results produced by the caller and grades them
// against the locked golden expectations.

import type {
  GoldenCase,
  GoldenContextRequirements,
  ActualClassification,
  CaseEvaluationResult,
  FailureCategory,
  GradeReport,
} from './golden-case-schema';

// ── per-case evaluation ──────────────────────────────────────────────────────

function compareContextRequirements(
  expected: GoldenContextRequirements,
  actual: Record<string, boolean>,
): FailureCategory[] {
  const failures: FailureCategory[] = [];
  for (const [key, expectedVal] of Object.entries(expected)) {
    if (expectedVal === undefined) continue;
    const actualVal = actual[key] ?? false;
    if (expectedVal === true && !actualVal)  failures.push('cr_false_negative');
    if (expectedVal === false && actualVal)  failures.push('cr_false_positive');
  }
  return failures;
}

export function evaluateCase(gc: GoldenCase, actual: ActualClassification): CaseEvaluationResult {
  const failures: FailureCategory[] = [];

  if (!actual.intent) {
    failures.push('no_interview_intent');
    return { id: gc.id, question: gc.question, risk: gc.risk, grade: 'FAIL', failures, actual };
  }

  if (actual.intent   !== gc.expected.intent)   failures.push('intent_mismatch');
  if (actual.strategy !== gc.expected.strategy) failures.push('strategy_mismatch');
  if (actual.behavior !== gc.expected.behavior) failures.push('behavior_mismatch');
  if (actual.storyBankActivated !== gc.expected.storyBankActivated) failures.push('story_bank_mismatch');

  failures.push(...compareContextRequirements(gc.expected.contextRequirements, actual.contextRequirements));

  return {
    id: gc.id,
    question: gc.question,
    risk: gc.risk,
    grade: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
    actual,
  };
}

// ── aggregate grade report ───────────────────────────────────────────────────

export function buildGradeReport(results: CaseEvaluationResult[]): GradeReport {
  const passed = results.filter((r) => r.grade === 'PASS').length;
  const highRisk = results.filter((r) => r.risk === 'high');
  const highRiskPassed = highRisk.filter((r) => r.grade === 'PASS').length;
  const crFpCount = results
    .filter((r) => r.risk === 'high')
    .reduce((n, r) => n + (r.failures.filter((f) => f === 'cr_false_positive').length), 0);

  return {
    totalCases:          results.length,
    passed,
    failed:              results.length - passed,
    passRate:            results.length > 0 ? passed / results.length : 0,
    highRiskCases:       highRisk.length,
    highRiskPassed,
    highRiskPassRate:    highRisk.length > 0 ? highRiskPassed / highRisk.length : 0,
    crFalsePositiveCount: crFpCount,
    results,
  };
}

// ── console grade report (OD5) ───────────────────────────────────────────────

export function printGradeReport(report: GradeReport): void {
  const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
  console.log('\n=== Phase 14 Golden Dataset Grade Report ===');
  console.log(`Total: ${report.totalCases}  Pass: ${report.passed}  Fail: ${report.failed}  Rate: ${pct(report.passRate)}`);
  console.log(`High-risk: ${report.highRiskCases}  Pass: ${report.highRiskPassed}  Rate: ${pct(report.highRiskPassRate)}`);
  console.log(`CR false-positive count (high-risk): ${report.crFalsePositiveCount}`);

  const rows = report.results.map((r) => ({
    id:       r.id,
    risk:     r.risk,
    grade:    r.grade,
    intent:   r.actual.intent || '(none)',
    strategy: r.actual.strategy || '(none)',
    behavior: r.actual.behavior || '(none)',
    failures: r.failures.join(', ') || '-',
  }));
  console.table(rows);
}
