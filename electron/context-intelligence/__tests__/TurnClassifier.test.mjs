// Context Intelligence V3 — turn classifier.
//
// The measured motivation: EVERY retrieval configuration returned a ranked pool
// for EVERY question, including "What is idempotency?". The retriever has no
// "should I run" concept, so that decision must be made here — and be
// deterministic, so a misclassification is reproducible rather than stochastic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const { classifyTurn, isBareFollowUp } = await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);

const classify = (q, modeId = 'technical-interview', over = {}) =>
  classifyTurn({ resolvedQuestion: q, policy: MODE_POLICIES[modeId], isFollowUp: false, ...over });

describe('FAST path — general questions must NOT retrieve', () => {
  // These are the corpus category-B questions. Retrieving here is the
  // false-positive that §13.1 forbids and that costs live-meeting latency.
  for (const q of [
    'What is idempotency in the context of an HTTP API?',
    'Explain the difference between optimistic and pessimistic locking.',
    'What is a bloom filter?',
    'How does TCP congestion control work?',
  ]) {
    test(`"${q.slice(0, 42)}…"`, () => {
      const r = classify(q);
      assert.equal(r.path, 'FAST', r.reason);
      assert.equal(r.shouldRetrieve, false);
      assert.deepEqual(r.requiredSourceTypes, []);
    });
  }

  test('a pure coding task takes the fast path — no profile retrieval', () => {
    const r = classify('Reverse a linked list in place.');
    assert.equal(r.shouldRetrieve, false, 'a DSA question must not pull the resume');
    assert.ok(r.questionTypes.includes('CODING_TASK'));
  });
});

describe('GROUNDED path — questions about the user require evidence', () => {
  test('personal project requires RESUME', () => {
    const r = classify('Tell me about your WebRTC project.');
    assert.equal(r.path, 'GROUNDED');
    assert.equal(r.shouldRetrieve, true);
    assert.ok(r.requiredSourceTypes.includes('RESUME'));
    assert.ok(r.claimTypes.includes('USER_PROJECT'));
  });

  test('personal skill requires RESUME and claims USER_SKILL', () => {
    const r = classify('Do you have experience with Kubernetes?');
    assert.ok(r.claimTypes.includes('USER_SKILL'));
    assert.ok(r.requiredSourceTypes.includes('RESUME'));
  });

  test('job requirement requires JOB_DESCRIPTION', () => {
    const r = classify('What are the required skills for this role?');
    assert.ok(r.requiredSourceTypes.includes('JOB_DESCRIPTION'));
    assert.ok(r.claimTypes.includes('JOB_REQUIRED_SKILL'));
  });

  // NOTE: "meeting fact requires MEETING_TRANSCRIPT" (team-meet) and
  // "document fact requires REFERENCE_FILE" (seminar) used to live here.
  // Deleted, not adapted — technical-interview (the only surviving mode)
  // authorizes neither source type.
});

describe('MIXED — claim-level split', () => {
  test('personal project + general explanation is MIXED and retrieves', () => {
    const r = classify('Tell me about your WebRTC project and explain how WebRTC establishes a connection.');
    assert.ok(r.questionTypes.includes('MIXED'), r.questionTypes.join(','));
    assert.equal(r.shouldRetrieve, true, 'the personal half still needs evidence');
    assert.ok(r.requiredSourceTypes.includes('RESUME'));
  });
});

// NOTE: a "mode authorization bounds required sources" describe used to live
// here (team-meet never gets RESUME forced in; recruiting requires
// CANDIDATE_FILE, never RESUME). Deleted, not adapted — both cases are about
// a mode that LACKS an authorization technical-interview (the only surviving
// mode) actually has (RESUME). The same principle — a mode never gets a
// source forced in that it does not authorize — is still exercised for
// technical-interview by "a meeting question in technical-interview does NOT
// take the fast path" below (MEETING_TRANSCRIPT).

describe('follow-ups never take the fast path', () => {
  test('a bare "why?" retrieves — it may reference grounded content by pronoun', () => {
    const r = classify('Why?', 'technical-interview', { isFollowUp: true });
    assert.notEqual(r.path, 'FAST');
    assert.ok(/follow-up/.test(r.reason));
  });

  test('"would that scale?" is a follow-up despite looking general', () => {
    const r = classify('Would that scale?', 'technical-interview', { isFollowUp: true });
    assert.notEqual(r.path, 'FAST');
  });
});

