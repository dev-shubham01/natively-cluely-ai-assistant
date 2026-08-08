// Deep-run 2 (2026-08-01, natively_debug(1).log — 151 verbose turns):
// regression suite for the remaining Context Intelligence defects.
//
// Every failing question below is taken verbatim from a failing
// context_turn_complete record; each previously produced an empty/FAST plan
// with answerability FULL and zero evidence, a wrong source role, a one-sided
// comparison, retired-over-current ranking, or an over-broad plan.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const load = (p) => import(pathToFileURL(path.join(base, p)).href);

const { classifyTurn } = await load('question/turn-classifier.js');
const { MODE_POLICIES } = await load('policies/mode-policy-registry.js');
const { CLAIM_AUTHORITY } = await load('policies/source-authority-policy.js');
const { decide, evaluateAnswerability, evidenceSupportsClaim, propertyQualifierTerms } = await load('orchestration/orchestrator.js');
const { createLegacyRetrievalPort } = await load('retrieval/legacy-retrieval-port.js');
const { composePrompt } = await load('generation/prompt-composer.js');

const classify = (q, modeId, over = {}) =>
  classifyTurn({ resolvedQuestion: q, policy: MODE_POLICIES[modeId], isFollowUp: false, ...over });

const hasPrivate = (r) => r.claimTypes.some((c) => (CLAIM_AUTHORITY[c]?.authoritative ?? []).length > 0);

// ── Issue 1: no more unexplained empty plans ────────────────────────────────

describe('issue 1: every document-backed question from the failing set now plans sources', () => {
  // NOTE: this used to also carry recruiting/sales/lecture rows (scorecard
  // weights, an FAQ retention/hallucinations pair, and a course-frequency
  // pair) plus a team-meet-with-attachments REFERENCE_FILE case. Deleted, not
  // adapted — each pinned a live-log regression to that mode's own reference-
  // document vocabulary and source type (REFERENCE_FILE), which
  // technical-interview (the only surviving mode) does not authorize.
  const cases = [
    ['technical-interview', 'How long did the incident last?'],
    ['technical-interview', 'Explain the source-precedence decision.'],
  ];
  for (const [mode, q] of cases) {
    test(`${mode}: "${q}" retrieves with a private claim`, () => {
      const r = classify(q, mode);
      assert.equal(r.shouldRetrieve, true, `${q} → path=${r.path} (${r.reason})`);
      assert.ok(r.requiredSourceTypes.length > 0, `planned empty: ${r.reason}`);
      assert.ok(hasPrivate(r), `no private claim: ${JSON.stringify(r.claimTypes)}`);
    });
  }

  test('NON-REGRESSION: concept/coding questions keep the FAST path', () => {
    for (const [mode, q] of [
      ['technical-interview', 'What is a mutex?'],
      ['technical-interview', 'What is idempotency in an HTTP API?'],
      ['technical-interview', 'What is the difference between TCP and UDP?'],
    ]) {
      const r = classify(q, mode);
      assert.equal(r.path, 'FAST', `"${q}" in ${mode} → ${r.path} (${r.reason})`);
    }
  });

  test('assistant meta-question is never a profile claim', () => {
    const r = classify('Why did you refuse?', 'technical-interview');
    assert.ok(!r.claimTypes.includes('USER_MOTIVATION'), JSON.stringify(r.claimTypes));
  });
});

// NOTE: an "issue 2: factual-time and provenance semantics" describe used to
// live here (sales FAQ / REFERENCE_FILE, team-meet risk-register /
// REFERENCE_FILE, team-meet bare-attribution / MEETING_TRANSCRIPT-only ×2).
// Deleted, not adapted — technical-interview (the only surviving mode)
// authorizes neither REFERENCE_FILE nor MEETING_TRANSCRIPT, so there is no
// surviving mode to exercise any of these four cases.

// NOTE: an "issue 3: candidate/JD comparisons are two-sided" describe used to
// live here. Deleted, not adapted — it is inherently about the RECRUITING
// mode's own perspective (evaluating a candidate against a JD, via
// CANDIDATE_FILE), which technical-interview — the candidate's own side of
// that conversation — does not authorize.

