import assert from 'node:assert/strict';
import test from 'node:test';

import { retainedRangesAfterClear } from '../scripts/rangeClear.js';

test('L5R token hover cleanup removes movement and weapon envelopes only', () => {
  const persistent = { id: 'external-module-range' };
  const ranges = [
    { id: 'l5r5e-token-movement' },
    { id: 'l5r5e-token-weapon-wakizashi' },
    persistent,
    { range: 3 },
  ];

  assert.deepEqual(retainedRangesAfterClear(ranges, { idPrefix: 'l5r5e-token-' }), [persistent]);
});

test('ordinary range cleanup continues to preserve explicitly tagged ranges', () => {
  const tagged = { id: 'external-module-range' };

  assert.deepEqual(retainedRangesAfterClear([tagged, { range: 3 }]), [tagged]);
});
