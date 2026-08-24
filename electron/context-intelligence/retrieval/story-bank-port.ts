// electron/context-intelligence/retrieval/story-bank-port.ts
//
// Phase 7 — StoryBank retrieval port.
//
// A specialised RetrievalPort over the candidate's RESUME docs that applies
// story-specific BM25 boost rules. It fires only when the composite port
// detects contextRequirements.stories === true; its evidence supplements the
// primary port rather than replacing it.
//
// ── WHY THIS BYPASSES createLegacyRetrievalPort ─────────────────────────────
//
// createLegacyRetrievalPort filters evidence by retrievalPlan.sourceTypes.
// The context-requirements-guard suppresses RESUME from that set when
// contextRequirements.resume === false, which is correct for PRIMARY retrieval:
// "resume=false means: do not run general resume evidence retrieval".
//
// But `stories` is an INDEPENDENT context requirement. Its meaning is:
// "retrieve personal narrative evidence for this answer", which is NOT the
// same as the primary RESUME retrieval gate. The two flags are orthogonal:
//
//   "Why did you use Redis in your project?" → stories=true, resume=false
//
// StoryBank is the per-stories gate; the retrievalPlan.sourceTypes gate is
// the per-resume gate. They must not be coupled.
//
// The fix: call adaptLegacyChunks directly so that:
//   • Scope containment (userId match)  ─ still enforced ✓
//   • Version filtering (no stale data) ─ still enforced ✓
//   • retrievalPlan.sourceTypes filter  ─ NOT applied (StoryBank's own authorization)
//   • Claim authority filter            ─ NOT applied (stories is the activation gate)
//
// Design constraints (approved Phase 7 architecture):
//   • No new SourceType — chunks are typed RESUME, same as profile port.
//   • No LLM calls — pure BM25 + deterministic boost rules.
//   • No automatic story generation — only real evidence is surfaced.
//   • No fabrication — if no relevant evidence exists, the retrieve() call
//     returns an empty array and the composite port contributes nothing.
//   • resume kind only — jd and fact docs contain no personal narrative.
//   • Independent of answerStrategy — activated through contextRequirements.

import type { EvidenceScope, SourceType, TurnDecision } from '../contracts/types';
import type { RetrievalPort } from '../orchestration/orchestrator';
import type { RetrievalAttemptTrace } from '../observability/answer-trace';
import {
  renderProfileSections,
  type ProfileDocLike,
} from './profile-retrieval-port';
import { adaptLegacyChunks } from './legacy-adapter';
import { Bm25Index, DEFAULT_BM25 } from './bm25';

// ── Story-specific boost rules ───────────────────────────────────────────────
//
// These rules fire on narrative vocabulary — the signals that appear in
// behavioral, experience, introduction, project_context, project_deep_dive,
// and technology_decision questions. They prioritise chunks that describe
// what the candidate DID, BUILT, DECIDED, or EXPERIENCED.

interface StoryRule { re: RegExp; boosts: Record<string, number> }

const STORY_RULES: StoryRule[] = [
  // Conflict / challenge narrative (behavioral STAR — situation/task)
  { re: /\b(challenge[ds]?|difficult|hard|struggle[d]?|obstacle|problem\b|fail[ed]?|mistake[d]?|crisi[s])\b/i,
    boosts: { experience: 0.4, achievements: 0.3 } },
  // Leadership / ownership signals
  { re: /\b(led|lead\b|managed|coordinated|drove|owned|oversaw|responsible for|initiative|spearheaded)\b/i,
    boosts: { experience: 0.4, achievements: 0.35, identity: 0.2 } },
  // Outcome / impact signals (STAR — result)
  { re: /\b(result[ed]?|outcome|impact|improv\w*|reduc\w*|increas\w*|saved?\b|deliver\w*|achiev\w*|accomplish\w*)\b/i,
    boosts: { achievements: 0.4, experience: 0.3 } },
  // Project action signals (built, shipped, deployed)
  { re: /\b(built|implemented|designed|shipped|deployed|created|developed|launch\w*|wrote|engineer\w*)\b/i,
    boosts: { projects: 0.4, experience: 0.25 } },
  // Team / collaboration signals
  { re: /\b(team|collaboration|cross-functional|stakeholder|work(ed)? with|partner\w*|collab\w*)\b/i,
    boosts: { experience: 0.3, identity: 0.2 } },
  // Decision / trade-off signals (technology_decision)
  { re: /\b(decid\w*|chose|choose|evaluat\w*|trade-?off|alternative|consider\w*|pick\w*|select\w*)\b/i,
    boosts: { projects: 0.35, experience: 0.3 } },
  // Career narrative / motivation signals (introduction)
  { re: /\b(passion|excit\w*|motivat\w*|interest\w*|background|journey|career|story|pivot)\b/i,
    boosts: { identity: 0.4, experience: 0.2 } },
  // Growth / learning signals
  { re: /\b(learn\w*|growth|grow\b|improv\w*|became|realiz\w*|insight|lesson|skill(?:ed)?)\b/i,
    boosts: { achievements: 0.3, identity: 0.25, experience: 0.2 } },
  // Self-introduction direct matches
  { re: /\b(tell me about yourself|introduce\b|about me|walk me through|my background)\b/i,
    boosts: { identity: 0.5, experience: 0.3 } },
  // Technology decision: "why did you use/choose/pick X" patterns
  { re: /\b(why did you (use|choose|pick|select|go with|opt for)|how did you implement|how did you build)\b/i,
    boosts: { projects: 0.4, experience: 0.3 } },
];