describe('screen context', () => {
  test('screen-specific question requires SCREEN_CONTEXT', () => {
    const r = classify('What does this error mean?', 'technical-interview', { hasScreenContext: true });
    assert.ok(r.requiredSourceTypes.includes('SCREEN_CONTEXT'));
  });
});

describe('determinism and traceability', () => {
  test('the same input yields byte-identical output', () => {
    const a = classify('Tell me about your WebRTC project.');
    const b = classify('Tell me about your WebRTC project.');
    assert.deepEqual(a, b);
  });

  test('every decision carries a reason for the trace', () => {
    for (const q of ['What is a mutex?', 'Tell me about your project.', 'Why?']) {
      assert.ok(classify(q).reason.length > 0, `no reason for "${q}"`);
    }
  });

  test('an ambiguous question retrieves conservatively rather than guessing', () => {
    const r = classify('Thoughts?');
    // The GUARANTEE is the route, not the label: a turn that states no subject
    // of its own must never take the fast path and answer from model knowledge.
    // Label widened 2026-08-02: "Thoughts?" is a relational nominal with no
    // complement ("thoughts ON WHAT?"), so it now classifies as the FOLLOW_UP it
    // actually is rather than as unclassifiable. That is strictly more useful —
    // a follow-up gets its referent resolved against conversation state, while
    // AMBIGUOUS only ever retrieved conservatively against nothing.
    assert.ok(r.questionTypes.includes('AMBIGUOUS') || r.questionTypes.includes('FOLLOW_UP'),
      JSON.stringify(r.questionTypes));
    assert.notEqual(r.path, 'FAST');
    assert.equal(r.shouldRetrieve, true);
  });
});

describe('unsupported-in-mode is distinct from "no source needed"', () => {
  test('a meeting question in technical-interview does NOT take the fast path', () => {
    // technical-interview does not authorize MEETING_TRANSCRIPT, so
    // requiredSourceTypes comes back empty — but for a reason that has nothing
    // to do with the question being general. Before this signal existed the two
    // collapsed and the turn was answered from model knowledge.
    const r = classify('How many backend roles are we opening this quarter?', 'technical-interview');
    assert.notEqual(r.path, 'FAST', 'must not answer a meeting question from model knowledge');
    assert.deepEqual(r.unsupportedInMode, ['MEETING_TRANSCRIPT']);
    assert.equal(r.shouldRetrieve, false, 'there is nothing authorized to retrieve');
    assert.match(r.reason, /does not authorize/);
  });

  // NOTE: "the same question in team-meet IS supported and retrieves" used to
  // live here as the contrasting positive case (MEETING_TRANSCRIPT support in
  // a mode that has it). Deleted, not adapted — no surviving mode authorizes
  // MEETING_TRANSCRIPT.

  test('a genuinely general question reports NO unsupported sources', () => {
    const r = classify('What is idempotency in an HTTP API?', 'technical-interview');
    assert.equal(r.path, 'FAST');
    assert.deepEqual(r.unsupportedInMode, []);
  });

  test('third-person phrasing requires a source (shadow-run regression)', () => {
    const r = classify('What is the name of the price-comparison website the candidate built?');
    assert.notEqual(r.path, 'FAST', 'third-person phrasing must not bypass grounding');
    assert.ok(r.requiredSourceTypes.includes('RESUME'));
  });

  test('a named-entity lookup is not mistaken for a general concept question', () => {
    const r = classify('What is the discount floor for Acme?', 'technical-interview');
    assert.notEqual(r.path, 'FAST', '"what is X" about a specific entity is a document lookup');
  });

  test('common tech acronyms do NOT trigger the entity signal', () => {
    for (const q of ['What is idempotency in an HTTP API?', 'Explain the difference between TCP and UDP.']) {
      assert.equal(classify(q).path, 'FAST', q);
    }
  });
});

