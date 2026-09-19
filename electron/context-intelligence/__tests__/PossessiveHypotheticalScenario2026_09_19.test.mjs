// Context Intelligence V3 — regression tests for Phase 8 aq_016 classifier fix.
//
// Root cause: "Your service handles 5K RPS... What would you do?" uses "your"
// as a narrative device to frame a hypothetical technical scenario, but
// PERSONAL_RE matched "your" and the USER_EMPLOYMENT catchall fired, claiming
// the résumé. With no evidence, noEvidenceNotice competed with analyze_scale
// strategy instructions, causing stochastic LLM resolution (voice 2/3/4 across
// three eval runs, 2026-09-19).
//
// Fix: HYPOTHETICAL_SCENARIO_RE detects "your [tech-system-noun] [...]
// what/how would you [action-verb]" and adds hypotheticalScenario to techTask,
// suppressing USER_EMPLOYMENT and routing GENERAL_TECHNICAL → FAST path.
//
// Every "hypothetical" test below would have routed USER_EMPLOYMENT before the
// fix. Every "preserve" test must still route grounded after the fix.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const { classifyTurn } = await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);

const classify = (q, modeId = 'technical-interview', over = {}) =>
  classifyTurn({ resolvedQuestion: q, policy: MODE_POLICIES[modeId], isFollowUp: false, ...over });

// ── aq_016 exact regression ───────────────────────────────────────────────────

describe('aq_016: possessive hypothetical scenario routes GENERAL_TECHNICAL/FAST', () => {
  const AQ_016 = 'Your service handles around 5,000 requests per second on a monolithic backend with a single database. Traffic is expected to grow 10x over the next quarter. What would you do?';

  test('aq_016 exact question: does NOT claim USER_EMPLOYMENT', () => {
    const r = classify(AQ_016);
    assert.ok(
      !r.claimTypes.includes('USER_EMPLOYMENT'),
      `USER_EMPLOYMENT must not fire for hypothetical scenario — got: ${JSON.stringify(r.claimTypes)}`,
    );
  });

  test('aq_016 exact question: takes FAST path (no RESUME retrieval)', () => {
    const r = classify(AQ_016);
    assert.equal(r.path, 'FAST', `expected FAST path — reason: ${r.reason}`);
    assert.equal(r.shouldRetrieve, false, 'hypothetical scenario must not retrieve RESUME');
    assert.ok(!r.requiredSourceTypes.includes('RESUME'), 'RESUME must not be required');
  });

  test('aq_016 exact question: claims GENERAL_TECHNICAL (honest FULL answerability)', () => {
    const r = classify(AQ_016);
    assert.ok(
      r.claimTypes.includes('GENERAL_TECHNICAL'),
      `GENERAL_TECHNICAL required for honest FULL trace — got: ${JSON.stringify(r.claimTypes)}`,
    );
  });

  test('aq_016 exact question: routes to scalability intent', () => {
    const r = classify(AQ_016);
    const intent = r.interviewIntent?.intent ?? r.intent;
    assert.equal(intent, 'scalability', `expected scalability intent — got: ${JSON.stringify(intent)}`);
  });
});

// ── additional hypothetical possessive scenarios ──────────────────────────────

describe('hypothetical possessive scenarios: GENERAL_TECHNICAL, not USER_EMPLOYMENT', () => {
  const HYPOTHETICAL_CASES = [
    {
      label: 'API scale',
      q: 'Your API handles 10,000 requests per second. How would you scale it?',
    },
    {
      label: 'backend traffic',
      q: 'Your backend is processing heavy traffic and response times are degrading. What would you change first?',
    },
    {
      label: 'monolith high traffic',
      q: 'Your team has a monolith handling high traffic across multiple regions. How would you scale it?',
    },
    {
      label: 'service latency',
      q: 'Your service is seeing p99 latency spike to 3 seconds under load. How would you approach the investigation?',
    },
    {
      label: 'database bottleneck',
      q: 'Your database is becoming a bottleneck at peak load. What would you prioritize?',
    },
  ];

  for (const { label, q } of HYPOTHETICAL_CASES) {
    test(`${label}: no USER_EMPLOYMENT`, () => {
      const r = classify(q);
      assert.ok(
        !r.claimTypes.includes('USER_EMPLOYMENT'),
        `USER_EMPLOYMENT must not fire for "${label}" — got: ${JSON.stringify(r.claimTypes)}`,
      );
    });

    test(`${label}: FAST path, no RESUME`, () => {
      const r = classify(q);
      assert.equal(r.path, 'FAST', `expected FAST for "${label}" — reason: ${r.reason}`);
      assert.ok(!r.requiredSourceTypes.includes('RESUME'), `RESUME must not be required for "${label}"`);
    });
  }
});

// ── preserve genuine personal-experience questions ────────────────────────────

describe('genuine personal-experience questions remain grounded (RESUME required)', () => {
  const PERSONAL_CASES = [
    {
      label: 'past-tense service ownership',
      q: 'Tell me about a service you worked on that handled 10,000 requests per second.',
    },
    {
      label: 'have-you scaling question',
      q: 'Have you personally scaled an API to 10,000 requests per second?',
    },
    {
      label: 'previous project traffic',
      q: 'In your previous project, how did you handle high traffic?',
    },
  ];

  for (const { label, q } of PERSONAL_CASES) {
    test(`${label}: still requires RESUME`, () => {
      const r = classify(q);
      assert.ok(
        r.shouldRetrieve,
        `shouldRetrieve must be true for personal question "${label}" — got: ${JSON.stringify(r)}`,
      );
      assert.ok(
        r.requiredSourceTypes.includes('RESUME'),
        `RESUME must be required for personal question "${label}" — got: ${JSON.stringify(r.requiredSourceTypes)}`,
      );
    });
  }
});
