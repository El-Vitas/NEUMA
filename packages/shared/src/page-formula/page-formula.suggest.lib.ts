const MAX_SUGGESTIONS = 2;

const measureEditDistance = (left: string, right: string): number => {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = (previous[column - 1] ?? 0) + (left[row - 1] === right[column - 1] ? 0 : 1);
      current.push(Math.min(substitution, (previous[column] ?? 0) + 1, (current[column - 1] ?? 0) + 1));
    }
    previous = current;
  }
  return previous[right.length] ?? 0;
};

/** The names that differ least from what was typed, closest first, so a typo points at what was meant. */
export const suggestClosestNames = (typed: string, candidates: readonly string[]): readonly string[] => {
  const lowered = typed.toLowerCase();
  const tolerance = Math.max(2, Math.floor(typed.length / 3));
  return candidates
    .map((candidate) => ({ candidate, distance: measureEditDistance(lowered, candidate.toLowerCase()) }))
    .filter((entry) => entry.distance <= tolerance)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.candidate);
};