// ── Issue 4: status precedence in candidate selection ───────────────────────

describe('issue 4: current beats retired at selection time', () => {
  // PROJECT_FILE (not REFERENCE_FILE) / technical-interview (not sales) —
  // technical-interview, the only surviving mode, does not authorize
  // REFERENCE_FILE. The mode and source-type vocabulary here are incidental
  // fixtures for the status-precedence ranking mechanics under test.
  const mkPort = (chunks) => createLegacyRetrievalPort({
    registry: {
      sourceTypes: new Map([['cur', 'PROJECT_FILE'], ['old', 'PROJECT_FILE']]),
      activeVersions: new Map([['cur', 'v1'], ['old', 'v1']]),
      chunkVersions: new Map([['cur', 'v1'], ['old', 'v1']]),
      sourceScopes: new Map([['cur', { userId: 'u' }], ['old', { userId: 'u' }]]),
    },
    retrieve: async () => chunks,
  });

  const chunks = [
    { sourceId: 'old', fileName: 'legacy_pricing.md', text: 'Team plan costs $299 per month.', chunkIndex: 0, score: 0.95, metadata: { documentStatus: 'retired' } },
    { sourceId: 'cur', fileName: 'current_pricing.md', text: 'Team plan costs $499 per month.', chunkIndex: 0, score: 0.7, metadata: { documentStatus: 'current' } },
  ];

  const decisionFor = (q) => decide({
    requestId: 'p', requestSequence: 1, surface: 'manual_chat', modeId: 'technical-interview',
    scope: { userId: 'u', modeId: 'technical-interview' }, sessionId: 's', manualQuestion: q,
  });

  test('a higher-scoring retired chunk cannot outrank the current one', async () => {
    const d = decisionFor('What is the current Team price?');
    const { evidence } = await mkPort(chunks).retrieve({ decision: d });
    assert.ok(evidence.length >= 2);
    assert.equal(evidence[0].sourceId, 'cur',
      `retired outranked current: ${evidence.map((e) => e.sourceId).join(',')}`);
  });

  test('explicitly historical questions may lead with the retired source', async () => {
    const d = decisionFor('What was the retired legacy Team price?');
    const { evidence } = await mkPort(chunks).retrieve({ decision: d });
    assert.equal(evidence[0].sourceId, 'old', evidence.map((e) => e.sourceId).join(','));
  });
});

// ── Issue 5: narrow plans + per-type diversity ──────────────────────────────

describe('issue 5: retrieval narrowing', () => {
  test('a pure value lookup in technical-interview excludes résumé/JD pools', () => {
    const r = classify('What is the worker batch size?', 'technical-interview');
    assert.ok(!r.requiredSourceTypes.includes('RESUME'), JSON.stringify(r.requiredSourceTypes));
    assert.ok(!r.requiredSourceTypes.includes('JOB_DESCRIPTION'), JSON.stringify(r.requiredSourceTypes));
    assert.ok(r.requiredSourceTypes.includes('PROJECT_FILE'), JSON.stringify(r.requiredSourceTypes));
  });

  test('a coding task with a named language never fans out to identity pools', () => {
    const d = decide({
      requestId: 'p', requestSequence: 1, surface: 'manual_chat', modeId: 'technical-interview',
      scope: { userId: 'u', modeId: 'technical-interview' }, sessionId: 's',
      manualQuestion: 'Reverse a singly linked list in place in Python.',
    });
    assert.ok(!d.retrievalPlan.sourceTypes.includes('RESUME'), JSON.stringify(d.retrievalPlan.sourceTypes));
    assert.ok(!d.retrievalPlan.sourceTypes.includes('JOB_DESCRIPTION'), JSON.stringify(d.retrievalPlan.sourceTypes));
  });

  test('NON-REGRESSION: entity questions still reach the résumé pool', () => {
    const r = classify('How many registered users does SignalNest have?', 'technical-interview');
    assert.ok(r.requiredSourceTypes.includes('RESUME'), JSON.stringify(r.requiredSourceTypes));
  });

  test('per-type diversity: a flooded type cannot consume every accepted slot', async () => {
    const registry = {
      sourceTypes: new Map([['res', 'RESUME'], ['proj', 'PROJECT_FILE']]),
      activeVersions: new Map([['res', 'v1'], ['proj', 'v1']]),
      chunkVersions: new Map([['res', 'v1'], ['proj', 'v1']]),
      sourceScopes: new Map([['res', { userId: 'u' }], ['proj', { userId: 'u' }]]),
    };
    const chunks = [
      ...Array.from({ length: 8 }, (_, i) => ({ sourceId: 'res', text: `resume experience chunk about projects ${i}`, chunkIndex: i, score: 0.9 - i * 0.01 })),
      { sourceId: 'proj', text: 'QueueForge project summary: WORKER_BATCH_SIZE 64', chunkIndex: 0, score: 0.4 },
    ];
    const port = createLegacyRetrievalPort({ registry, retrieve: async () => chunks });
    const d = decide({
      requestId: 'p', requestSequence: 1, surface: 'manual_chat', modeId: 'technical-interview',
      scope: { userId: 'u', modeId: 'technical-interview' }, sessionId: 's',
      manualQuestion: 'Walk me through QueueForge.',
    });
    const { evidence } = await port.retrieve({ decision: d });
    assert.ok(evidence.some((e) => e.sourceType === 'PROJECT_FILE'),
      `project evidence starved: ${evidence.map((e) => e.sourceType).join(',')}`);
  });
});

