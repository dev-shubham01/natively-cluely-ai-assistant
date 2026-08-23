// electron/context-intelligence/orchestration/context-requirements-guard.ts
//
// Phase 5: additive semantic suppression guard.
//
// WHY THIS EXISTS
// InterviewIntent.contextRequirements is computed from Classification signals in
// buildInterviewIntent() and attached to TurnDecision, but was never read back to
// influence RetrievalPlan construction. The QT→claim→authority path builds a
// correct plan for most questions; this guard enforces the contextRequirements
// contract as a semantic check over that plan.
//
// WHAT IT DOES
// Suppression only: removes SourceTypes from an already-correct plan when the
// corresponding contextRequirements flag is false. Never adds new source types.
// Never activates retrieval for generalKnowledge. Never adds CONVERSATION_STATE
// (Phase 4 handles conversation via topic-chain injection, not retrieval).
//
// EXPLICIT OWNERSHIP (final Phase 5 contract):
//   resume=false                      → suppress RESUME
//   projects=false AND documents=false → suppress PROJECT_FILE
//   code=false AND projects=false
//     AND documents=false             → suppress CODING_SAMPLE
//   documents=false                   → suppress REFERENCE_FILE
//   JOB_DESCRIPTION    → never suppressed (no contextRequirements field owns it)
//   CONVERSATION_STATE → never suppressed here (Phase 4 owns it)
//   SCREEN_CONTEXT     → never suppressed (no contextRequirements field owns it)
//   generalKnowledge   → no retrieval path to suppress (FAST path already wins)
//   conversation       → Phase 4 topicChain only; does NOT authorize retrieval
//
// WHY documents guards PROJECT_FILE and CODING_SAMPLE:
//   DOCUMENT_FACT claim authority maps to PROJECT_FILE + CODING_SAMPLE (not
//   REFERENCE_FILE in technical-interview). When a question references "the
//   dossier", documents=true is derived from PROJECT_FILE appearing in
//   cls.requiredSourceTypes — meaning the routing placed it there via an explicit
//   claim. Suppressing it when projects=false would contradict the routing.
//
// WHY conversation does NOT guard PROJECT_FILE and CODING_SAMPLE:
//   conversation=true represents Phase 4 topic-chain relevance (the turn is a
//   follow-up or override behavior). It does NOT authorize project/code retrieval.
//   The GROUNDED fan-out for unclaimed follow-ups (orchestrator.ts) is an
//   implementation-level fallback, not a claim-driven requirement. A generic
//   follow-up with no personal/project/document signal should reach FAST path —
//   Phase 4 topic-chain injection is available independently.
//
// INVARIANT: sourceTypes.length === 0 → shouldRetrieve=false, path=FAST

import type { RetrievalPlan, InterviewIntent } from '../contracts/types';
import type { ModePolicy } from '../policies/mode-policy-registry';

/**
 * Apply a contextRequirements-based suppression pass over a RetrievalPlan that
 * was built from QuestionType→claim→authority routing.
 *
 * Pure, synchronous, deterministic. No mutations — returns a new plan object.
 * No-ops when interviewIntent is absent (non-interview or classification failure).
 */
export function applyContextRequirementsGuard(
  plan: RetrievalPlan,
  interviewIntent: InterviewIntent | null | undefined,
  _policy: ModePolicy,
): RetrievalPlan {
  if (!interviewIntent) return plan;

  const { resume, projects, code, documents } = interviewIntent.contextRequirements;

  const suppressed = new Set<string>();
  if (!resume)                          suppressed.add('RESUME');
  if (!projects && !documents)          suppressed.add('PROJECT_FILE');
  if (!code && !projects && !documents) suppressed.add('CODING_SAMPLE');
  if (!documents)                       suppressed.add('REFERENCE_FILE');
  // JOB_DESCRIPTION: no contextRequirements field owns it — never suppressed.
  // CONVERSATION_STATE: Phase 4 owns it — never suppressed.
  // SCREEN_CONTEXT: not mapped by contextRequirements — never suppressed.

  if (suppressed.size === 0) return plan;

  const nextSourceTypes = plan.sourceTypes.filter((s) => !suppressed.has(s));

  if (nextSourceTypes.length === plan.sourceTypes.length) return plan;

  const shouldRetrieve = nextSourceTypes.length > 0;
  return {
    ...plan,
    sourceTypes:   nextSourceTypes,
    shouldRetrieve,
    path:          shouldRetrieve ? plan.path : 'FAST',
  };
}
