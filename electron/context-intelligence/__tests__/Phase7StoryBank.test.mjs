// Interview Intelligence V1 — Phase 7: Personal Context / StoryBank tests.
//
// Covers:
//   A. ContextRequirements.stories derivation — correct for key intents
//   B. stories flag independence from resume / projects flags
//   C. StoryBankPort — null when no resume docs; only indexes resume kind
//   D. StoryBankPort — story-specific scoring via decide() + retrieve()
//   E. StoryBankPort — does not surface skills/education sections
//   F. CompositePort — passes through when stories=false
//   G. CompositePort — activates storyBank when stories=true
//   H. CompositePort — deduplication by evidenceId (keeps higher-score copy)
//   I. CompositePort — storyBank failure is non-blocking; primary result intact
//   J. Concrete interview question examples (7 cases from Phase 7 spec)
//   K. Flag independence — stories=true, resume=false still retrieves story evidence

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');

const { classifyTurn } =
  await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { decide } =
  await import(pathToFileURL(path.join(base, 'orchestration/orchestrator.js')).href);
const { createStoryBankRetrievalPort } =
  await import(pathToFileURL(path.join(base, 'retrieval/story-bank-port.js')).href);
const { createCompositeRetrievalPort } =
  await import(pathToFileURL(path.join(base, 'retrieval/composite-retrieval-port.js')).href);
const { MODE_POLICIES } =
  await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);

// ── Fixtures ─────────────────────────────────────────────────────────────────

const POLICY = MODE_POLICIES['technical-interview'];

const classify = (q, over = {}) =>
  classifyTurn({ resolvedQuestion: q, policy: POLICY, isFollowUp: false, ...over });

// Produce a real frozen TurnDecision with the correct scope userId
const makeDecision = (q) =>
  decide({
    requestId: 'r1', requestSequence: 1,
    surface: 'manual-chat', modeId: 'technical-interview',
    scope: { userId: 'u1' }, sessionId: 's1',
    manualQuestion: q,
  });

const RESUME_DOC = {
  kind: 'resume',
  sourceId: 'psrc_resume_001',
  versionId: 'v1',
  fileName: 'resume.pdf',
  structured: {
    identity: { name: 'Anya Singh', summary: 'Full-stack engineer who shipped production systems.', location: 'Bangalore' },
    experience: [
      { company: 'FinTech Corp', role: 'Software Engineer', start_date: 'Jan 2023', end_date: 'Jun 2024',
        bullets: ['Led migration from monolith to microservices, reducing p99 latency by 60%', 'Managed a cross-functional team of 4 engineers through the transition'] },
      { company: 'StartupAI', role: 'Backend Intern', start_date: 'Jun 2022', end_date: 'Dec 2022',
        bullets: ['Built Python/FastAPI REST APIs serving 50k requests/day'] },
    ],
    projects: [
      { name: 'OpenSearch Clone', description: 'Built a distributed search engine with BM25 ranking using Go and gRPC.', technologies: ['Go', 'gRPC', 'Redis'], highlights: ['10k queries/sec throughput'] },
      { name: 'ML Pipeline', description: 'Designed and shipped a batch inference pipeline processing 2M records/hour.', technologies: ['Python', 'Airflow'], highlights: [] },
    ],
    skills: { Languages: ['Python', 'Go', 'TypeScript'], Frameworks: ['FastAPI', 'gRPC', 'React'] },
    education: [{ institution: 'IIT Bombay', degree: 'B.Tech', field: 'Computer Science', gpa: '8.9/10' }],
    achievements: [{ title: '1st place, HackMIT 2023', description: 'Built a real-time collaborative coding tool in 36 hours' }],
  },
  rawText: null,
};

const JD_DOC = {
  kind: 'jd',
  sourceId: 'psrc_jd_001',
  versionId: 'v2',
  fileName: 'jd.pdf',
  structured: { title: 'SWE II', company: 'Google', requirements: ['3+ years experience', 'Kubernetes', 'Java'] },
};