// ── Issue 6: impossible answerability states ────────────────────────────────

describe('issue 6: answerability invariants', () => {
  test('zero claims + grounded + zero evidence is never FULL', () => {
    const d = {
      questionTypes: ['AMBIGUOUS'], claimRequirements: [],
      isFollowUp: false, resolvedQuestion: 'End meeting.',
      retrievalPlan: { path: 'GROUNDED', shouldRetrieve: true, sourceTypes: ['REFERENCE_FILE'] },
    };
    assert.notEqual(evaluateAnswerability(d, []), 'FULL');
  });

  test('FAST general questions keep FULL', () => {
    const d = {
      questionTypes: ['GENERAL_TECHNICAL'], claimRequirements: [],
      isFollowUp: false, resolvedQuestion: 'What is a mutex?',
      retrievalPlan: { path: 'FAST', shouldRetrieve: false, sourceTypes: [] },
    };
    assert.equal(evaluateAnswerability(d, []), 'FULL');
  });

  test('document-specific miss carries the honest fallback label', () => {
    // classification-level: the label chain is exercised end-to-end in
    // Orchestrator.test.mjs ("SOURCE_FIRST falls back…" now expects
    // DOCUMENT_FACT_NOT_FOUND); here we pin the classifier precondition.
    const r = classify('Tell me about your Rust experience.', 'technical-interview');
    assert.ok(hasPrivate(r));
  });
});

// ── Issue 7: qualified properties ───────────────────────────────────────────

describe('issue 7: qualified value heads', () => {
  test('the CSV canary does not match the security canary', () => {
    const q = 'What is the CSV canary?';
    assert.equal(evidenceSupportsClaim(
      { acceptedFor: ['DOCUMENT_FACT'], content: 'Security canary: SALES-SEC-CANARY-777' }, 'DOCUMENT_FACT', q,
    ), false, 'a bare head match must not satisfy a qualified value');
    assert.equal(evidenceSupportsClaim(
      { acceptedFor: ['DOCUMENT_FACT'], content: 'CSV canary: SALES-CSV-CANARY-455' }, 'DOCUMENT_FACT', q,
    ), true);
  });

  test('source identity satisfies the qualifier when the text cannot', () => {
    assert.equal(evidenceSupportsClaim(
      {
        acceptedFor: ['DOCUMENT_FACT'], content: 'canary: SALES-CSV-CANARY-455',
        documentTitle: '05_competitor_matrix.csv',
      }, 'DOCUMENT_FACT', 'What is the CSV canary?',
    ), true);
  });

  test('propertyQualifierTerms extracts distinguishing modifiers only', () => {
    assert.deepEqual(propertyQualifierTerms('What is the CSV canary?'), ['csv']);
    assert.deepEqual(propertyQualifierTerms('What is the current Team price?'), ['team']);
    assert.deepEqual(propertyQualifierTerms('What is the salary?'), []);
  });

  test('NON-REGRESSION: descriptive heads keep head-only matching', () => {
    assert.equal(evidenceSupportsClaim(
      { acceptedFor: ['DOCUMENT_FACT'], content: 'Frameworks: React, FastAPI' },
      'DOCUMENT_FACT', 'What backend framework is explicitly documented?',
    ), true);
  });
});