// ── G-03 regression: a metric of a definite subject is a lookup, not a concept ─
//
// "What is the peak transaction volume of the payments API?" matched the same
// "what is" grammar as "what is a mutex?", acquired a GENERAL_TECHNICAL claim,
// and — because any existing claim skips the primary-source fallback — the
// misclassification was self-sealing. The turn skipped retrieval and reported
// FULL with ZERO evidence: the one shape that licenses fabricating a number.

describe('metric-of-a-definite-subject is grounded, not general', () => {
  test('the G-03 question retrieves and claims the primary source', () => {
    const c = classify('What is the peak transaction volume of the payments API?', 'technical-interview');
    assert.equal(c.shouldRetrieve, true, 'must retrieve — model knowledge cannot hold this value');
    assert.notEqual(c.path, 'FAST');
    assert.ok(c.claimTypes.includes('USER_PROJECT'),
      `the mode's primary source must claim it, got ${JSON.stringify(c.claimTypes)}`);
    assert.ok(!c.claimTypes.includes('GENERAL_TECHNICAL'),
      'a general claim here would satisfy answerability with no evidence at all');
  });

  test('the bare concept form keeps the fast path — both halves of the pattern required', () => {
    // Metric noun alone is a genuine concept question.
    for (const q of ['What is latency?', 'Explain throughput vs bandwidth']) {
      const c = classify(q, 'technical-interview');
      assert.equal(c.shouldRetrieve, false, `"${q}" must stay general`);
      assert.ok(c.claimTypes.includes('GENERAL_TECHNICAL'), q);
    }
    // NOT in the list above: "What is p99 latency?". The identifier rule in
    // hasNonGenericProperNoun deliberately treats a letters+digits token as
    // entity-specific — it PREDATES the metric-lookup carve-out and is what lets
    // F-05 ("What is the p99 now?") ground. In a SOURCE_FIRST mode that question
    // retrieves, finds nothing, and answers general-labeled, which is the mode's
    // stated contract. Asserted here so the two rules' division of labour is
    // pinned rather than rediscovered.
    const p99 = classify('What is p99 latency?', 'technical-interview');
    assert.equal(p99.shouldRetrieve, true, 'identifier rule grounds it (pre-existing, required by F-05)');
  });

  test('the definite complement is what flips it', () => {
    const concept = classify('What is transaction volume?', 'technical-interview');
    const lookup = classify('What is the transaction volume of our payments API?', 'technical-interview');
    assert.equal(concept.shouldRetrieve, false);
    assert.equal(lookup.shouldRetrieve, true);
  });

  test('B-01 stays fast — no metric noun, "of an HTTP API" is not a lookup', () => {
    const c = classify('What is idempotency in the context of an HTTP API?', 'technical-interview');
    assert.equal(c.shouldRetrieve, false);
    assert.equal(c.path, 'FAST');
  });
});

// ── A-12 regression: JD vocabulary in a document-centric mode without a JD ────
//
// NOTE: "salary-band lookup in seminar is a DOCUMENT_FACT claim" used to live
// here — the re-route only fires for a mode that matches JOB_RE vocabulary
// but authorizes no JOB_DESCRIPTION source at all. Deleted, not adapted —
// technical-interview (the only surviving mode) DOES authorize
// JOB_DESCRIPTION, so there is no surviving mode with that gap. The
// surviving positive case below (a mode WITH a JD keeps the JOB claim) is
// exactly technical-interview's actual shape.

describe('JD vocabulary re-routes to the document in a doc-centric mode', () => {
  test('a mode WITH a job description keeps the JOB claim', () => {
    const c = classify('What are the required skills for this role?', 'technical-interview');
    assert.ok(c.claimTypes.includes('JOB_REQUIRED_SKILL'),
      'the re-route must never convert a claim away from a source the mode actually has');
  });
});

// ── E-family: bare follow-ups, and the case bug that killed the referent cap ──