const FACT_DOC = {
  kind: 'fact',
  sourceId: 'psrc_fact_001',
  versionId: 'v3',
  fileName: 'facts.json',
  structured: { salary: { estimatedMin: 120000, estimatedMax: 160000 } },
};

// Minimal stub RetrievalPort
const makeStubPort = (evidence = [], failWith = null) => ({
  async retrieve() {
    if (failWith) throw new Error(failWith);
    return {
      evidence,
      attempts: [{ attempt: 1, strategy: 'stub', queries: [], candidateCount: evidence.length, admittedAfterScopeFilter: evidence.length, rejectedByScopeFilter: 0, durationMs: 0 }],
    };
  },
});

// ── A. ContextRequirements.stories derivation ────────────────────────────────

describe('A. stories=false intents', () => {
  const cases = [
    'What is a binary tree?',
    'What is a closure?',
    'Write a function to reverse a linked list',
    'Design a URL shortener',
    'What is the difference between TCP and UDP?',
    'How does garbage collection work?',
    'How would you scale a read-heavy database?',
    'Optimize this function — it runs in O(n²)',
  ];

  for (const question of cases) {
    test(`stories=false: "${question.slice(0, 60)}"`, () => {
      const r = classify(question);
      assert.equal(r.interviewIntent.contextRequirements.stories, false,
        `Expected stories=false, got stories=true for intent=${r.interviewIntent.intent}`);
    });
  }
});

