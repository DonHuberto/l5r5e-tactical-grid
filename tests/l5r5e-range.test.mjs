import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildL5r5eRanges,
  buildL5r5eTokenRanges,
  measureL5r5eGridFields,
  normalizeL5r5eProfile,
} from '../scripts/systems/l5r5e-range.js';

function rangeApi() {
  return {
    profileBounds(profile) {
      const minimum = Number(profile.range_min);
      const maximum = Number(profile.range_max);
      return { minimum, maximum, innerCost: minimum * 3, outerCost: maximum * 3 };
    },
    toBudget: (bands) => bands * 3,
    measurePath: (waypoints) => ({
      valid: true,
      cost: Math.abs(waypoints[1].x - waypoints[0].x) + Math.abs(waypoints[1].y - waypoints[0].y),
    }),
  };
}

test('normalizes the active grip of a weapon', () => {
  const profile = normalizeL5r5eProfile({
    type: 'weapon',
    system: {
      active_grip: 'thrown',
      range: 0,
      grip_profiles: {
        thrown: { range_min: 1, range_max: 3 },
      },
    },
  });

  assert.equal(profile.range_min, 1);
  assert.equal(profile.range_max, 3);
});

test('prefers a frozen Strike snapshot over a changed weapon grip', () => {
  const profile = normalizeL5r5eProfile({
    type: 'weapon',
    attackProfileSnapshot: { range: { minimum: 2, maximum: 4 } },
    system: {
      active_grip: 'one-handed',
      grip_profiles: { 'one-handed': { range_min: 0, range_max: 0 } },
    },
  });

  assert.equal(profile.range_min, 2);
  assert.equal(profile.range_max, 4);
});

test('builds minimum shading and maximum boundary through the core API', () => {
  const ranges = buildL5r5eRanges(
    { range: { minimum: 2, maximum: 4 } },
    rangeApi(),
    { id: 'katana', sceneDistance: 5 },
  );
  const minimum = ranges.find((range) => range.shaded);
  const maximum = ranges.find((range) => !range.shaded);

  assert.equal(minimum.range, 3);
  assert.equal(maximum.range, 12);
  assert.equal(maximum.searchDistance, 60);
  assert.equal(
    maximum.cost({
      originOffsets: [{ i: 1, j: 1 }, { i: 2, j: 2 }],
      targetOffset: { i: 3, j: 4 },
    }),
    3,
  );
});

test('does not render discrete cells on a gridless scene', () => {
  assert.deepEqual(
    buildL5r5eRanges({ range_min: 0, range_max: 3 }, rangeApi(), { gridless: true }),
    [],
  );
});

test('measures square-grid movement with two fields for a diagonal', () => {
  assert.equal(
    measureL5r5eGridFields({
      originOffsets: [{ i: 1, j: 1 }, { i: 1, j: 2 }],
      targetOffset: { i: 3, j: 4 },
    }),
    4,
  );
});

test('appends a range 0-1 weapon after three movement fields', () => {
  const ranges = buildL5r5eTokenRanges(
    [
      {
        id: 'wakizashi',
        name: 'Wakizashi',
        type: 'weapon',
        system: {
          active_grip: 'one-handed',
          grip_profiles: { 'one-handed': { range_min: 0, range_max: 1 } },
        },
      },
    ],
    { movement: 3, sceneDistance: 5 },
  );

  const movement = ranges.find((range) => range.id === 'l5r5e-token-movement');
  const weapon = ranges.find((range) => range.id.includes('wakizashi'));
  assert.equal(movement.range, 3);
  assert.equal(movement.searchDistance, 15);
  assert.equal(movement.shrink, 1);
  assert.equal(weapon.range, 4);
  assert.equal(weapon.searchDistance, 20);
  // Range 0 starts at the movement boundary, but the green range is rendered
  // first and therefore owns this overlapping cell. Only field four is red.
  assert.equal(weapon.cost({ originOffset: { i: 0, j: 0 }, targetOffset: { i: 3, j: 0 } }), 3);
  assert.equal(weapon.cost({ originOffset: { i: 0, j: 0 }, targetOffset: { i: 4, j: 0 } }), 4);
});

test('respects both ends of an appended range 2-5 bow envelope', () => {
  const [movement, weapon] = buildL5r5eTokenRanges(
    [{ name: 'Bow', range_min: 2, range_max: 5 }],
    { movement: 3 },
  );

  assert.equal(movement.range, 3);
  assert.equal(weapon.range, 8);
  assert.equal(weapon.cost({ originOffset: { i: 0, j: 0 }, targetOffset: { i: 4, j: 0 } }), Infinity);
  assert.equal(weapon.cost({ originOffset: { i: 0, j: 0 }, targetOffset: { i: 5, j: 0 } }), 5);
  assert.equal(weapon.cost({ originOffset: { i: 0, j: 0 }, targetOffset: { i: 8, j: 0 } }), 8);
});

test('caps the green movement envelope at the current remaining budget', () => {
  const [movement, weapon] = buildL5r5eTokenRanges(
    [{ name: 'Wakizashi', range_min: 0, range_max: 1 }],
    { movement: 1 },
  );

  assert.equal(movement.range, 1);
  assert.equal(weapon.range, 2);
});
