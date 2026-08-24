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
    expected: {
      intent: 'technology_decision',
      strategy: 'justify_decision',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
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
] as const;
