// Context Intelligence V3 — deterministic routing and evidence validation for
// the six evidence-backed Gemini eval fixtures added in Phase 8 Step 10
// (2026-09-19).
//
// Verifies for each of aq_018–aq_023:
//   (a) the question routes to the intended intent
//   (b) buildMockEvidence produces at least one EvidenceItem
//   (c) composePrompt does NOT include the noEvidenceNotice text when evidence
//       is present (packed.evidenceBlock non-empty)
//   (d) composePrompt DOES include the evidenceBlock content from the mock text

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const { decide }            = await import(pathToFileURL(path.join(base, 'orchestration/orchestrator.js')).href);
const { composePrompt }     = await import(pathToFileURL(path.join(base, 'generation/prompt-composer.js')).href);
const { MODE_POLICIES }     = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);
const { adaptLegacyChunks } = await import(pathToFileURL(path.join(base, 'retrieval/legacy-adapter.js')).href);

const POLICY     = MODE_POLICIES['technical-interview'];
const EVAL_SCOPE = { userId: 'eval', modeId: 'technical-interview' };

// Exact copy of buildMockEvidence from answer-quality.eval.mjs.
function buildMockEvidence(descriptors) {
  if (!descriptors || descriptors.length === 0) return [];
  const MOCK_VERSION   = 'mock-v1';
  const sourceTypes    = new Map(descriptors.map((d) => [d.sourceId, d.sourceType]));
  const activeVersions = new Map(descriptors.map((d) => [d.sourceId, MOCK_VERSION]));
  const chunkVersions  = new Map(descriptors.map((d) => [d.sourceId, MOCK_VERSION]));
  const chunks = descriptors.map((d, i) => ({
    sourceId:   d.sourceId,
    text:       d.text,
    chunkIndex: d.chunkIndex ?? i,
    score:      d.score ?? 0.9,
  }));
  const { evidence } = adaptLegacyChunks(chunks, {
    scope: EVAL_SCOPE,
    sourceTypes,
    activeVersions,
    chunkVersions,
    assumeInScopeWhenUnknown: true,
  });
  return evidence;
}

// Markers produced by noEvidenceNotice (any of these in the composed prompt
// indicates the notice fired — all are wrong when mock evidence is present).
const NO_EVIDENCE_MARKERS = [
  'No supporting evidence was retrieved',
  'has NO reference material attached',
  'This question requires a source the active mode does not authorize',
];

function hasNoEvidenceNotice(composedPrompt) {
  const full = composedPrompt.system + ' ' + composedPrompt.user;
  return NO_EVIDENCE_MARKERS.some((m) => full.includes(m));
}

// ── Fixture definitions (mirrors answer-quality.eval.mjs aq_018–aq_023) ───────

