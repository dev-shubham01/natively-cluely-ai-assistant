// Context Intelligence V3 — deterministic tests for evaluator mock evidence
// infrastructure (Phase 8 Step 9, 2026-09-19).
//
// Verifies that the buildMockEvidence pattern used in answer-quality.eval.mjs:
//   Case A — absent/empty mockEvidence → evidence = []  (existing behavior)
//   Case B — descriptor array → valid EvidenceItem[]    (new path)
//
// These tests are intentionally self-contained: they replicate the exact
// buildMockEvidence logic from the evaluator so the test file can run under
// node --test without requiring the evaluator's Gemini API guard to pass.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const { adaptLegacyChunks } = await import(pathToFileURL(path.join(base, 'retrieval/legacy-adapter.js')).href);

// Mirrors EVAL_SCOPE in answer-quality.eval.mjs.
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

// Mirrors the gate expression in the runner loop of answer-quality.eval.mjs.
function resolveEvidence(fixture) {
  return Array.isArray(fixture.mockEvidence) && fixture.mockEvidence.length > 0
    ? buildMockEvidence(fixture.mockEvidence)
    : [];
}

// ── Case A: absent/empty mockEvidence → evidence = [] ────────────────────────

describe('Case A: fixtures without mockEvidence produce evidence = []', () => {
  test('fixture with no mockEvidence field', () => {
    const fixture = { id: 'aq-a1', question: 'How does Redis work?', expectedIntent: 'mechanism_explanation' };
    assert.deepEqual(resolveEvidence(fixture), []);
  });

  test('fixture with mockEvidence: undefined', () => {
    const fixture = { id: 'aq-a2', question: 'Explain caching.', mockEvidence: undefined };
    assert.deepEqual(resolveEvidence(fixture), []);
  });

  test('fixture with mockEvidence: null', () => {
    const fixture = { id: 'aq-a3', question: 'What is a mutex?', mockEvidence: null };
    assert.deepEqual(resolveEvidence(fixture), []);
  });

  test('fixture with mockEvidence: [] (empty array)', () => {
    const fixture = { id: 'aq-a4', question: 'Define idempotency.', mockEvidence: [] };
    assert.deepEqual(resolveEvidence(fixture), []);
  });
});

// ── Case B: descriptor array → valid EvidenceItem[] ──────────────────────────

describe('Case B: mockEvidence descriptors convert to valid EvidenceItem[]', () => {
  test('one RESUME chunk → one EvidenceItem with correct shape', () => {
    const fixture = {
      id: 'aq-b1',
      mockEvidence: [
        {
          sourceId:   'mock-resume-1',
          sourceType: 'RESUME',
          text:       'Led backend platform at Verdant Systems (fictional). Scaled order-processing ' +
                      'service from 300 to 9,000 RPS using sharding and Redis caching. Reduced p99 ' +
                      'latency from 420 ms to 38 ms by introducing a write-through cache layer.',
          chunkIndex: 0,
          score:      0.92,
        },
      ],
    };
    const evidence = resolveEvidence(fixture);

    assert.equal(evidence.length, 1, 'one descriptor → one EvidenceItem');
    const item = evidence[0];
    assert.equal(item.sourceType,  'RESUME',               'sourceType preserved');
    assert.equal(item.sourceId,    'mock-resume-1',        'sourceId preserved');
    assert.equal(item.versionId,   'mock-v1',              'versionId set to MOCK_VERSION');
    assert.equal(item.trustLevel,  'untrusted_reference',  'trustLevel must be untrusted_reference');
    assert.ok(item.content.includes('Verdant Systems'),    'content carries fictional text');
    assert.ok(item.evidenceId.startsWith('ev-mock-resume-1'), 'evidenceId derives from sourceId');
    assert.ok(Array.isArray(item.authorityFor) && item.authorityFor.length > 0,
      'authorityFor is non-empty (RESUME authorizes USER_EMPLOYMENT, USER_PROJECT, USER_SKILL, …)');
    assert.equal(item.isDirectFact, true,  'retrieved text is a direct fact');
    assert.equal(item.isInferred,   false, 'retrieved text is not inferred');
    assert.equal(item.finalScore,   0.92,  'finalScore matches descriptor score');
    assert.equal(item.chunkIndex,   0,     'chunkIndex preserved');
  });

  test('one PROFILE_FACT chunk → one EvidenceItem authoritative for USER_MOTIVATION claims', () => {
    const fixture = {
      id: 'aq-b2',
      mockEvidence: [
        {
          sourceId:   'mock-profile-1',
          sourceType: 'PROFILE_FACT',
          text:       'Chose PostgreSQL over MongoDB for Verdant Orders (fictional) because the ' +
                      'checkout flow required cross-table ACID transactions that MongoDB could not ' +
                      'guarantee without application-level coordination.',
          chunkIndex: 0,
          score:      0.88,
        },
      ],
    };
    const evidence = resolveEvidence(fixture);

    assert.equal(evidence.length, 1);
    const item = evidence[0];
    assert.equal(item.sourceType,  'PROFILE_FACT');
    assert.equal(item.trustLevel,  'untrusted_reference');
    assert.ok(item.content.includes('PostgreSQL over MongoDB'));
    assert.ok(item.authorityFor.includes('USER_MOTIVATION'),
      'PROFILE_FACT must be authoritative for USER_MOTIVATION');
  });

  test('two chunks from the same source → two EvidenceItems with distinct evidenceIds', () => {
    const CHUNKS = [
      { sourceId: 'mock-resume-2', sourceType: 'RESUME', text: 'Senior engineer at Orbis Tech (fictional).', chunkIndex: 0, score: 0.95 },
      { sourceId: 'mock-resume-2', sourceType: 'RESUME', text: 'Led migration from monolith to microservices (fictional).', chunkIndex: 1, score: 0.90 },
    ];
    const fixture = { id: 'aq-b3', mockEvidence: CHUNKS };
    const evidence = resolveEvidence(fixture);

    assert.equal(evidence.length, 2, 'two chunks → two items');
    assert.notEqual(evidence[0].evidenceId, evidence[1].evidenceId, 'evidenceIds must be distinct');
    assert.equal(evidence[0].chunkIndex, 0);
    assert.equal(evidence[1].chunkIndex, 1);
  });

  test('descriptor without chunkIndex defaults to array position index', () => {
    const CHUNKS = [
      { sourceId: 'mock-resume-3', sourceType: 'RESUME', text: 'First chunk (fictional).', score: 0.8 },
      { sourceId: 'mock-resume-3', sourceType: 'RESUME', text: 'Second chunk (fictional).', score: 0.7 },
    ];
    const fixture = { id: 'aq-b4', mockEvidence: CHUNKS };
    const evidence = resolveEvidence(fixture);

    assert.equal(evidence[0].chunkIndex, 0, 'first item defaults to index 0');
    assert.equal(evidence[1].chunkIndex, 1, 'second item defaults to index 1');
  });

  test('descriptor without score defaults to 0.9', () => {
    const fixture = {
      id: 'aq-b5',
      mockEvidence: [
        { sourceId: 'mock-resume-4', sourceType: 'RESUME', text: 'No score field (fictional).', chunkIndex: 0 },
      ],
    };
    const evidence = resolveEvidence(fixture);
    assert.equal(evidence[0].finalScore, 0.9, 'absent score defaults to 0.9');
  });
});