// ── Issue 8: explicit decoy/secondary-entity lookup ─────────────────────────

describe('issue 8: explicit secondary/decoy source lookup without contamination', () => {
  // NOTE: this used to also carry recruiting/CANDIDATE_FILE cases — a decoy
  // plans-the-reference-side test, a plain-candidate NON-REGRESSION, an
  // end-to-end decoy-retrieval test, and a composer secondary_source-section
  // test. Deleted, not adapted — all four depend on CANDIDATE_FILE
  // authorization for a recruiter-vs-candidate scenario that
  // technical-interview (the candidate's own side) does not have. The
  // isolation invariant below is mode-agnostic (calls evidenceSupportsClaim
  // directly, no modeId) and survives untouched.

  test('isolation both ways: primary values cannot satisfy decoy-qualified requests and vice versa', () => {
    const q = 'Identify the decoy candidate ID.';
    assert.equal(evidenceSupportsClaim(
      { acceptedFor: ['DOCUMENT_FACT'], content: 'Candidate ID: CAND-LEENA-2026', documentTitle: '01_candidate_resume.md' },
      'DOCUMENT_FACT', q,
    ), false, "the PRIMARY candidate's ID must not satisfy a decoy lookup");
    assert.equal(evidenceSupportsClaim(
      { acceptedFor: ['DOCUMENT_FACT'], content: 'Decoy candidate ID: CAND-DECOY-0000', documentTitle: '06_unrelated_candidate_decoy.md' },
      'DOCUMENT_FACT', q,
    ), true);
    // …and the reverse: the decoy's CGPA can never answer a Leena question.
    assert.equal(evidenceSupportsClaim(
      { acceptedFor: ['USER_EDUCATION'], content: 'Unrelated candidate CGPA: 9.99/10', documentTitle: '06_unrelated_candidate_decoy.md' },
      'USER_EDUCATION', "What is Leena's CGPA?",
    ), false, "decoy facts must not merge into the active candidate");
  });
});

// ── Issue 9: filename-role routing ──────────────────────────────────────────

describe('issue 9: glossary and formula routing', () => {
  const names = ['01_small_handout.md', '02_large_course_reader.pdf', '03_glossary.txt', '04_formula_sheet.md'];

  test('"Define communication shadow." grounds when a glossary is attached', () => {
    const r = classify('Define communication shadow.', 'technical-interview', { attachedFileNames: names });
    assert.equal(r.shouldRetrieve, true, r.reason);
    assert.ok(r.claimTypes.includes('DOCUMENT_FACT'), JSON.stringify(r.claimTypes));
  });

  test('threshold/frequency questions ground when a formula sheet is attached', () => {
    const r = classify('How does a heartbeat failure get detected?', 'technical-interview', { attachedFileNames: names });
    assert.equal(r.shouldRetrieve, true, r.reason);
  });

  test('without such files, definitions keep their general route', () => {
    const r = classify('Define communication shadow.', 'technical-interview');
    assert.equal(r.path, 'FAST', r.reason);
  });
});

// ── Audit follow-ups (2026-08-01 post-commit review) ────────────────────────
// Two HIGH findings from the read-only audit of commits a1bc7152/9a5b9ab2:
// (1) the named-file sort tier sat above status precedence and re-inverted
//     the issue-4 fix on any incidental filename-token match;
// (2) the aboutAssistant speech verbs swallowed behavioral interview
//     questions, which address the CANDIDATE as "you".