const FIXTURES = [
  {
    id: 'aq_018',
    question: 'Tell me about a time you had to convince your team to adopt a different technical approach.',
    expectedIntent:   'behavioral',
    expectedStrategy: 'tell_behavioral_story',
    mockEvidence: [
      {
        sourceId:   'mock-resume-behavioral-1',
        sourceType: 'RESUME',
        text:
          'At Helix Commerce (fictional B2B SaaS), I proposed replacing our polling-based ' +
          'inventory sync with Kafka for the Orion order-processing service. The team was ' +
          'sceptical — none of us had operated Kafka in production, and the on-call overhead ' +
          'worried two senior engineers. I volunteered to build a proof of concept in one week, ' +
          'wrote a short operations runbook covering common failure modes, and ran a load-test ' +
          'demo showing a 4× reduction in inventory desync events under simulated peak traffic. ' +
          'After reviewing the runbook and demo results, the team agreed to proceed. We shipped ' +
          'Kafka-based async inventory sync six weeks later; desync incidents dropped from ' +
          'roughly three per week to fewer than one per month.',
        chunkIndex: 0,
        score: 0.92,
      },
    ],
  },
  {
    id: 'aq_019',
    question: 'Tell me about yourself.',
    expectedIntent:   'introduction',
    expectedStrategy: 'introduce_self',
    mockEvidence: [
      {
        sourceId:   'mock-resume-intro-1',
        sourceType: 'RESUME',
        text:
          'Senior Backend Engineer at Helix Commerce (fictional B2B SaaS) for two years. ' +
          'Prior to that, three years as a full-stack engineer at two early-stage startups ' +
          'building customer-facing APIs and learning to tune PostgreSQL under concurrent write loads. ' +
          'At Helix Commerce I moved fully into backend infrastructure. Most significant project: ' +
          'Orion — an order-processing microservice I led from architecture to production. Orion ' +
          'reduced checkout p99 latency from 1.2 s to 340 ms and now handles roughly 2,000 orders ' +
          'per day. Currently looking for a role focused on distributed systems at larger scale ' +
          'where I can deepen this experience.',
        chunkIndex: 0,
        score: 0.93,
      },
    ],
  },
  {
    id: 'aq_020',
    question: 'Tell me about a challenging production incident you had to resolve.',
    expectedIntent:   'experience_question',
    expectedStrategy: 'narrate_experience',
    mockEvidence: [
      {
        sourceId:   'mock-resume-experience-1',
        sourceType: 'RESUME',
        text:
          'During the Black Friday load peak at Helix Commerce (fictional), the Orion checkout ' +
          'service began timing out under concurrent order submissions. I pulled pg_stat_activity ' +
          'and found hundreds of transactions waiting on row-level locks in the inventory ' +
          'reservation step — a deadlock cycle between two queries updating the same inventory ' +
          'row in different lock orders. Root cause: the reservation query did not enforce a ' +
          'consistent row-ID ordering across concurrent sessions. I deployed a fix that imposed ' +
          'ascending row-ID lock order across all callers. Within ten minutes of the deploy, ' +
          'checkout timeout errors dropped from roughly 800 per minute to near zero. ' +
          'p99 latency recovered from 4.1 s to under 400 ms. I followed up by adding a ' +
          'pg_stat_activity-based deadlock alert so we would catch recurrences before users did.',
        chunkIndex: 0,
        score: 0.91,
      },
    ],
  },
  {
    id: 'aq_021',
    question: 'Walk me through your most recent project and the role you played in it.',
    expectedIntent:   'project_context',
    expectedStrategy: 'describe_project',
    mockEvidence: [
      {
        sourceId:   'mock-resume-project-1',
        sourceType: 'RESUME',
        text:
          'Most recent project: Orion — order and inventory management microservice at Helix ' +
          'Commerce (fictional). Tech lead and primary implementer, working with one junior ' +
          'engineer. Orion replaced a monolithic checkout module that had become the primary ' +
          'reliability bottleneck. Built in Node.js with TypeScript, backed by PostgreSQL for ' +
          'order state and Redis for inventory read cache. Async inventory reconciliation runs ' +
          'over Kafka. My role covered architecture design, database schema, API contract, Kafka ' +
          'topic design, and all production hardening. Core challenge: maintaining consistency ' +
          'across the synchronous order placement path and the asynchronous inventory update path. ' +
          'Resolved using a reservation-then-confirm pattern with an outbox table. Orion handles ' +
          'roughly 2,000 orders per day with a p99 checkout latency of 340 ms.',
        chunkIndex: 0,
        score: 0.93,
      },
    ],
  },
  {
    id: 'aq_022',
    question: 'How did you handle database reliability in the service you built?',
    expectedIntent:   'project_deep_dive',
    expectedStrategy: 'describe_project',
    mockEvidence: [
      {
        sourceId:   'mock-resume-deepdive-1',
        sourceType: 'RESUME',
        text:
          'In the Orion service at Helix Commerce (fictional), database reliability used three layers. ' +
          'First, all order-placement writes ran inside a serializable transaction covering both the ' +
          'inventory reservation and the order record insert, preventing partial writes under any ' +
          'crash scenario. Second, Kafka-consumer inventory updates used optimistic locking: each ' +
          'inventory row carried a version counter, and a conflicting update retried up to five times ' +
          'with exponential back-off before failing with a structured error rather than silently ' +
          'dropping the update. Third, an outbox table decoupled order confirmation from Kafka ' +
          'publish: if the broker was unreachable the order still committed atomically, and a ' +
          'background reconciler replayed the outbox row when the broker recovered. During a ' +
          'four-hour Kafka outage in staging, zero order records were lost. We also ran weekly ' +
          'chaos drills that killed the PostgreSQL primary under active load to verify automatic ' +
          'failover behaviour.',
        chunkIndex: 0,
        score: 0.91,
      },
    ],
  },
  {
    id: 'aq_023',
    question: 'Why did you choose PostgreSQL over MongoDB for your project?',
    expectedIntent:   'technology_decision',
    expectedStrategy: 'justify_decision',
    mockEvidence: [
      {
        sourceId:   'mock-profile-techd-1',
        sourceType: 'PROFILE_FACT',
        text:
          'For the Orion order-processing service at Helix Commerce (fictional), chose PostgreSQL ' +
          'over MongoDB. Deciding factor: checkout required atomic writes across two tables — the ' +
          'orders table and the inventory reservation table — in a single ACID transaction. At the ' +
          'version of MongoDB available to the team, multi-document cross-collection transactions ' +
          'were either unavailable or insufficiently mature for production use. PostgreSQL row-level ' +
          'locking also fit the reservation-then-confirm pattern directly: we could lock specific ' +
          'inventory rows during checkout without blocking the entire collection. Main tradeoff: ' +
          'schema changes required coordinated migrations, whereas MongoDB would have allowed ' +
          'field additions without schema overhead. Given the stable domain model and the hard ' +
          'consistency requirement on order placement, PostgreSQL was the correct call for this context.',
        chunkIndex: 0,
        score: 0.94,
      },
    ],
  },
];

