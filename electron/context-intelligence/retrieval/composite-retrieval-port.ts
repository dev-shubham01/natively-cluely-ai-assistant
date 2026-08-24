// electron/context-intelligence/retrieval/composite-retrieval-port.ts
//
// Phase 7 — Composite retrieval port.
//
// Wraps a primary RetrievalPort with an optional StoryBank RetrievalPort.
// The StoryBank is activated only when the turn's ContextRequirements declare
// stories=true — all other turns pass straight through to the primary port with
// zero overhead.
//
// Activation gate:
//   decision.interviewIntent?.contextRequirements.stories === true
//
// Evidence merge:
//   Primary evidence is always kept in full. StoryBank evidence is merged in
//   and deduplicated by evidenceId (same sourceId + chunkIndex produces the
//   same id, so the same chunk arriving from both ports keeps the higher-
//   scoring copy). Content-level dedup is left to the primary combineRetrievalPorts
//   call in the caller's port chain.
//
// Failure model:
//   A storyBank failure is logged and the primary result is returned intact
//   (additive, never blocking). A primary failure propagates normally.

import type { RetrievalPort } from '../orchestration/orchestrator';

/**
 * Build a composite port that delegates to `primary` for all turns and
 * additionally queries `storyBank` when the turn's ContextRequirements
 * declare stories=true.
 *
 * Both parameters are required — callers hold the null-check (a null storyBank
 * is never passed; the call site skips wrapping entirely).
 */
export function createCompositeRetrievalPort(
  primary: RetrievalPort,
  storyBank: RetrievalPort,
): RetrievalPort {
  return {
    async retrieve(args) {
      const storiesActive =
        args.decision?.interviewIntent?.contextRequirements?.stories === true;

      const primaryResult = await primary.retrieve(args);

      if (!storiesActive) {
        return primaryResult;
      }

      // StoryBank is additive — a failure must never blank the primary result.
      let storyResult: Awaited<ReturnType<RetrievalPort['retrieve']>> = {
        evidence: [],
        attempts: [],
      };
      try {
        storyResult = await storyBank.retrieve(args);
      } catch (e) {
        storyResult = {
          evidence: [],
          attempts: [{
            attempt: 1 as const,
            strategy: 'story_bank_failure',
            queries: [],
            candidateCount: 0,
            admittedAfterScopeFilter: 0,
            rejectedByScopeFilter: 0,
            durationMs: 0,
            failed: e instanceof Error ? e.message : String(e),
          }],
        };
      }

      if (storyResult.evidence.length === 0) {
        return {
          evidence: primaryResult.evidence,
          attempts: [...primaryResult.attempts, ...storyResult.attempts],
        };
      }

      // Merge: primary evidence first, then storyBank additions.
      // Deduplicate by evidenceId — same sourceId + chunkIndex yields the same
      // id in both ports (formed as `ev-${sourceId}-${chunkIndex}`), so keep
      // whichever copy scored higher.
      const byId = new Map(primaryResult.evidence.map((e) => [e.evidenceId, e]));
      for (const e of storyResult.evidence) {
        const prior = byId.get(e.evidenceId);
        if (!prior) {
          byId.set(e.evidenceId, e);
        } else if (e.finalScore > prior.finalScore) {
          byId.set(e.evidenceId, e);
        }
      }

      return {
        evidence: Array.from(byId.values()),
        attempts: [...primaryResult.attempts, ...storyResult.attempts],
      };
    },
  };
}