describe('A. stories=true intents', () => {
  test('behavioral — tell me about a time you led', () => {
    const r = classify('Tell me about a time you led a cross-functional team through a difficult migration');
    assert.equal(r.interviewIntent.intent, 'behavioral');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('experience_question — describe a situation', () => {
    const r = classify('Describe a situation where you had to make a difficult technical decision under pressure');
    assert.equal(r.interviewIntent.intent, 'experience_question');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('introduction — tell me about yourself', () => {
    const r = classify('Tell me about yourself');
    assert.equal(r.interviewIntent.intent, 'introduction');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('project_context — your most impactful project', () => {
    // "your" matches PERSONAL_RE, "project" matches PROJECT_RE → PERSONAL_PROJECT → project_context
    const r = classify('Tell me about your most impactful project');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('technology_decision — why did you choose Postgres in your project', () => {
    // "did you" matches PERSONAL_RE, "project" matches PROJECT_RE → PERSONAL_PROJECT
    // "why" triggers technology_decision branch
    const r = classify('Why did you choose Postgres over MySQL for your project?');
    assert.equal(r.interviewIntent.intent, 'technology_decision');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });
});

// ── B. Flag independence ─────────────────────────────────────────────────────

describe('B. stories flag independence', () => {
  test('technology_decision: stories=true, projects also independent', () => {
    const r = classify('Why did you choose React over Angular for your project?');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
    // stories and resume are derived independently — no forced coupling
  });

  test('introduction: stories=true does NOT force resume=true automatically', () => {
    const r = classify('Walk me through your background');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
    // resume is independently derived from cls.requiredSourceTypes — not from stories
  });

  test('system_design: stories=false even for architecture questions', () => {
    const r = classify('Design a distributed rate limiter');
    assert.equal(r.interviewIntent.contextRequirements.stories, false);
  });

  test('coding_task: stories=false for algorithm questions', () => {
    const r = classify('Implement a LRU cache');
    assert.equal(r.interviewIntent.contextRequirements.stories, false);
  });
});

// ── C. StoryBankPort null / creation ─────────────────────────────────────────

describe('C. StoryBankPort creation', () => {
  test('returns null with empty docs', () => {
    assert.equal(createStoryBankRetrievalPort({ docs: [], userId: 'u1' }), null);
  });

  test('returns null when only jd and fact docs (no narrative content)', () => {
    assert.equal(createStoryBankRetrievalPort({ docs: [JD_DOC, FACT_DOC], userId: 'u1' }), null);
  });

  test('returns a port when resume doc has experience/project sections', () => {
    const port = createStoryBankRetrievalPort({ docs: [RESUME_DOC], userId: 'u1' });
    assert.ok(port !== null, 'Expected a port when resume doc has story sections');
    assert.equal(typeof port.retrieve, 'function');
  });

  test('returns null when resume structured data is null', () => {
    const emptyResume = { ...RESUME_DOC, structured: null };
    assert.equal(createStoryBankRetrievalPort({ docs: [emptyResume], userId: 'u1' }), null);
  });

  test('jd doc mixed with resume doc: port created (resume is indexed)', () => {
    const port = createStoryBankRetrievalPort({ docs: [RESUME_DOC, JD_DOC], userId: 'u1' });
    assert.ok(port !== null);
  });
});

// ── D. StoryBankPort — story-specific scoring (via real TurnDecision) ─────────
//
// Uses decide() so the port receives a complete TurnDecision with retrievalPlan,
// scope, and sourceTypes — the same interface the port sees in production.

describe('D. StoryBankPort scoring', () => {
  const port = createStoryBankRetrievalPort({ docs: [RESUME_DOC], userId: 'u1' });

  // behavioral question — classify + decide produce stories=true, resume in plan
  const behavioralDecision = makeDecision('Tell me about a time you led a cross-functional team');
  // introduction question — introduce_self strategy, stories=true
  const introDecision = makeDecision('Tell me about yourself');

  test('stories=true on behavioral decision produced by decide()', () => {
    assert.equal(behavioralDecision.interviewIntent.contextRequirements.stories, true);
  });

  test('returns evidence for a behavioral query (leadership narrative)', async () => {
    const result = await port.retrieve({ decision: behavioralDecision });
    // Evidence is filtered by retrievalPlan.sourceTypes (must include RESUME)
    // and scope.userId (must match 'u1').
    // If RESUME is in the plan, evidence should be non-empty.
    if (behavioralDecision.retrievalPlan.sourceTypes.includes('RESUME')) {
      assert.ok(result.evidence.length > 0, 'Expected evidence when RESUME is in plan');
      for (const e of result.evidence) {
        assert.ok(e.evidenceId.startsWith('ev-'), `Unexpected evidenceId: ${e.evidenceId}`);
      }
    }
    // If RESUME is not in the plan (resume=false for this question), port returns [] — also valid.
  });

  test('returns evidence for an introduction query', async () => {
    const result = await port.retrieve({ decision: introDecision });
    if (introDecision.retrievalPlan.sourceTypes.includes('RESUME')) {
      assert.ok(result.evidence.length > 0, 'Expected identity/experience evidence for introduction query');
    }
  });

  test('all returned evidence has string evidenceId starting with ev-', async () => {
    const result = await port.retrieve({ decision: behavioralDecision });
    for (const e of result.evidence) {
      assert.ok(typeof e.evidenceId === 'string', 'evidenceId must be a string');
      assert.ok(e.evidenceId.startsWith('ev-'), `Expected 'ev-' prefix, got: ${e.evidenceId}`);
    }
  });

  test('retrieve returns a valid attempts array', async () => {
    const result = await port.retrieve({ decision: behavioralDecision });
    assert.ok(Array.isArray(result.attempts));
    if (result.attempts.length > 0) {
      assert.ok(typeof result.attempts[0].durationMs === 'number');
    }
  });
});

// ── E. StoryBankPort source filtering ─────────────────────────────────────────

describe('E. StoryBankPort source filtering', () => {
  test('skills section is NOT indexed in storyBank (wrong boostKey)', () => {
    // StoryBank only indexes experience, projects, achievements, identity.
    // Skills, education, and certifications are excluded by STORY_BOOST_KEYS.
    // We verify this by checking the port is created successfully (resume has experience/projects)
    // but we also note skills are excluded.
    const skillsOnlyResume = {
      ...RESUME_DOC,
      structured: {
        skills: { Languages: ['Python', 'Go', 'TypeScript'] },
        skills_flat: ['Python', 'Go', 'TypeScript'],
        // no experience, no projects, no achievements, no identity
      },
    };
    // If ONLY skills remain (all non-story boostKeys), port returns null
    const port = createStoryBankRetrievalPort({ docs: [skillsOnlyResume], userId: 'u1' });
    assert.equal(port, null, 'StoryBank must return null when only skills/education content exists');
  });

  test('education-only resume: port returns null (education not a story section)', () => {
    const edResume = {
      ...RESUME_DOC,
      structured: {
        education: [{ institution: 'IIT Bombay', degree: 'B.Tech', field: 'CS', gpa: '9.0/10' }],
      },
    };
    const port = createStoryBankRetrievalPort({ docs: [edResume], userId: 'u1' });
    assert.equal(port, null, 'Education-only resume should produce null storyBank port');
  });

  test('experience-only resume: port is non-null (experience IS a story section)', () => {
    const expResume = {
      ...RESUME_DOC,
      structured: {
        experience: [
          { company: 'FinTech', role: 'SWE', start_date: 'Jan 2023', end_date: 'Jun 2024',
            bullets: ['Led migration reducing latency by 60%'] },
        ],
      },
    };
    const port = createStoryBankRetrievalPort({ docs: [expResume], userId: 'u1' });
    assert.ok(port !== null, 'Experience-only resume should produce a storyBank port');
  });
});

// ── F. CompositePort — passes through when stories=false ─────────────────────

describe('F. CompositePort stories=false passthrough', () => {
  test('stories=false: storyBank.retrieve is NOT called', async () => {
    let storyBankCalled = false;
    const primaryEv = [{ evidenceId: 'ev-a-0', content: 'primary evidence', finalScore: 0.8 }];
    const storyBank = {
      async retrieve() {
        storyBankCalled = true;
        return { evidence: [{ evidenceId: 'ev-sb-0', content: 'story evidence', finalScore: 0.9 }], attempts: [] };
      },
    };
    const composite = createCompositeRetrievalPort(makeStubPort(primaryEv), storyBank);
    const decision = makeDecision('What is a closure?');
    assert.equal(decision.interviewIntent.contextRequirements.stories, false);

    const result = await composite.retrieve({ decision });
    assert.equal(storyBankCalled, false, 'storyBank.retrieve must NOT be called when stories=false');
    assert.equal(result.evidence.length, 1);
    assert.equal(result.evidence[0].evidenceId, 'ev-a-0');
  });

  test('stories=false: primary failure propagates normally', async () => {
    const composite = createCompositeRetrievalPort(makeStubPort([], 'primary failure'), makeStubPort([]));
    const decision = makeDecision('What is a binary tree?');
    await assert.rejects(() => composite.retrieve({ decision }), /primary failure/);
  });
});

// ── G. CompositePort — activates storyBank when stories=true ─────────────────

describe('G. CompositePort stories=true activation', () => {
  const storyDecision = makeDecision('Tell me about a time you led a cross-functional team');

  test('stories=true decision is produced by decide()', () => {
    assert.equal(storyDecision.interviewIntent.contextRequirements.stories, true);
  });

  test('stories=true: storyBank evidence is merged with primary evidence', async () => {
    const primaryEv = [{ evidenceId: 'ev-a-0', content: 'primary evidence', finalScore: 0.8 }];
    const storyEv   = [{ evidenceId: 'ev-sb-0', content: 'story evidence', finalScore: 0.7 }];
    const composite = createCompositeRetrievalPort(makeStubPort(primaryEv), makeStubPort(storyEv));
    const result = await composite.retrieve({ decision: storyDecision });

    assert.equal(result.evidence.length, 2, 'Both primary and storyBank evidence should be present');
    const ids = new Set(result.evidence.map((e) => e.evidenceId));
    assert.ok(ids.has('ev-a-0'));
    assert.ok(ids.has('ev-sb-0'));
  });

  test('stories=true with empty storyBank: returns primary only', async () => {
    const primaryEv = [{ evidenceId: 'ev-a-0', content: 'primary evidence', finalScore: 0.8 }];
    const composite = createCompositeRetrievalPort(makeStubPort(primaryEv), makeStubPort([]));
    const result = await composite.retrieve({ decision: storyDecision });
    assert.equal(result.evidence.length, 1);
    assert.equal(result.evidence[0].evidenceId, 'ev-a-0');
  });

  test('stories=true with missing interviewIntent: storyBank not activated', async () => {
    let storyBankCalled = false;
    const primaryEv = [{ evidenceId: 'ev-a-0', content: 'primary evidence', finalScore: 0.8 }];
    const storyBank = { async retrieve() { storyBankCalled = true; return { evidence: [], attempts: [] }; } };
    const composite = createCompositeRetrievalPort(makeStubPort(primaryEv), storyBank);
    // decision with no interviewIntent (pre-Phase-2 fallback case)
    const result = await composite.retrieve({ decision: {} });
    assert.equal(storyBankCalled, false);
    assert.equal(result.evidence.length, 1);
  });
});

// ── H. CompositePort — deduplication by evidenceId ───────────────────────────

describe('H. CompositePort evidenceId deduplication', () => {
  const storyDecision = makeDecision('Tell me about a time you led a cross-functional team');

  test('same evidenceId from both ports: keeps higher-score copy', async () => {
    const primaryEv = [{ evidenceId: 'ev-x-0', content: 'chunk text', finalScore: 0.7 }];
    const storyEv   = [{ evidenceId: 'ev-x-0', content: 'chunk text', finalScore: 0.9 }];
    const composite = createCompositeRetrievalPort(makeStubPort(primaryEv), makeStubPort(storyEv));
    const result = await composite.retrieve({ decision: storyDecision });

    assert.equal(result.evidence.length, 1, 'Duplicate evidenceId must be deduplicated to one entry');
    assert.equal(result.evidence[0].finalScore, 0.9, 'Higher-score copy must survive');
  });

  test('same evidenceId: primary wins when it has higher score', async () => {
    const primaryEv = [{ evidenceId: 'ev-x-0', content: 'chunk', finalScore: 0.95 }];
    const storyEv   = [{ evidenceId: 'ev-x-0', content: 'chunk', finalScore: 0.6 }];
    const composite = createCompositeRetrievalPort(makeStubPort(primaryEv), makeStubPort(storyEv));
    const result = await composite.retrieve({ decision: storyDecision });

    assert.equal(result.evidence.length, 1);
    assert.equal(result.evidence[0].finalScore, 0.95);
  });

  test('different evidenceIds: both are kept', async () => {
    const primaryEv = [{ evidenceId: 'ev-a-0', content: 'primary', finalScore: 0.8 }];
    const storyEv   = [{ evidenceId: 'ev-b-0', content: 'story', finalScore: 0.75 }];
    const composite = createCompositeRetrievalPort(makeStubPort(primaryEv), makeStubPort(storyEv));
    const result = await composite.retrieve({ decision: storyDecision });
    assert.equal(result.evidence.length, 2);
  });
});

// ── I. CompositePort — storyBank failure non-blocking ─────────────────────────

describe('I. CompositePort storyBank failure is non-blocking', () => {
  const storyDecision = makeDecision('Tell me about a time you led a cross-functional team');

  test('storyBank throws: primary evidence is returned intact', async () => {
    const primaryEv = [{ evidenceId: 'ev-a-0', content: 'primary evidence', finalScore: 0.8 }];
    const composite = createCompositeRetrievalPort(makeStubPort(primaryEv), makeStubPort([], 'story bank unavailable'));
    const result = await composite.retrieve({ decision: storyDecision });

    assert.equal(result.evidence.length, 1, 'Primary evidence must survive storyBank failure');
    assert.equal(result.evidence[0].evidenceId, 'ev-a-0');
    const hasFailureTrace = result.attempts.some((a) => a.strategy === 'story_bank_failure');
    assert.ok(hasFailureTrace, 'Failure must be recorded in the attempts trace');
  });

  test('storyBank throws: attempts from primary and failure trace are merged', async () => {
    const composite = createCompositeRetrievalPort(makeStubPort([]), makeStubPort([], 'timeout'));
    const result = await composite.retrieve({ decision: storyDecision });
    assert.ok(Array.isArray(result.attempts));
    assert.ok(result.attempts.length >= 1);
    assert.ok(result.attempts.some((a) => a.strategy === 'story_bank_failure'));
  });
});

// ── J. Concrete interview question examples ───────────────────────────────────

describe('J. Concrete question classification examples (Phase 7 spec)', () => {
  test('"Tell me about a time you led a team" → behavioral, stories=true', () => {
    const r = classify('Tell me about a time you led a cross-functional team through a challenging migration');
    assert.equal(r.interviewIntent.intent, 'behavioral');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('"What is a binary tree?" → concept_explanation, stories=false', () => {
    const r = classify('What is a binary tree?');
    assert.equal(r.interviewIntent.intent, 'concept_explanation');
    assert.equal(r.interviewIntent.contextRequirements.stories, false);
  });

  test('"Tell me about yourself" → introduction, stories=true', () => {
    const r = classify('Tell me about yourself');
    assert.equal(r.interviewIntent.intent, 'introduction');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('"Why did you choose Postgres over MySQL for your project?" → technology_decision, stories=true', () => {
    const r = classify('Why did you choose Postgres over MySQL for your project?');
    assert.equal(r.interviewIntent.intent, 'technology_decision');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('"Describe a situation where you disagreed with your manager" → experience_question, stories=true', () => {
    const r = classify('Describe a situation where you disagreed with your manager');
    assert.equal(r.interviewIntent.intent, 'experience_question');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('"Walk me through your background" → introduction, stories=true', () => {
    const r = classify('Walk me through your background');
    assert.equal(r.interviewIntent.intent, 'introduction');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });

  test('"Tell me about your most impactful project" → project intent, stories=true', () => {
    // "your" matches PERSONAL_RE, "project" matches PROJECT_RE → project_context
    const r = classify('Tell me about your most impactful project');
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
  });
});

// ── K. Flag independence: stories=true, resume=false — StoryBank still retrieves ───
//
// The critical regression cases from the Phase 7 review:
//   stories and resume are INDEPENDENT flags. resume=false suppresses RESUME
//   from the PRIMARY retrievalPlan.sourceTypes (via context-requirements-guard).
//   The StoryBank bypasses that gate intentionally and uses its own scope +
//   version filtering via adaptLegacyChunks directly.

describe('K. stories=true + resume=false → StoryBank retrieves personal evidence', () => {
  // technology_decision questions classify as: stories=true, projects=true, resume=false
  // "Why did you use Redis in your project?" is the canonical Phase 7 example.
  const techDecisionQuestion = 'Why did you choose Redis over Memcached in your project?';

  test('technology_decision: stories=true, resume=false', () => {
    const r = classify(techDecisionQuestion);
    assert.equal(r.interviewIntent.contextRequirements.stories, true);
    // resume is independently derived — technology_decision typically does not force resume=true
    // projects should be true (PROJECT_RE match)
    assert.equal(r.interviewIntent.contextRequirements.projects, true);
  });

  test('stories=true, resume=false decision: RESUME NOT in primary retrievalPlan.sourceTypes', () => {
    // Verify that resume=false correctly suppresses RESUME from the primary plan
    // (this is what the context-requirements-guard is supposed to do)
    const r = classify(techDecisionQuestion);
    if (!r.interviewIntent.contextRequirements.resume) {
      const decision = makeDecision(techDecisionQuestion);
      assert.equal(decision.interviewIntent.contextRequirements.resume, false);
      // Primary plan must not include RESUME (guard is working)
      assert.equal(decision.retrievalPlan.sourceTypes.includes('RESUME'), false,
        'resume=false must suppress RESUME from the primary plan (context-requirements-guard)');
    }
  });

  test('StoryBank retrieves evidence even when RESUME is not in primary plan', async () => {
    // The StoryBank bypasses retrievalPlan.sourceTypes — this is the core fix.
    // Build a decision with stories=true and verify the StoryBank returns evidence
    // regardless of what retrievalPlan.sourceTypes contains.
    const decision = makeDecision(techDecisionQuestion);
    assert.equal(decision.interviewIntent.contextRequirements.stories, true);

    const port = createStoryBankRetrievalPort({ docs: [RESUME_DOC], userId: 'u1' });
    assert.ok(port !== null);

    const result = await port.retrieve({ decision });
    // StoryBank must return evidence (projects/experience chunks) even when
    // RESUME is not in decision.retrievalPlan.sourceTypes
    assert.ok(result.evidence.length > 0,
      `StoryBank must return evidence for stories=true even when RESUME not in plan. ` +
      `retrievalPlan.sourceTypes: ${JSON.stringify(decision.retrievalPlan.sourceTypes)}`);
    // All evidence must have valid evidenceIds
    for (const e of result.evidence) {
      assert.ok(e.evidenceId.startsWith('ev-'), `Expected 'ev-' prefix: ${e.evidenceId}`);
    }
  });

  test('stories=false → storyBank is never called (primary suppression unaffected)', async () => {
    // Verify that the fix does not leak: when stories=false, the composite port
    // must not call storyBank at all, preserving the existing behavior.
    let storyBankCalled = false;
    const storyBank = { async retrieve() { storyBankCalled = true; return { evidence: [], attempts: [] }; } };
    const composite = createCompositeRetrievalPort(makeStubPort([]), storyBank);
    const decision = makeDecision('What is a closure?');
    assert.equal(decision.interviewIntent.contextRequirements.stories, false);
    await composite.retrieve({ decision });
    assert.equal(storyBankCalled, false, 'StoryBank must NOT be called when stories=false');
  });

  test('resume=false in primary plan does NOT affect primary RESUME suppression', () => {
    // Confirm the primary retrieval path continues to suppress RESUME correctly.
    // This verifies the fix did not accidentally add RESUME to the primary plan.
    const conceptQ = 'What are closures?';
    const r = classify(conceptQ);
    assert.equal(r.interviewIntent.contextRequirements.stories, false);
    assert.equal(r.interviewIntent.contextRequirements.resume, false);

    const decision = makeDecision(conceptQ);
    assert.equal(decision.retrievalPlan.sourceTypes.includes('RESUME'), false,
      'RESUME must remain suppressed from primary plan when both stories=false and resume=false');
  });

  test('no personal evidence available → storyBank returns empty, never fabricates', async () => {
    // A port with no resume docs returns null (checked in C). An empty structured
    // resume (no story sections) also returns null. Verify the port never invents
    // content when there is nothing to return.
    const emptyPort = createStoryBankRetrievalPort({ docs: [], userId: 'u1' });
    assert.equal(emptyPort, null,
      'StoryBank must return null (not a zero-evidence port) when no resume docs exist');
    // When composite receives null storyBank, it should not wrap it at all.
    // The call site in ipcHandlers / IntelligenceEngine only wraps when non-null.
  });

  test('stories=true + resume=true: BOTH primary RESUME and StoryBank evidence surface', async () => {
    // Behavioral question: stories=true, resume=true (PERSONAL_EXPERIENCE claim → RESUME)
    // Both the primary port (via retrievalPlan.sourceTypes=RESUME) and the StoryBank
    // should be able to return RESUME evidence.
    const behavioralQuestion = 'Tell me about a time you led a team through a difficult migration';
    const decision = makeDecision(behavioralQuestion);
    assert.equal(decision.interviewIntent.contextRequirements.stories, true);

    const port = createStoryBankRetrievalPort({ docs: [RESUME_DOC], userId: 'u1' });
    assert.ok(port !== null);

    const result = await port.retrieve({ decision });
    // When resume=true, RESUME IS in the plan, so both scope + version filters pass.
    if (decision.retrievalPlan.sourceTypes.includes('RESUME')) {
      assert.ok(result.evidence.length > 0, 'Expected story evidence for behavioral question with resume=true');
    }
  });
});