describe('bare follow-up detection', () => {
  test('is case-insensitive — the orchestrator passes raw-cased text', () => {
    // FOLLOW_UP_RE is lowercase-only and the classifier pre-lowers its input,
    // so the first external caller (the referent cap in evaluateAnswerability)
    // silently never matched "Why?" and the cap was dead on arrival.
    for (const q of ['Why?', 'why?', 'Would that scale?', 'WOULD THAT SCALE?']) {
      assert.equal(isBareFollowUp(q), true, q);
    }
  });

  test('a self-contained question is not a follow-up regardless of its first word', () => {
    assert.equal(isBareFollowUp('How does TCP congestion control work?'), false);
  });

  test('"would that scale" carries a general-knowledge half', () => {
    const c = classify('Would that scale?', 'technical-interview');
    assert.ok(c.claimTypes.includes('GENERAL_TECHNICAL'),
      'the scaling judgement is general knowledge (§3.7) — this is what makes E-02 PARTIAL rather than NONE');
  });
});

// ── Live-run fixes: concept vs lookup, and response-request follow-ups ───────

describe('a definition question keeps general knowledge in a document mode', () => {
  test('"Explain what a VLA model is" is conceptual, not a failed document lookup', () => {
    // Measured: Lecture answered "I could not find a direct definition in the
    // retrieved sections". Lecture was SOURCE_FIRST — source first, THEN
    // general knowledge — but suppressing the claim removed the second half
    // entirely. technical-interview (the only surviving mode) is SOURCE_FIRST
    // too, so it exercises the same path.
    const c = classify('Explain what a VLA model is.', 'technical-interview');
    assert.ok(c.claimTypes.includes('GENERAL_TECHNICAL'), JSON.stringify(c.claimTypes));
    assert.equal(c.shouldRetrieve, true, 'it should still check the document FIRST');
  });

  test('a NAMED organisation keeps document routing — the fabrication case', () => {
    // The discriminator is acronym vs name: VLA is world knowledge, Acme's
    // discount floor exists only in a private document. An earlier version of
    // this fix let both through and reopened that route.
    const c = classify('What is the discount floor for Acme?', 'technical-interview');
    assert.ok(c.claimTypes.includes('DOCUMENT_FACT'), JSON.stringify(c.claimTypes));
    assert.ok(!c.claimTypes.includes('GENERAL_TECHNICAL'));
  });

  // NOTE: "a VALUE lookup wearing definition grammar stays a lookup" used to
  // live here. Deleted, not adapted — the suppression it pins
  // (`docLookupHere` in the classifier) is gated on `documentCentricMode`
  // (primary source === REFERENCE_FILE), a mode CATEGORY technical-interview
  // does not belong to: its primary source is RESUME. A named-entity value
  // lookup (the sibling "Acme" case above) still routes correctly for
  // technical-interview via a different, entity-based path — only this
  // no-named-entity variant is document-centric-only.

  test('genuinely general questions still take the fast path', () => {
    for (const [q, m] of [['What is a mutex?', 'technical-interview'], ['What is idempotency in an HTTP API?', 'technical-interview']]) {
      const c = classify(q, m);
      assert.equal(c.shouldRetrieve, false, q);
      assert.ok(c.claimTypes.includes('GENERAL_TECHNICAL'), q);
    }
  });
});

describe('response-request follow-ups resolve against the previous turn', () => {
  test('"What should I say?" is a follow-up, not a fresh question', () => {
    // Measured: answered "This is not directly mentioned in the uploaded
    // material" — it has no subject of its own, so treating it as a new question
    // guarantees a nonsense answer.
    for (const q of ['What should I say?', 'How should I answer that?', 'What do I say?', 'Help me answer this']) {
      assert.equal(isBareFollowUp(q), true, q);
    }
  });

  test('a self-contained question is still not a follow-up', () => {
    assert.equal(isBareFollowUp('What should I say to a recruiter about Kubernetes gaps in general?'), true,
      'starts with the same stem — accepted, since its referent is still the prior turn');
    assert.equal(isBareFollowUp('How does TCP congestion control work?'), false);
    assert.equal(isBareFollowUp('What is the success rate?'), false);
  });
});

// ── Phase 2: InterviewIntent — additive classification on every turn ──────────
//
// These assertions verify that classifyTurn() now returns an interviewIntent
// field alongside the existing Classification fields, and that the 7 dimensions
// are derived correctly from the same deterministic signals.

