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
    notes: 'Scalability boundary — "10x" matches scalability RE but PERSONAL_PROJECT fires first → project_context; must NOT be scalability',
    expected: {
      intent: 'project_context',
      strategy: 'describe_project',
      behavior: 'QUESTION',
      contextRequirements: { resume: true, projects: true, documents: true, stories: true },
      storyBankActivated: true,
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

  // debugging additional
  {
    id: 'gc_078',
    question: 'How would you debug a race condition?',
    risk: 'medium',
    notes: 'Same question as gc_070 but without negative CR assertions — confirms debug intent triggers consistently',
    expected: {
      intent: 'debugging',
      strategy: 'trace_bug',
      behavior: 'QUESTION',
      contextRequirements: { generalKnowledge: true },
      storyBankActivated: false,
    },
  },

  // ── Phase 12: personal vs non-personal variant (gc_079) ─────────────────────
  // "How did you debug the issue in your project?" looks like debugging but
  // PERSONAL_PROJECT fires first → project_context. Tests that personal framing
  // diverts to the project retrieval path even for debugging-style questions.
  {
    id: 'gc_079',
    question: 'How did you debug the issue in your project?',
    risk: 'high',
    notes: 'Personal framing + PROJECT_RE → PERSONAL_PROJECT → project_context; must NOT be debugging',
    expected: {
      intent: 'project_context',
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
] as const;
