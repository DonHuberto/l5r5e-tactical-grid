/**
 * Return explicitly retained highlights after a clear request.
 * Untagged ranges are temporary and are always removed by a normal clear.
 * @param {Array} ranges
 * @param {{id?: string, idPrefix?: string}} options
 * @returns {Array}
 */
export function retainedRangesAfterClear(ranges, { id, idPrefix } = {}) {
  return ranges.filter((range) => {
    if (!range.id) return false;
    if (id != null && range.id === id) return false;
    if (idPrefix && range.id.startsWith(idPrefix)) return false;
    return true;
  });
}