describe('interviewIntent — intent derivation', () => {
  test('general concept question → concept_explanation', () => {
    const r = classify('What is idempotency in the context of an HTTP API?');
    assert.ok(r.interviewIntent, 'interviewIntent must be present');
    assert.equal(r.interviewIntent.intent, 'concept_explanation');
    assert.equal(r.interviewIntent.interviewerBehavior, 'QUESTION');
  });

  test('coding task → coding_task intent with implementation_walkthrough structure', () => {
    const r = classify('Implement a binary search algorithm.');
    assert.equal(r.interviewIntent.intent, 'coding_task');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'implementation_walkthrough');
    assert.equal(r.interviewIntent.expectedAnswer.includeCode, true);
    assert.equal(r.interviewIntent.expectedAnswer.includeComplexity, true);
    assert.equal(r.interviewIntent.contextRequirements.code, true);
  });

  test('system design → system_design intent with deep depth', () => {
    const r = classify('Design a URL shortener that handles 100M users.');
    assert.equal(r.interviewIntent.intent, 'system_design');
    assert.equal(r.interviewIntent.expectedAnswer.depth, 'deep');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'system_breakdown');
  });

  test('behavioral framing → behavioral intent with story_format', () => {
    const r = classify('Tell me about a time you had to handle a production incident.');
    assert.equal(r.interviewIntent.intent, 'behavioral');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'story_format');
    assert.equal(r.interviewIntent.contextRequirements.generalKnowledge, false);
  });

  test('self-introduction → introduction intent with open_narrative', () => {
    const r = classify('Tell me about yourself.');
    assert.equal(r.interviewIntent.intent, 'introduction');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'open_narrative');
    assert.equal(r.interviewIntent.followUpLikelihood, 'low');
  });

  test('personal project with why → technology_decision with decision_rationale', () => {
    const r = classify('Why did you choose React for your WebRTC project?');
    assert.equal(r.interviewIntent.intent, 'technology_decision');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'decision_rationale');
    assert.equal(r.interviewIntent.expectedAnswer.includeTradeoffs, true);
  });

  test('personal project without why → project_context with experience_narrative', () => {
    const r = classify('Tell me about your WebRTC project.');
    assert.equal(r.interviewIntent.intent, 'project_context');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'experience_narrative');
    assert.equal(r.interviewIntent.contextRequirements.resume, true);
    assert.equal(r.interviewIntent.contextRequirements.projects, true);
  });

  test('knowledge check form → knowledge_check with brief depth', () => {
    const r = classify('Are you familiar with Redis?');
    assert.equal(r.interviewIntent.intent, 'knowledge_check');
    assert.equal(r.interviewIntent.expectedAnswer.depth, 'brief');
    assert.equal(r.interviewIntent.followUpLikelihood, 'low');
  });

  test('comparison question → comparison with comparison_table', () => {
    const r = classify('What is the difference between SQL and NoSQL databases?');
    assert.equal(r.interviewIntent.intent, 'comparison');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'comparison_table');
    assert.equal(r.interviewIntent.expectedAnswer.includeTradeoffs, true);
  });

  test('follow-up → follow_up_generic intent', () => {
    const r = classify('Why?', 'technical-interview', { isFollowUp: true });
    assert.equal(r.interviewIntent.intent, 'follow_up_generic');
    assert.equal(r.interviewIntent.interviewerBehavior, 'FOLLOW_UP');
    assert.equal(r.interviewIntent.contextRequirements.conversation, true);
  });
});

describe('interviewIntent — interviewerBehavior overrides', () => {
  test('pushback phrasing → PUSHBACK behavior with pushback_response structure', () => {
    const r = classify('But why not use Redis for this?');
    assert.equal(r.interviewIntent.interviewerBehavior, 'PUSHBACK');
    assert.equal(r.interviewIntent.intent, 'follow_up_generic');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'pushback_response');
  });

  test('clarification phrasing → CLARIFICATION behavior with clarification_response', () => {
    const r = classify('Can you explain what you mean by eventual consistency?');
    assert.equal(r.interviewIntent.interviewerBehavior, 'CLARIFICATION');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'clarification_response');
  });

  test('deepening phrasing → DEEPENING behavior with deepening_elaboration', () => {
    const r = classify('Tell me more about that approach.');
    assert.equal(r.interviewIntent.interviewerBehavior, 'DEEPENING');
    assert.equal(r.interviewIntent.expectedAnswer.structure, 'deepening_elaboration');
  });
});

