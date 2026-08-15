function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Normalize weapon, technique, and frozen roll profiles to the shape consumed
 * by the public L5R5e range-band API.
 */
export function normalizeL5r5eProfile(source = {}) {
  const system = source.system ?? {};
  const frozen =
    source.attackProfileSnapshot ??
    source.rollContext?.attackProfileSnapshot ??
    system.attackProfileSnapshot ??
    system.rollContext?.attackProfileSnapshot ??
    source.flags?.l5r5e?.rollContext?.attackProfileSnapshot;

  let profile = frozen ?? source.attackProfile ?? source;
  if (!frozen && source.type === 'weapon') {
    const gripId = system.active_grip ?? 'one-handed';
    const grip = system.grip_profiles?.[gripId] ?? {};
    profile = {
      ...grip,
      range_min: grip.range_min ?? 0,
      range_max: grip.range_max ?? system.range ?? 0,
    };
  } else if (!frozen && source.type === 'technique') {
    profile = system.activation?.range ?? {};
  }

  const nestedRange = profile?.range ?? {};
  const minimum = finite(
    profile?.range_min ?? profile?.rangeMin ?? profile?.minimum ?? nestedRange.minimum ?? nestedRange.min,
    0,
  );
  const maximum = finite(
    profile?.range_max ??
      profile?.rangeMax ??
      profile?.maximum ??
      nestedRange.maximum ??
      nestedRange.max ??
      minimum,
    minimum,
  );

  return {
    ...profile,
    range_min: Math.max(0, minimum),
    range_max: Math.max(Math.max(0, minimum), maximum),
  };
}

/**
 * L5R movement on a square tactical grid charges one field for an orthogonal
 * step and two fields for a diagonal step. Measuring from every occupied edge
 * cell also keeps the result correct for tokens larger than one square.
 */
export function measureL5r5eGridFields({ originOffset, originOffsets, targetOffset } = {}) {
  if (!targetOffset) return Infinity;
  const candidates = originOffsets?.length ? originOffsets : [originOffset];
  const costs = candidates.filter(Boolean).map((candidate) => {
    const di = Math.abs(finite(targetOffset.i ?? targetOffset.x) - finite(candidate.i ?? candidate.x));
    const dj = Math.abs(finite(targetOffset.j ?? targetOffset.y) - finite(candidate.j ?? candidate.y));
    return di + dj;
  });
  return costs.length ? Math.min(...costs) : Infinity;
}

function tokenRangeStyle(color) {
  return {
    color,
    alpha: 0.34,
    lineColor: color,
    lineWidth: 0,
    lineAlpha: 0,
    shrink: 1,
  };
}

/**
 * Build the hover envelope for an L5R token. Movement is shown first. Weapon
 * reach is appended to that movement budget, so a 0-1 weapon and Movement 3
 * produces a red fourth row of cells, while a 2-5 weapon produces red cells
 * from field five through field eight.
 */
export function buildL5r5eTokenRanges(
  weapons = [],
  { movement = 3, sceneDistance = 1, gridless = false } = {},
) {
  if (gridless) return [];

  const movementFields = Math.max(0, finite(movement, 3));
  const distanceScale = Math.max(1, finite(sceneDistance, 1));
  const ranges = [];

  if (movementFields > 0) {
    ranges.push({
      id: 'l5r5e-token-movement',
      label: `Movement ${movementFields}`,
      range: movementFields,
      searchDistance: movementFields * distanceScale,
      metric: `l5r5e-token-movement:${movementFields}`,
      cost: measureL5r5eGridFields,
      ...tokenRangeStyle('#18c964'),
    });
  }

  for (const [index, weapon] of Array.from(weapons).entries()) {
    const profile = normalizeL5r5eProfile(weapon);
    const minimum = movementFields + profile.range_min;
    const maximum = movementFields + profile.range_max;
    if (maximum <= 0) continue;

    const baseCost = measureL5r5eGridFields;
    ranges.push({
      id: `l5r5e-token-weapon-${weapon?.uuid ?? weapon?.id ?? index}`,
      label: `${weapon?.name ?? 'Weapon'} ${profile.range_min}-${profile.range_max}`,
      range: maximum,
      searchDistance: maximum * distanceScale,
      metric: `l5r5e-token-weapon:${minimum}:${maximum}`,
      cost: (context) => {
        const fields = baseCost(context);
        return fields < minimum ? Infinity : fields;
      },
      ...tokenRangeStyle('#e53945'),
    });
  }

  return ranges;
}

/**
 * Build visual boundaries while delegating every range-band conversion and
 * path measurement to game.l5r5e.rangeBands.
 */
export function buildL5r5eRanges(source, rangeBands, { id = 'item', sceneDistance = 1, gridless = false } = {}) {
  if (!rangeBands?.profileBounds || !rangeBands?.toBudget || !rangeBands?.measurePath || gridless) return [];

  const profile = normalizeL5r5eProfile(source);
  const bounds = rangeBands.profileBounds(profile);
  const pathCost = ({ originOffset, originOffsets, targetOffset, path } = {}) => {
    const candidates = originOffsets?.length ? originOffsets : [originOffset];
    const costs = candidates.filter(Boolean).map((candidate) => {
      const offsets = path && !originOffsets?.length ? path : [candidate, targetOffset];
      const waypoints = offsets
        .filter(Boolean)
        .map((offset) => ({ x: offset.x ?? offset.i, y: offset.y ?? offset.j }));
      if (waypoints.length < 2) return Infinity;
      const measurement = rangeBands.measurePath(waypoints);
      return measurement?.valid === false ? Infinity : Number(measurement?.cost ?? Infinity);
    });
    return costs.length ? Math.min(...costs) : Infinity;
  };

  const metric = `l5r5e:${bounds.minimum}:${bounds.maximum}`;
  const ranges = [
    {
      id: `l5r5e-${id}-maximum`,
      label: `Range ${bounds.maximum}`,
      range: bounds.outerCost,
      searchDistance: bounds.outerCost * Math.max(1, finite(sceneDistance, 1)),
      metric,
      cost: pathCost,
    },
  ];

  if (bounds.minimum > 0) {
    ranges.push({
      id: `l5r5e-${id}-minimum`,
      label: `Below Range ${bounds.minimum}`,
      range: rangeBands.toBudget(bounds.minimum - 1),
      searchDistance: bounds.innerCost * Math.max(1, finite(sceneDistance, 1)),
      metric,
      cost: pathCost,
      shaded: true,
      shadeColor: '#cc3344',
      shadeAlpha: 0.55,
      shadeCoverage: 0.45,
    });
  }

  return ranges;
}