// Story-relevant boostKeys — chunks outside this set are not surfaced from the
// StoryBank, even if their BM25 score is non-zero. The StoryBank is personal
// narrative evidence; skills / education / JD requirement chunks don't belong.
const STORY_BOOST_KEYS = new Set(['experience', 'projects', 'achievements', 'identity']);

function storyBoosts(query: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const rule of STORY_RULES) {
    if (!rule.re.test(query)) continue;
    for (const [key, val] of Object.entries(rule.boosts)) {
      result.set(key, Math.max(result.get(key) ?? 0, val));
    }
  }
  return result;
}

/** Same squash as profile-retrieval-port — keeps scores comparable when
 *  composite merges evidence from both ports. */
const squash = (bm25: number): number => (bm25 <= 0 ? 0 : bm25 / (bm25 + 1.5));

const normText = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

// ── Input ────────────────────────────────────────────────────────────────────

export interface StoryBankPortInput {
  /** Profile docs — only 'resume' kind chunks are indexed; jd/fact are skipped. */
  docs: ProfileDocLike[];
  /** Must match the turn scope userId or the adapter rejects all chunks. */
  userId: string;
}

// ── Internal chunk shape ─────────────────────────────────────────────────────

interface StoryChunk {
  sourceId:  string;
  fileName:  string;
  section:   string;
  text:      string;
  chunkIndex: number;
  boostKey:  string;
  completeInventory: boolean;
  inventoryCategory?: string;
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a StoryBank RetrievalPort, or null if no indexable resume content
 * exists. Always returns null rather than a port that would emit no evidence —
 * the composite port uses this to skip the storyBank retrieve call entirely.
 *
 * Scope/version filtering is applied via adaptLegacyChunks; the primary
 * path's retrievalPlan.sourceTypes gate is intentionally NOT applied here
 * because stories is an independent activation gate from resume.
 */
export function createStoryBankRetrievalPort(input: StoryBankPortInput): RetrievalPort | null {
  const STORY_SOURCE_TYPE: SourceType = 'RESUME';

  const sourceTypes    = new Map<string, SourceType>();
  const activeVersions = new Map<string, string>();
  const chunkVersions  = new Map<string, string>();
  const sourceScopes   = new Map<string, EvidenceScope>();

  const chunks: StoryChunk[] = [];

  for (const doc of input.docs) {
    // StoryBank is personal narrative — resume only.
    if (doc.kind !== 'resume') continue;
    if (!doc.sourceId || !doc.versionId) continue;

    let idx = 0;
    const seen = new Set<string>();

    const push = (
      section: string, text: string, boostKey: string,
      completeInventory: boolean, inventoryCategory?: string,
    ) => {
      // Only index story-relevant sections.
      if (!STORY_BOOST_KEYS.has(boostKey)) return;
      const key = normText(text);
      if (!key || seen.has(key)) return;
      seen.add(key);
      chunks.push({
        sourceId: doc.sourceId, fileName: doc.fileName, section, text,
        chunkIndex: idx++, boostKey, completeInventory, inventoryCategory,
      });
    };

    for (const s of renderProfileSections('resume', doc.structured)) {
      push(s.section, s.text, s.boostKey, s.completeInventory, s.inventoryCategory);
    }

    if (idx === 0) continue;

    sourceTypes.set(doc.sourceId, STORY_SOURCE_TYPE);
    activeVersions.set(doc.sourceId, doc.versionId);
    chunkVersions.set(doc.sourceId, doc.versionId);
    sourceScopes.set(doc.sourceId, { userId: input.userId });
  }

  if (sourceTypes.size === 0) return null;

  return {
    async retrieve({ decision }: { decision: Readonly<TurnDecision> }) {
      const t0 = Date.now();

      // StoryBank needs the turn's scope for containment checks.
      // If scope is absent (pre-Phase-5 or synthetic decision), fail closed.
      const scope = decision.scope;
      if (!scope) {
        return {
          evidence: [],
          attempts: [{
            attempt: 1 as const, strategy: 'story_bank_no_scope',
            queries: [], candidateCount: 0,
            admittedAfterScopeFilter: 0, rejectedByScopeFilter: 0, durationMs: 0,
          }],
        };
      }

      // Extract the retrieval query from the decision plan. Fallback to
      // resolvedQuestion if no query was planned.
      const query: string = decision.retrievalPlan?.queries?.[0] ?? decision.resolvedQuestion ?? '';

      const index = new Bm25Index(
        chunks.map((c, i) => ({ id: String(i), text: `${c.section} ${c.text}` })),
        DEFAULT_BM25,
      );
      const bm25ById = new Map(index.score(query).map((s) => [s.id, s.score]));
      const boosts = storyBoosts(query);

      const ranked = chunks
        .map((c, i) => {
          const lexical = squash(bm25ById.get(String(i)) ?? 0);
          const boost   = boosts.get(c.boostKey) ?? 0;
          // Score formula mirrors profile-retrieval-port:
          //   • lexical match → blended (lexical dominates, boost assists)
          //   • complete inventory targeted by fired boost → 0.6 (policy-admit)
          //   • boost only → capped at 0.35 (below real matches)
          const boostOnly = c.completeInventory && boost > 0 ? 0.6 : Math.min(0.35, boost);
          const score     = lexical > 0 ? Math.min(1, lexical * 0.85 + boost) : boostOnly;
          return { c, score };
        })
        .filter((s) => s.score > 0.05)
        .sort((a, b) => b.score - a.score || a.c.chunkIndex - b.c.chunkIndex);

      // topK: use the plan's maximumCandidates when available, else a
      // conservative default so StoryBank doesn't saturate the evidence cap.
      const topK = decision.retrievalPlan?.maximumCandidates ?? 6;

      const raw = ranked.slice(0, Math.max(1, topK)).map(({ c, score }) => ({
        sourceId:   c.sourceId,
        fileName:   c.fileName,
        section:    c.section,
        text:       c.text,
        chunkIndex: c.chunkIndex,
        score,
        provenance: 'PROFILE_RESUME' as const,
        metadata: c.completeInventory
          ? { completeInventory: true, storyBank: true, ...(c.inventoryCategory ? { inventoryCategory: c.inventoryCategory } : {}) }
          : { storyBank: true },
      }));

      // Apply scope + version filtering via the shared adapter.
      // Intentionally NOT filtering by retrievalPlan.sourceTypes — that is the
      // primary path's gate and must not block StoryBank (see module header).
      const adapted = adaptLegacyChunks(raw, {
        scope,
        sourceTypes,
        activeVersions,
        chunkVersions,
        sourceScopes,
        // Both false: we own the registry and know all versions and scopes.
        assumeCurrentWhenVersionUnknown: false,
        assumeInScopeWhenUnknown: false,
      });

      const attempt: RetrievalAttemptTrace = {
        attempt: 1 as const,
        strategy: 'story_bank_bm25',
        queries: query ? [query] : [],
        candidateCount: raw.length,
        admittedAfterScopeFilter: adapted.evidence.length,
        rejectedByScopeFilter: adapted.rejected.length,
        rejections: adapted.rejected.map((r) => ({ sourceId: r.sourceId, reason: r.reason })),
        durationMs: Date.now() - t0,
      };

      return { evidence: adapted.evidence, attempts: [attempt] };
    },
  };
}