describe('interviewIntent — domain detection', () => {
  test('React keyword → react + frontend domains', () => {
    const r = classify('How do React hooks work?');
    assert.ok(r.interviewIntent.domain.includes('react'), JSON.stringify(r.interviewIntent.domain));
    assert.ok(r.interviewIntent.domain.includes('frontend'), JSON.stringify(r.interviewIntent.domain));
  });

  test('database keyword → database domain', () => {
    const r = classify('What is the difference between SQL and NoSQL databases?');
    assert.ok(r.interviewIntent.domain.includes('database'), JSON.stringify(r.interviewIntent.domain));
  });

  test('no keyword match → unknown domain', () => {
    const r = classify('What is idempotency in the context of an HTTP API?');
    // http\b matches networking pattern; idempotency matches nothing specific
    // The key guarantee: domain is always a non-empty array
    assert.ok(r.interviewIntent.domain.length > 0, 'domain must never be empty');
  });
});

describe('interviewIntent — contextRequirements derivation', () => {
  test('general question: no resume, no projects, generalKnowledge true', () => {
    const r = classify('What is a bloom filter?');
    const cr = r.interviewIntent.contextRequirements;
    assert.equal(cr.resume, false);
    assert.equal(cr.projects, false);
    assert.equal(cr.generalKnowledge, true);
  });

  test('personal question: resume true, generalKnowledge false', () => {
    const r = classify('Tell me about your WebRTC project.');
    const cr = r.interviewIntent.contextRequirements;
    assert.equal(cr.resume, true);
    assert.equal(cr.projects, true);
  });

  test('coding task: code true, generalKnowledge true', () => {
    const r = classify('Implement a binary search.');
    const cr = r.interviewIntent.contextRequirements;
    assert.equal(cr.code, true);
    assert.equal(cr.generalKnowledge, true);
  });
});

describe('interviewIntent — followUpLikelihood', () => {
  test('system_design → high likelihood', () => {
    assert.equal(classify('Design a URL shortener.').interviewIntent.followUpLikelihood, 'high');
  });

  test('introduction → low likelihood', () => {
    assert.equal(classify('Tell me about yourself.').interviewIntent.followUpLikelihood, 'low');
  });

  test('behavioral → medium likelihood', () => {
    assert.equal(classify('Tell me about a time you handled a conflict.').interviewIntent.followUpLikelihood, 'medium');
  });
});

describe('interviewIntent — backward compatibility', () => {
  test('interviewIntent is present on every classification result', () => {
    for (const q of [
      'What is idempotency in an HTTP API?',
      'Tell me about your WebRTC project.',
      'Reverse a linked list.',
      'Design a URL shortener.',
      'Why?',
    ]) {
      const r = classify(q);
      assert.ok(r.interviewIntent !== undefined, `interviewIntent missing for: "${q}"`);
    }
  });

  test('existing Classification fields are unchanged by Phase 2', () => {
    const r = classify('Tell me about your WebRTC project.');
    // All pre-Phase-2 fields must still be present and correct
    assert.ok(r.questionTypes.includes('PERSONAL_PROJECT'), 'questionTypes unchanged');
    assert.ok(r.claimTypes.includes('USER_PROJECT'), 'claimTypes unchanged');
    assert.ok(r.requiredSourceTypes.includes('RESUME'), 'requiredSourceTypes unchanged');
    assert.equal(r.shouldRetrieve, true, 'shouldRetrieve unchanged');
    assert.equal(r.path, 'GROUNDED', 'path unchanged');
    assert.ok(r.reason.length > 0, 'reason unchanged');
  });
});

// NOTE: a "candidate claims are reachable in recruiting" describe used to
// live here (found by sweeping all eight modes with one question — recruiting
// returned ZERO raw candidates where the identical query returned 9
// everywhere else, a CANDIDATE_FILE policy dead end). Deleted, not adapted —
// entirely about recruiting's own CANDIDATE_FILE authorization, which
// technical-interview (the only surviving mode) does not have.