// ── Validate each fixture ─────────────────────────────────────────────────────

for (const fixture of FIXTURES) {
  describe(`${fixture.id}: ${fixture.expectedIntent}`, () => {
    const d = decide({
      requestId: fixture.id, requestSequence: 1,
      surface: 'manual_chat', modeId: 'technical-interview',
      scope: EVAL_SCOPE, sessionId: `test-${fixture.id}`,
      manualQuestion: fixture.question,
    });

    const evidence = buildMockEvidence(fixture.mockEvidence);
    const composed = composePrompt({ decision: d, policy: POLICY, evidence });

    test('routes to expected intent', () => {
      const actualIntent = d.interviewIntent?.intent ?? '';
      assert.equal(
        actualIntent, fixture.expectedIntent,
        `expected intent=${fixture.expectedIntent}, got=${actualIntent}`,
      );
    });

    test('routes to expected strategy', () => {
      const actualStrategy = d.answerStrategy?.id ?? '';
      assert.equal(
        actualStrategy, fixture.expectedStrategy,
        `expected strategy=${fixture.expectedStrategy}, got=${actualStrategy}`,
      );
    });

    test('contextRequirements.stories is true', () => {
      assert.equal(
        d.interviewIntent?.contextRequirements.stories, true,
        'stories must be true for all six personal-evidence intents',
      );
    });

    test('buildMockEvidence produces at least one EvidenceItem', () => {
      assert.ok(evidence.length >= 1, `evidence must be non-empty — got ${evidence.length} items`);
    });

    test('evidence source type matches descriptor', () => {
      assert.equal(
        evidence[0].sourceType, fixture.mockEvidence[0].sourceType,
        `sourceType mismatch: expected ${fixture.mockEvidence[0].sourceType}, got ${evidence[0].sourceType}`,
      );
    });

    test('composed prompt does NOT fire noEvidenceNotice', () => {
      assert.ok(
        !hasNoEvidenceNotice(composed),
        `noEvidenceNotice must NOT fire when mock evidence is present — found notice text in composed prompt`,
      );
    });

    test('composed prompt includes evidence block with mock text excerpt', () => {
      const excerpt = fixture.mockEvidence[0].text.slice(0, 30);
      assert.ok(
        composed.user.includes(excerpt) || composed.system.includes(excerpt),
        `evidence content must appear in composed prompt — expected to find: "${excerpt}"`,
      );
    });
  });
}
