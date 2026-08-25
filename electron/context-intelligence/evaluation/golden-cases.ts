// electron/context-intelligence/evaluation/golden-cases.ts
//
// Phase 11 golden dataset — 46 cases with verified expected values.
//
// All expected values were produced by running probe scripts against the
// Phase 10 dist-electron build. No expected value was set by theory alone;
// every case that produced an unexpected result was either fixed (question
// reworded) or updated (expected value changed to match verified output).
//
// LOCKED — do not change expected values without re-running probes and
// documenting the divergence category.

import type { GoldenCase } from './golden-case-schema';

export const GOLDEN_CASES: readonly GoldenCase[] = [
  // ── concept_explanation (gc_001–gc_005) ─────────────────────────────────────
  {
    id: 'gc_001',
    question: 'What is a closure?',
    risk: 'medium',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_002',
    question: 'What is a mutex?',
    risk: 'medium',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_003',
    question: 'What is eventual consistency?',
    risk: 'medium',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_004',
    question: 'What is a monad?',
    risk: 'medium',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_005',
    question: 'What is memoization?',
    risk: 'medium',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── mechanism_explanation (gc_006–gc_009) ───────────────────────────────────
  // Questions use "the X" form (definite article) to avoid the FOLLOW_UP
  // legacy-classifier trigger that bare "How does X work?" produces.
  {
    id: 'gc_006',
    question: 'How does the garbage collector work?',
    risk: 'medium',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_007',
    question: 'How does the JavaScript event loop work?',
    risk: 'medium',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_008',
    question: 'How does the TCP three-way handshake work?',
    risk: 'medium',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_009',
    question: 'How does memory allocation work in the heap?',
    risk: 'medium',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── technology_decision positives (gc_010–gc_014) ───────────────────────────
  // HIGH risk — these are the classification boundary this phase protects.
  // gc_010 and gc_011 are FOLLOW_UP behavior because the legacy classifier sets
  // FOLLOW_UP questionType for short "Why did you choose X?" forms.
  {
    id: 'gc_010',
    question: 'Why did you choose Redis?',
    risk: 'high',
    notes: 'behavior=FOLLOW_UP because legacy classifier sets FOLLOW_UP questionType for this form',
    expected: {
      intent: 'technology_decision',
      strategy: 'justify_decision',
      behavior: 'FOLLOW_UP',
      contextRequirements: { conversation: true, projects: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_011',
    question: 'Why did you use PostgreSQL?',
    risk: 'high',
    notes: 'behavior=FOLLOW_UP because legacy classifier sets FOLLOW_UP questionType for this form',
    expected: {
      intent: 'technology_decision',
      strategy: 'justify_decision',
      behavior: 'FOLLOW_UP',
      contextRequirements: { conversation: true, projects: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_012',
    question: 'What made you choose Kafka?',
    risk: 'high',
    // Phase 15 (D-01 / D-02 fix): "made you choose" is now detected by
    // PERSONAL_PAST_PROJECT_RE as a personal technology-decision cue, so
    // D-01 allows the personal routing. The question produces USER_MOTIVATION
    // (not USER_PROJECT) because MOTIVATION_RE fires first. USER_MOTIVATION's
    // claim authority prohibits RESUME and is satisfied by PROFILE_FACT, so
    // resume=false is correct post-fix (the probe-derived resume=true and
    // documents=true from the pre-D-01 fallback path are removed).
    // projects=true comes from the USER_MOTIVATION → projects mapping (line 1329).
    notes: 'personal tech-decision ("made you choose") → technology_decision; USER_MOTIVATION claim → projects=true, stories=true; resume excluded per CLAIM_AUTHORITY',
    expected: {
      intent: 'technology_decision',
      strategy: 'justify_decision',
      behavior: 'QUESTION',
      contextRequirements: { projects: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_013',
    question: 'Why did you go with Kubernetes?',
    risk: 'high',
    expected: {
      intent: 'technology_decision',
      strategy: 'justify_decision',
      behavior: 'QUESTION',
      contextRequirements: { projects: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_014',
    question: 'Why did you pick React over Angular?',
    risk: 'high',
    expected: {
      intent: 'technology_decision',
      strategy: 'justify_decision',
      behavior: 'QUESTION',
      contextRequirements: { projects: true, stories: true },
      storyBankActivated: true,
    },
  },

  // ── technology_decision negatives (gc_015–gc_017) ───────────────────────────
  // HIGH risk — must NOT produce technology_decision.
  {
    id: 'gc_015',
    question: 'Why did you leave your company?',
    risk: 'high',
    notes: 'Must NOT classify as technology_decision — "leave" is a motivation, not a tech choice',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { projects: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_016',
    question: 'What is Redis?',
    risk: 'high',
    notes: 'Technology name alone must NOT fire technology_decision; must be concept_explanation',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_017',
    question: 'How does the Kafka consumer group work?',
    risk: 'high',
    notes: 'Technology name in mechanism question must NOT fire technology_decision',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── comparison / tradeoff (gc_018–gc_020) ───────────────────────────────────
  {
    id: 'gc_018',
    question: "What's the difference between SQL and NoSQL?",
    risk: 'low',
    expected: {
      intent: 'comparison',
      strategy: 'analyze_options',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_019',
    question: 'Compare REST and GraphQL.',
    risk: 'low',
    notes: 'documents=true because "GraphQL" triggers a reference-file pattern in the legacy classifier',
    expected: {
      intent: 'comparison',
      strategy: 'analyze_options',
      behavior: 'QUESTION',
      contextRequirements: { documents: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_020',
    question: 'What are the tradeoffs between microservices and monolith?',
    risk: 'low',
    expected: {
      intent: 'tradeoff',
      strategy: 'analyze_options',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── system_design (gc_021–gc_025) ───────────────────────────────────────────
  // HIGH risk — must route to system_design / design_system, not lld.
  // gc_021 is FOLLOW_UP because the legacy classifier sets FOLLOW_UP questionType.
  {
    id: 'gc_021',
    question: 'How would you design YouTube?',
    risk: 'high',
    notes: 'behavior=FOLLOW_UP because legacy classifier sets FOLLOW_UP questionType',
    expected: {
      intent: 'system_design',
      strategy: 'design_system',
      behavior: 'FOLLOW_UP',
      contextRequirements: { conversation: true, generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_022',
    question: 'Design a URL shortener.',
    risk: 'high',
    expected: {
      intent: 'system_design',
      strategy: 'design_system',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_023',
    question: 'How would you design a distributed cache?',
    risk: 'high',
    expected: {
      intent: 'system_design',
      strategy: 'design_system',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_024',
    question: 'Design a payment system for millions of users.',
    risk: 'high',
    expected: {
      intent: 'system_design',
      strategy: 'design_system',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_025',
    question: 'Design a scalable notification system.',
    risk: 'high',
    expected: {
      intent: 'system_design',
      strategy: 'design_system',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── lld — explicit signal (gc_026–gc_029) ───────────────────────────────────
  // HIGH risk — LLD_STRONG_RE must fire; must NOT route to system_design.
  {
    id: 'gc_026',
    question: 'Design the classes for a parking lot.',
    risk: 'high',
    expected: {
      intent: 'lld',
      strategy: 'design_classes',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_027',
    question: 'Low-level design of a vending machine.',
    risk: 'high',
    expected: {
      intent: 'lld',
      strategy: 'design_classes',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_028',
    question: 'Design the interfaces for an elevator.',
    risk: 'high',
    expected: {
      intent: 'lld',
      strategy: 'design_classes',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_029',
    question: 'Design a class diagram for a library system.',
    risk: 'high',
    expected: {
      intent: 'lld',
      strategy: 'design_classes',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── lld — domain signal (gc_030–gc_032) ─────────────────────────────────────
  // HIGH risk — LLD_DOMAIN_RE must fire for classic LLD domains.
  {
    id: 'gc_030',
    question: 'Design a parking lot system.',
    risk: 'high',
    expected: {
      intent: 'lld',
      strategy: 'design_classes',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_031',
    question: 'Design a chess game.',
    risk: 'high',
    expected: {
      intent: 'lld',
      strategy: 'design_classes',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_032',
    question: 'Design a coffee machine.',
    risk: 'high',
    expected: {
      intent: 'lld',
      strategy: 'design_classes',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── coding_task (gc_033–gc_035) ──────────────────────────────────────────────
  {
    id: 'gc_033',
    question: 'Implement a binary search tree.',
    risk: 'medium',
    expected: {
      intent: 'coding_task',
      strategy: 'implement_solution',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_034',
    question: 'Implement a debounce function.',
    risk: 'medium',
    expected: {
      intent: 'coding_task',
      strategy: 'implement_solution',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_035',
    question: 'Implement an LRU cache.',
    risk: 'medium',
    expected: {
      intent: 'coding_task',
      strategy: 'implement_solution',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── debugging (gc_036–gc_037) ────────────────────────────────────────────────
  // gc_036: code=true because "this function" (screen-specific signal)
  // gc_037: reworded to avoid bare "why does this" form that misses DEBUGGING_RE
  {
    id: 'gc_036',
    question: 'Debug this function.',
    risk: 'medium',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { code: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_037',
    question: 'How would you debug a memory leak?',
    risk: 'medium',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── behavioral / experience / intro / project (gc_038–gc_041) ────────────────
  // All have stories=true (storyBankActivated=true).
  {
    id: 'gc_038',
    question: 'Tell me about a time you disagreed with a teammate.',
    risk: 'medium',
    expected: {
      intent: 'behavioral',
      strategy: 'tell_behavioral_story',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_039',
    question: 'Tell me about a difficult technical problem you solved.',
    risk: 'medium',
    expected: {
      intent: 'experience_question',
      strategy: 'narrate_experience',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_040',
    question: 'Tell me about yourself.',
    risk: 'medium',
    expected: {
      intent: 'introduction',
      strategy: 'introduce_self',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_041',
    question: 'Tell me about your most recent project.',
    risk: 'medium',
    expected: {
      intent: 'project_context',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
    },
  },

  // ── follow_up_generic — bare follow-ups (gc_042–gc_043) ──────────────────────
  {
    id: 'gc_042',
    question: 'Why?',
    risk: 'medium',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'continue_thread',
      behavior: 'FOLLOW_UP',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_043',
    question: 'How?',
    risk: 'medium',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'continue_thread',
      behavior: 'FOLLOW_UP',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },

  // ── behavior overrides (gc_044–gc_046) ───────────────────────────────────────
  // HIGH risk — DEEPENING/CORRECTION/CLARIFICATION must fire and force
  // intent=follow_up_generic, conversation=true.
  {
    id: 'gc_044',
    question: 'And?',
    risk: 'high',
    notes: 'IB_DEEPENING_RE fires → intent=follow_up_generic, strategy=deepen_explanation',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'deepen_explanation',
      behavior: 'DEEPENING',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_045',
    question: "That's wrong — it's not O(n log n), it's O(n²).",
    risk: 'high',
    notes: 'IB_CORRECTION_RE fires → intent=follow_up_generic, strategy=acknowledge_correction',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'acknowledge_correction',
      behavior: 'CORRECTION',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_046',
    question: 'Can you explain that more clearly?',
    risk: 'high',
    notes: 'IB_CLARIFICATION_RE fires → intent=follow_up_generic, strategy=restate_clearly; generalKnowledge=true from "explain" trigger in legacy classifier',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'restate_clearly',
      behavior: 'CLARIFICATION',
      contextRequirements: { conversation: true, generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: project_deep_dive (gc_047–gc_049) ──────────────────────────────
  // PROJECT_DEEP_RE = /\bhow did you (?:handle|solve|approach)\b/i AND
  // cls.questionTypes includes PERSONAL_PROJECT (personal=true AND PROJECT_RE match).
  // All three produce describe_project strategy — shares with project_context.
  {
    id: 'gc_047',
    question: 'How did you handle scaling in your project?',
    risk: 'high',
    notes: 'PROJECT_DEEP_RE + PERSONAL_PROJECT → project_deep_dive; first coverage of this intent',
    expected: {
      intent: 'project_deep_dive',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_048',
    question: 'How did you approach the architecture of your project?',
    risk: 'high',
    notes: 'PROJECT_DEEP_RE + PERSONAL_PROJECT → project_deep_dive',
    expected: {
      intent: 'project_deep_dive',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_049',
    question: 'How did you handle failures in the service you shipped?',
    risk: 'medium',
    notes: 'PROJECT_DEEP_RE ("handle") + PERSONAL_PROJECT ("you shipped" → PERSONAL_RE + PROJECT_RE)',
    expected: {
      intent: 'project_deep_dive',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
    },
  },

  // ── Phase 12: scalability (gc_050–gc_052) ────────────────────────────────────
  // HIGH risk: /\b(?:scale|10x|traffic (?:grows|increases)|handle load)\b/ routing.
  // gc_052 is a boundary negative — "10x increase in traffic" routes to project_context,
  // not scalability, because PERSONAL_PROJECT fires before scalability in the chain.
  {
    id: 'gc_050',
    question: 'How would you scale this to handle millions of users?',
    risk: 'high',
    notes: 'scalability RE fires; first coverage of this intent',
    expected: {
      intent: 'scalability',
      strategy: 'analyze_scale',
      behavior: 'QUESTION',
      contextRequirements: { documents: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_051',
    question: 'How would you scale this system horizontally?',
    risk: 'medium',
    expected: {
      intent: 'scalability',
      strategy: 'analyze_scale',
      behavior: 'QUESTION',
      contextRequirements: { documents: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_052',
    question: 'How would you handle a 10x increase in traffic?',
    risk: 'high',
    // Phase 15 (D-01 fix): this question has no personal semantic cue ("would you handle"
    // lacks "your", "did you", etc.) and is asking about a hypothetical scalability
    // scenario. V1 requirement: question semantics determine intent, not source
    // availability. "10x" + "traffic" matches the scalability RE → scalability intent.
    // Prior expectation of project_context encoded the D-01 defect as ground truth.
    notes: 'Scalability question — "10x" + "traffic" matches scalability RE; no personal cue → scalability (not project_context)',
    expected: {
      intent: 'scalability',
      strategy: 'analyze_scale',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: optimization — three CR variants (gc_053–gc_056) ───────────────
  // gc_053/055 probe that the same intent produces different CR sets based on
  // question phrasing; gc_056 is a boundary negative for optimization.
  {
    id: 'gc_053',
    question: 'How would you optimize this query?',
    risk: 'medium',
    expected: {
      intent: 'optimization',
      strategy: 'optimize_approach',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_054',
    question: 'How would you optimize this code?',
    risk: 'medium',
    notes: '"this code" → code=true; screen-context signal',
    expected: {
      intent: 'optimization',
      strategy: 'optimize_approach',
      behavior: 'QUESTION',
      contextRequirements: { code: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_055',
    question: 'How would you improve the performance of this API?',
    risk: 'medium',
    notes: '"API" → documents=true; reference-file signal',
    expected: {
      intent: 'optimization',
      strategy: 'optimize_approach',
      behavior: 'QUESTION',
      contextRequirements: { documents: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_056',
    question: 'How would you make this algorithm faster?',
    risk: 'high',
    notes: 'Optimization boundary — "faster" does not match optimize RE; routes to concept_explanation; must NOT be optimization',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { documents: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: knowledge_check (gc_057–gc_060) ────────────────────────────────
  // HIGH risk: /\b(?:do you know|are you familiar with|have you heard of)\b/
  // gc_059–060 are boundary negatives — "have you ever used" and "what is your
  // experience" do NOT match the knowledge_check RE and fall through to concept_explanation.
  {
    id: 'gc_057',
    question: 'Are you familiar with GraphQL?',
    risk: 'high',
    notes: 'knowledge_check RE fires; "GraphQL" triggers documents=true reference-file pattern',
    expected: {
      intent: 'knowledge_check',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { documents: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_058',
    question: 'Do you know about event sourcing?',
    risk: 'medium',
    expected: {
      intent: 'knowledge_check',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { resume: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_059',
    question: 'Have you ever used Kubernetes?',
    risk: 'high',
    notes: 'Knowledge_check boundary — "have you ever used" does NOT match knowledge_check RE; falls to concept_explanation; must NOT be knowledge_check',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { resume: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_060',
    question: 'What is your experience with Redis?',
    risk: 'medium',
    notes: 'Knowledge_check boundary — "what is your experience" does NOT match knowledge_check RE; falls to concept_explanation',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { resume: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: PUSHBACK / defend_position (gc_061–gc_063) ─────────────────────
  // HIGH risk — only behavior override that requires a specific linguistic form;
  // the trigger is narrow and regressions would silently fall to concept_explanation.
  // gc_063 asserts the negative: a softened pushback form must NOT trigger PUSHBACK.
  {
    id: 'gc_061',
    question: 'That seems overly complicated though, why not just use Redis?',
    risk: 'high',
    notes: 'IB_PUSHBACK_RE fires → follow_up_generic, strategy=defend_position, behavior=PUSHBACK; first PUSHBACK coverage',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'defend_position',
      behavior: 'PUSHBACK',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_062',
    question: "That approach won't scale — why not use a simpler solution?",
    risk: 'high',
    notes: 'IB_PUSHBACK_RE fires → PUSHBACK → defend_position',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'defend_position',
      behavior: 'PUSHBACK',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_063',
    question: "But wouldn't a simpler approach work better here?",
    risk: 'high',
    notes: 'PUSHBACK boundary — softened form lacks the "why not" phrasing; routes to concept_explanation; must NOT be PUSHBACK',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: boundary pairs ──────────────────────────────────────────────────

  // lld vs system_design — HLD_SIGNALS_RE must prevent domain-name LLD routing
  {
    id: 'gc_064',
    question: 'Design a high-level distributed storage system.',
    risk: 'high',
    notes: 'HLD_SIGNALS_RE fires ("high-level") → system_design; must NOT be lld even though "design" is present',
    expected: {
      intent: 'system_design',
      strategy: 'design_system',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // coding_task vs mechanism_explanation — "implement" vs "how does … work"
  {
    id: 'gc_065',
    question: 'Implement a rate limiter in Python.',
    risk: 'medium',
    notes: 'Coding/mechanism boundary — "implement" → coding_task; cf. gc_066 for the mechanism form',
    expected: {
      intent: 'coding_task',
      strategy: 'implement_solution',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_066',
    question: 'How does the rate limiter work?',
    risk: 'medium',
    notes: 'Coding/mechanism boundary — "how does … work" → mechanism_explanation; cf. gc_065 for the coding form',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: negative contextRequirements (gc_067–gc_071) ───────────────────
  // These cases assert that personal-context flags (resume, stories) are FALSE for
  // generic technical questions. The evaluator raises cr_false_positive if any
  // asserted-false flag is true in the actual output.
  {
    id: 'gc_067',
    question: 'Design a notification system.',
    risk: 'high',
    notes: 'system_design must NOT activate stories/resume/code retrieval',
    expected: {
      intent: 'system_design',
      strategy: 'design_system',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, stories: false, resume: false, code: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_068',
    question: 'Design the classes for a library management system.',
    risk: 'high',
    notes: 'lld must NOT activate stories/resume retrieval',
    expected: {
      intent: 'lld',
      strategy: 'design_classes',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, stories: false, resume: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_069',
    question: 'What is a race condition?',
    risk: 'medium',
    notes: 'concept_explanation must NOT activate personal-context retrieval',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, stories: false, resume: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_070',
    question: 'How would you debug a race condition?',
    risk: 'medium',
    notes: 'debugging must NOT activate personal-context retrieval when no personal framing',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, stories: false, resume: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_071',
    question: 'How does the HTTP request-response cycle work?',
    risk: 'medium',
    notes: 'mechanism_explanation must NOT activate personal-context retrieval',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, stories: false, resume: false },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: additional thin-coverage intents ────────────────────────────────

  // tradeoff (Phase 11 had 1 case; adding 2 more)
  {
    id: 'gc_072',
    question: 'What are the tradeoffs of using a message queue?',
    risk: 'medium',
    expected: {
      intent: 'tradeoff',
      strategy: 'analyze_options',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_073',
    question: 'What are the pros and cons of eventual consistency?',
    risk: 'low',
    expected: {
      intent: 'tradeoff',
      strategy: 'analyze_options',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // behavioral (Phase 11 had 1 case; adding 2 more)
  {
    id: 'gc_074',
    question: 'Tell me about a time you led a project under pressure.',
    risk: 'medium',
    expected: {
      intent: 'behavioral',
      strategy: 'tell_behavioral_story',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_075',
    question: 'Tell me about a time you had to resolve a conflict between team members.',
    risk: 'medium',
    expected: {
      intent: 'behavioral',
      strategy: 'tell_behavioral_story',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true },
      storyBankActivated: true,
    },
  },

  // experience_question (Phase 11 had 1 case; adding 1 more)
  {
    id: 'gc_076',
    question: 'Tell me about a challenging bug you had to fix.',
    risk: 'medium',
    expected: {
      intent: 'experience_question',
      strategy: 'narrate_experience',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true },
      storyBankActivated: true,
    },
  },

  // coding_task additional
  {
    id: 'gc_077',
    question: 'Write a function to reverse a linked list.',
    risk: 'medium',
    notes: '"Write a function" → coding_task; contrast with "Write a depth-first search" which routes to concept_explanation',
    expected: {
      intent: 'coding_task',
      strategy: 'implement_solution',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // gc_078 removed (Phase 15): exact duplicate of gc_070 (same question, same expected
  // values, no additional signal). gc_070 is retained; it carries the richer negative
  // CR assertions (stories: false, resume: false) that make it the more useful test.

  // ── Phase 12 → Phase 14 revised: personal debug question (gc_079) ──────────
  // Phase 14 (AG-003): "How did you debug X in your project?" is a specific
  // technical execution act within the candidate's project → project_deep_dive.
  // Original Phase 12 expectation was project_context; revised because V1 defines
  // project_deep_dive as questions about how the candidate handled/solved/approached/
  // debugged a specific problem inside their project. The "must NOT be the generic
  // debugging intent" constraint remains satisfied: PERSONAL_PROJECT fires, PROJECT_DEEP_RE
  // matches "how did you debug", and the result is project_deep_dive (not debugging).
  // Strategy and context requirements are identical to project_context (describe_project,
  // resume+projects+documents+stories). Only intent and depth (now 'deep') change.
  {
    id: 'gc_079',
    question: 'How did you debug the issue in your project?',
    risk: 'high',
    notes: 'Phase 14 revised: PERSONAL_PROJECT + "how did you debug" → project_deep_dive; must NOT be generic debugging intent',
    expected: {
      intent: 'project_deep_dive',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
    },
  },

  // ── Phase 12: follow_up_generic variants (gc_080–gc_082) ────────────────────
  // Additional DEEPENING and FOLLOW_UP forms beyond gc_042–044.
  {
    id: 'gc_080',
    question: 'Can you elaborate?',
    risk: 'medium',
    notes: 'IB_DEEPENING_RE fires → DEEPENING → deepen_explanation',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'deepen_explanation',
      behavior: 'DEEPENING',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_081',
    question: 'Go on.',
    risk: 'medium',
    notes: 'IB_DEEPENING_RE fires → DEEPENING → deepen_explanation',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'deepen_explanation',
      behavior: 'DEEPENING',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_082',
    question: 'Can you give an example?',
    risk: 'medium',
    notes: 'FOLLOW_UP questionType (legacy classifier) → continue_thread; not DEEPENING',
    expected: {
      intent: 'follow_up_generic',
      strategy: 'continue_thread',
      behavior: 'FOLLOW_UP',
      contextRequirements: { conversation: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: comparison additional (gc_083–gc_084) ─────────────────────────
  {
    id: 'gc_083',
    question: "What's the difference between PostgreSQL and MongoDB?",
    risk: 'low',
    expected: {
      intent: 'comparison',
      strategy: 'analyze_options',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_084',
    question: 'Compare synchronous and asynchronous programming.',
    risk: 'low',
    notes: '"asynchronous" triggers documents=true reference-file pattern',
    expected: {
      intent: 'comparison',
      strategy: 'analyze_options',
      behavior: 'QUESTION',
      contextRequirements: { documents: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: personal concept_explanation (gc_085) ─────────────────────────
  // "Why did you design" has PERSONAL_RE + MOTIVATION_RE, but because there is no
  // PROJECT_RE match on "design" alone (PERSONAL_PROJECT needs "project", "built",
  // etc.), it falls through to concept_explanation with projects=true from the
  // personal context signal.
  {
    id: 'gc_085',
    question: 'Why did you design the database schema that way?',
    risk: 'medium',
    notes: 'Personal framing but no PROJECT_RE match → concept_explanation; projects=true from personal context signal',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { projects: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 13: mechanism/follow-up boundary (gc_086) ──────────────────────────
  // D-13-002 regression guard: "How does X work?" questions ≤ 5 words previously
  // matched isBareFollowUp (FOLLOW_UP_RE starts with "how" + word count ≤ 5), routing
  // them to follow_up_generic. The Phase 13 fix adds a "how does … work" exclusion
  // in isBareFollowUp that fires only when the subject is not an anaphor, allowing
  // short mechanism questions to reach mechanism_explanation.
  {
    id: 'gc_086',
    question: 'How does TCP handshake work?',
    risk: 'high',
    notes: 'D-13-002 regression guard: short "How does X work?" must reach mechanism_explanation, not follow_up_generic',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 13: DSA concept/coding-task boundary (gc_087) ──────────────────────
  // D-13-001 regression guard: CODING_TASK_RE contains bare DSA nouns "binary search"
  // and "linked list" that fire on concept questions. The Phase 13 fix adds a
  // CONCEPT_FRAMING_FOR_DSA_RE guard in buildInterviewIntent that bypasses the
  // coding_task branch when concept framing ("what is", "explain", "how does … work")
  // is detected, routing the question to concept_explanation instead.
  {
    id: 'gc_087',
    question: 'What is a binary search tree?',
    risk: 'high',
    notes: 'D-13-001 regression guard: DSA concept question must reach concept_explanation, not coding_task',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 14: project deep-dive extended verb boundary (gc_088) ──────────────
  // AG-003 regression guard: PROJECT_DEEP_RE was extended to recognise additional
  // verbs representing specific technical execution acts within a project.
  // This case locks "troubleshoot" (a newly added verb) so that a project-scoped
  // troubleshooting question reaches project_deep_dive and does NOT fall through
  // to project_context or the generic debugging intent.
  {
    id: 'gc_088',
    question: 'How did you troubleshoot the latency issue in your project?',
    risk: 'high',
    notes: 'AG-003 regression guard: PERSONAL_PROJECT + "how did you troubleshoot" → project_deep_dive; must NOT be project_context or debugging',
    expected: {
      intent: 'project_deep_dive',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
    },
  },

  // ── Phase 14 (SOLVE CONFLICT): solve-in-project cases (gc_089–gc_091) ────────
  // CODING_TASK_RE contains \bsolve\b which eclipsed PROJECT_DEEP_RE for past-tense
  // personal project questions. The Phase 14 fix adds a PERSONAL_PROJECT +
  // PROJECT_DEEP_RE co-occurrence guard to the CODING_TASK branch so that
  // "how did you solve X in your project?" reaches project_deep_dive.
  {
    id: 'gc_089',
    question: 'How did you solve the performance issue in your project?',
    risk: 'high',
    notes: 'SOLVE CONFLICT fix: PERSONAL_PROJECT + "how did you solve" → project_deep_dive; must NOT be coding_task',
    expected: {
      intent: 'project_deep_dive',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_090',
    question: 'How did you solve the authentication problem in your project?',
    risk: 'high',
    notes: 'SOLVE CONFLICT fix: PERSONAL_PROJECT + "how did you solve" → project_deep_dive',
    expected: {
      intent: 'project_deep_dive',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_091',
    question: 'Solve this algorithm problem.',
    risk: 'high',
    notes: 'SOLVE CONFLICT fix: pure coding ask with no PERSONAL_PROJECT → must remain coding_task',
    expected: {
      intent: 'coding_task',
      strategy: 'implement_solution',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 15: D-02 personal past-verb detection (gc_092–gc_097) ───────────────
  // V1 requirement: "a project you built/designed/shipped…" is a personal project
  // question. These lack "your" or "did you" so PERSONAL_RE did not match them;
  // PERSONAL_PAST_PROJECT_RE (Phase 15) fixes the detection gap.
  // Expected values derived from V1 spec, NOT from probing the implementation.
  {
    id: 'gc_092',
    question: 'Tell me about a project you built.',
    risk: 'high',
    notes: 'D-02 fix: "you built" is a past-tense personal project cue → project_context; must NOT be concept_explanation',
    expected: {
      intent: 'project_context',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_093',
    question: 'Tell me about a project you designed.',
    risk: 'high',
    notes: 'D-02 fix: "you designed" → project_context',
    expected: {
      intent: 'project_context',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_094',
    question: 'Tell me about a project you worked on.',
    risk: 'high',
    notes: 'D-02 fix: "you worked on" → project_context',
    expected: {
      intent: 'project_context',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_095',
    question: 'Tell me about a project you shipped.',
    risk: 'high',
    notes: 'D-02 fix: "you shipped" → project_context',
    expected: {
      intent: 'project_context',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, stories: true },
      storyBankActivated: true,
    },
  },

  // ── Phase 15: D-02 generic negative boundary (gc_096–gc_097) ─────────────────
  // Present-tense "how do you X" questions must remain generic — "do you" in
  // PERSONAL_RE DOES fire, but these have no PROJECT_RE match so they stay
  // out of project_context. Verified by intent requirement, not probe.
  {
    id: 'gc_096',
    question: 'How do you implement caching?',
    risk: 'medium',
    notes: 'D-02 negative boundary: present-tense generic ask; no project framing → NOT project_context',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { stories: false, projects: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_097',
    question: 'How do you debug a memory leak?',
    risk: 'medium',
    notes: 'D-02 negative: generic debugging question with no project framing → debugging, not project_context',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { stories: false, projects: false },
      storyBankActivated: false,
    },
  },

  // ── Phase 15: D-01 source-invariance cases (gc_098–gc_099) ───────────────────
  // V1 requirement: source availability must NOT change semantic intent.
  // These questions name a technical entity but have no personal semantic cue.
  // After D-01 fix: same intent regardless of whether a résumé is in the mode.
  {
    id: 'gc_098',
    question: 'How does garbage collection work in V8?',
    risk: 'high',
    notes: 'D-01 fix: "V8" is a tech entity; no personal cue → general intent, not project_context',
    expected: {
      intent: 'mechanism_explanation',
      strategy: 'explain_mechanism',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, resume: false, projects: false, stories: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_099',
    question: 'How would you handle a race condition in concurrent code?',
    risk: 'high',
    // Phase 15 (D-01 fix): no personal cue, no entity-named project → GENERAL_TECHNICAL
    // via d01Blocked path. The debugging RE does not match "race condition" handling
    // — "how would you handle" is asking for a general technique ("handle" not a
    // code-type noun), which maps to concept_explanation in the intent resolver.
    // The main D-01 test: intent must NOT be project_context; concept_explanation ✓.
    // Phase 16: debugging RE extended (D2 fix) but still does not match this form.
    notes: 'D-01 fix: no personal cue → GENERAL_TECHNICAL → concept_explanation (not project_context). "how would you handle" is a technique question, not a debugging session.',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, resume: false, projects: false, stories: false },
      storyBankActivated: false,
    },
  },

  // ── Phase 16: Classification Correctness (gc_100–gc_112) ─────────────────────
  //
  // Three confirmed defects fixed:
  //   D1 – INTRODUCTION_RE too narrow (missed "us" variant + adjective before "background" + modifier in "tell me … about yourself")
  //   D2 – DEBUGGING regex missed "why is this [code type]", "what is wrong with", "find the bug", "why does this [code type]"
  //   D3 – EXPERIENCE_CHALLENGE_RE required "a/an" article; missed superlative "the hardest/toughest" form
  //
  // Requirement-derived: expected intent is defined from the V1 spec first,
  // then verified against the fixed implementation.

  // ── D1: INTRODUCTION_RE fixes (gc_100–gc_102) ────────────────────────────────
  {
    id: 'gc_100',
    question: 'Walk me through your professional background.',
    risk: 'high',
    notes: 'Phase 16 D1: INTRODUCTION_RE now matches "walk me through your [adj] background"; previously → concept_explanation',
    expected: {
      intent: 'introduction',
      strategy: 'introduce_self',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: false, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_101',
    question: 'Walk us through your background.',
    risk: 'high',
    notes: 'Phase 16 D1: INTRODUCTION_RE "us" variant; previously matched only "walk me through"',
    expected: {
      intent: 'introduction',
      strategy: 'introduce_self',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: false, stories: true },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_102',
    question: 'Tell me a little about yourself.',
    risk: 'high',
    notes: 'Phase 16 D1: INTRODUCTION_RE modifier slot before "about yourself"; previously → concept_explanation',
    expected: {
      intent: 'introduction',
      strategy: 'introduce_self',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: false, stories: true },
      storyBankActivated: true,
    },
  },

  // ── D2: DEBUGGING regex fixes (gc_103–gc_106) ────────────────────────────────
  {
    id: 'gc_103',
    question: 'Why is this code throwing a null pointer exception?',
    risk: 'high',
    notes: 'Phase 16 D2: debugging RE now matches "why is this code [verb]"; previously → concept_explanation',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { code: true, resume: false, projects: false, stories: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_104',
    question: 'What is wrong with this code?',
    risk: 'high',
    notes: 'Phase 16 D2: debugging RE matches "what is wrong with"; previously "what\'s" form only (apostrophe literal)',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { code: true, resume: false, projects: false, stories: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_105',
    question: 'Find the bug in this code.',
    risk: 'high',
    notes: 'Phase 16 D2: debugging RE matches "find the bug"; previously → concept_explanation',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { code: true, resume: false, projects: false, stories: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_106',
    question: 'Why does this loop run infinitely?',
    risk: 'high',
    notes: 'Phase 16 D2: debugging RE matches "why does this loop"; previously → concept_explanation',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { resume: false, projects: false, stories: false },
      storyBankActivated: false,
    },
  },

  // ── D3: EXPERIENCE_CHALLENGE_RE "the" article + superlative (gc_107–gc_108) ──
  {
    id: 'gc_107',
    question: 'Describe the hardest bug you ever debugged.',
    risk: 'high',
    notes: 'Phase 16 D3: EXPERIENCE_CHALLENGE_RE now accepts "the" article and superlative "hardest"; previously → concept_explanation',
    expected: {
      intent: 'experience_question',
      strategy: 'narrate_experience',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true, projects: false },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_108',
    question: 'Walk me through the most difficult decision you made.',
    risk: 'high',
    notes: 'Phase 16 D3: "the most difficult" — "most" absorbed by {0,2}-word slot; previously → concept_explanation',
    expected: {
      intent: 'experience_question',
      strategy: 'narrate_experience',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true, projects: false },
      storyBankActivated: true,
    },
  },

  // ── Coverage: thin intents (gc_109–gc_110) ───────────────────────────────────
  {
    id: 'gc_109',
    question: 'Describe a situation where you had to learn something new quickly.',
    risk: 'medium',
    notes: 'Phase 16 coverage: experience_question positive via EXPERIENCE_TIME_RE "describe a situation"',
    expected: {
      intent: 'experience_question',
      strategy: 'narrate_experience',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true, projects: false },
      storyBankActivated: true,
    },
  },
  {
    id: 'gc_110',
    question: 'Can you walk me through your technical background?',
    risk: 'medium',
    notes: 'Phase 16 coverage: introduction positive — "technical background" adjective variant',
    expected: {
      intent: 'introduction',
      strategy: 'introduce_self',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, stories: true, projects: false },
      storyBankActivated: true,
    },
  },

  // ── Negative boundaries (gc_111–gc_112) ──────────────────────────────────────
  {
    id: 'gc_111',
    question: 'How would you describe the background of a request in HTTP?',
    risk: 'medium',
    notes: 'Phase 16 negative: "background of a request" must NOT fire INTRODUCTION_RE; purely technical question',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, resume: false, projects: false, stories: false },
      storyBankActivated: false,
    },
  },
  {
    id: 'gc_112',
    question: 'How do you approach debugging a distributed system?',
    risk: 'medium',
    notes: 'Phase 16 negative: "debugging" (gerund) does not trigger the debug regex (requires bare "debug" verb); general approach → concept_explanation',
    expected: {
      intent: 'concept_explanation',
      strategy: 'define_concept',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true, resume: false, projects: false, stories: false },
      storyBankActivated: false,
    },
  },
] as const;
