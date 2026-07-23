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