describe('audit: named-file targeting cannot re-invert status precedence', () => {
  const registry = {
    sourceTypes: new Map([['cur', 'PROJECT_FILE'], ['old', 'PROJECT_FILE']]),
    activeVersions: new Map([['cur', 'v1'], ['old', 'v1']]),
    chunkVersions: new Map([['cur', 'v1'], ['old', 'v1']]),
    sourceScopes: new Map([['cur', { userId: 'u' }], ['old', { userId: 'u' }]]),
  };
  // The archived file shares ONE incidental token ("pricing") with the
  // question; the current document's name shares none. That must not be
  // an "explicit file reference".
  const chunks = [
    { sourceId: 'old', fileName: 'pricing-archive-2023.pdf', text: 'Team plan costs $299 per month.', chunkIndex: 0, score: 0.5, metadata: { documentStatus: 'archived' } },
    { sourceId: 'cur', fileName: 'Q3 Plan.pdf', text: 'Team plan costs $499 per month.', chunkIndex: 0, score: 0.9, metadata: { documentStatus: 'current' } },
  ];
  // technical-interview (not sales) — mode is an incidental fixture here.
  const decisionFor = (q) => decide({
    requestId: 'p', requestSequence: 1, surface: 'manual_chat', modeId: 'technical-interview',
    scope: { userId: 'u', modeId: 'technical-interview' }, sessionId: 's', manualQuestion: q,
  });

  test('a single incidental filename token cannot resurrect a retired document', async () => {
    const port = createLegacyRetrievalPort({ registry, retrieve: async () => chunks });
    const { evidence } = await port.retrieve({ decision: decisionFor('What is our pricing?') });
    assert.ok(evidence.length >= 2, evidence.map((e) => e.sourceId).join(','));
    assert.equal(evidence[0].sourceId, 'cur',
      `archived file outranked current via filename: ${evidence.map((e) => e.sourceId).join(',')}`);
  });

  test('NON-REGRESSION: a genuinely named file (>=2 distinctive tokens) still leads', async () => {
    const port = createLegacyRetrievalPort({ registry, retrieve: async () => chunks });
    const { evidence } = await port.retrieve({ decision: decisionFor('What price is in the pricing archive?') });
    assert.equal(evidence[0].sourceId, 'old', evidence.map((e) => e.sourceId).join(','));
  });
});

describe('audit: behavioral interview questions are candidate questions', () => {
  test('"Tell me about a time you said no to a stakeholder." grounds in candidate history', () => {
    const r = classify('Tell me about a time you said no to a stakeholder.', 'technical-interview');
    assert.ok(!r.claimTypes.includes('GENERAL_TECHNICAL') || r.requiredSourceTypes.includes('RESUME'),
      `behavioral question read as assistant meta: ${JSON.stringify(r.claimTypes)} (${r.reason})`);
    assert.ok(r.requiredSourceTypes.includes('RESUME'), JSON.stringify(r.requiredSourceTypes));
  });

  test('"Tell me about a time you refused a request from your manager." is not assistant meta', () => {
    const r = classify('Tell me about a time you refused a request from your manager.', 'technical-interview');
    assert.ok(r.requiredSourceTypes.includes('RESUME'), JSON.stringify(r.requiredSourceTypes));
  });

  test('"Why did you say you left Google?" keeps its motivation claim', () => {
    const r = classify('Why did you say you left Google?', 'technical-interview');
    assert.ok(r.claimTypes.includes('USER_MOTIVATION'), JSON.stringify(r.claimTypes));
  });

  test('NON-REGRESSION: bare assistant meta stays meta', () => {
    for (const [mode, q] of [
      ['technical-interview', 'Why did you refuse?'],
      ['technical-interview', 'Why did you refuse to answer my question?'],
      ['technical-interview', 'You answered that wrong.'],
    ]) {
      const r = classify(q, mode);
      assert.ok(!r.claimTypes.some((c) => c.startsWith('USER_')),
        `"${q}" → ${JSON.stringify(r.claimTypes)}`);
    }
  });

  test('"What did you just say?" is assistant meta, not an employment lookup', () => {
    const r = classify('What did you just say?', 'technical-interview');
    assert.ok(!r.claimTypes.includes('USER_EMPLOYMENT'), JSON.stringify(r.claimTypes));
  });
});
