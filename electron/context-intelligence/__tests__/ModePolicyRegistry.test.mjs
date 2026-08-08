// Context Intelligence V3 — mode policy registry.
//
// These encode the defects the registry exists to make impossible:
//   F6  `seminar` missing from six independent mode lists
//   F8  unvalidated templateType producing a mode with no system prompt
//   §4  mode policy failing open to "mode-blind" behaviour

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const {
  MODE_POLICIES, MODE_IDS, resolveModePolicy, isModeId,
  modeAllowsSource, generalKnowledgeAllowed, UnknownModeError,
} = await import(pathToFileURL(path.resolve(
  process.cwd(), 'dist-electron/electron/context-intelligence/policies/mode-policy-registry.js')).href);

describe('registry completeness', () => {
  test('contains exactly the ONE built-in mode (personal build: technical-interview only)', () => {
    assert.equal(MODE_IDS.length, 1);
    assert.ok(MODE_IDS.includes('technical-interview'));
  });

  test('every mode id has a policy — no mode can exist without one', () => {
    for (const id of MODE_IDS) {
      const p = MODE_POLICIES[id];
      assert.ok(p, `${id} has no policy`);
      assert.equal(p.id, id, `${id} policy has mismatched id`);
      assert.ok(p.version, `${id} missing version (needed for trace attribution)`);
      assert.ok(p.allowedSourceTypes.length > 0, `${id} authorizes no sources`);
      assert.ok(p.capabilityPolicy, `${id} missing capability policy`);
      assert.equal(p.retrievalPolicy.maximumAttempts, 2, `${id} must cap retrieval attempts at 2`);
    }
  });

  test('modes the brief names but which do not exist are NOT invented', () => {
    for (const absent of ['thesis', 'coding-interview', 'meeting', 'presentation', 'interview']) {
      assert.equal(isModeId(absent), false, `${absent} is not a mode in this codebase`);
    }
  });
});

describe('fail-closed resolution (F8)', () => {
  test('an unknown mode id THROWS rather than yielding an empty policy', () => {
    assert.throws(() => resolveModePolicy('not-a-mode'), UnknownModeError);
    assert.throws(() => resolveModePolicy(''), UnknownModeError);
    assert.throws(() => resolveModePolicy('GENERAL'), UnknownModeError, 'case-sensitive');
  });

  test('a known mode resolves to its policy', () => {
    assert.equal(resolveModePolicy('technical-interview').groundingPolicy, 'SOURCE_FIRST');
  });
});

describe('source authorization per mode', () => {
  test('technical-interview authorizes coding samples and screen context', () => {
    const p = MODE_POLICIES['technical-interview'];
    assert.ok(modeAllowsSource(p, 'CODING_SAMPLE'));
    assert.ok(modeAllowsSource(p, 'SCREEN_CONTEXT'));
  });

  test('no mode authorizes a source it has no priority story for', () => {
    for (const id of MODE_IDS) {
      const p = MODE_POLICIES[id];
      for (const s of Object.keys(p.sourcePriorities)) {
        assert.ok(p.allowedSourceTypes.includes(s), `${id} prioritises ${s} without authorizing it`);
      }
    }
  });
});

describe('claim evidence requirements', () => {
  test('EVERY mode requires evidence for personal, document, meeting and job claims', () => {
    for (const id of MODE_IDS) {
      const p = MODE_POLICIES[id];
      assert.equal(p.personalClaimsRequireEvidence, true, `${id}`);
      assert.equal(p.documentClaimsRequireEvidence, true, `${id}`);
      assert.equal(p.meetingClaimsRequireEvidence, true, `${id}`);
      assert.equal(p.jobClaimsRequireJdEvidence, true, `${id}`);
    }
  });

});
