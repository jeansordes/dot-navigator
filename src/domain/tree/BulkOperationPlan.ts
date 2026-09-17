export interface BulkTarget { path: string; kind: 'file' | 'folder' }
export interface PlannedMove { from: string; to: string }
export interface MoveGroup { source: BulkTarget; moves: PlannedMove[] }

/** Only physical folders absorb their descendants during deletion. */
export function deletionRoots(targets: readonly BulkTarget[]): BulkTarget[] {
  const unique = [...new Map(targets.map(target => [target.path, target])).values()];
  return unique.filter(target => !unique.some(parent => parent !== target
    && parent.kind === 'folder' && target.path.startsWith(`${parent.path}/`)));
}

/** Coverage comes from the actual rename plan, never from the visual tree. */
export function combineMoveGroups(groups: readonly MoveGroup[], existing: ReadonlySet<string>): PlannedMove[] {
  const roots = groups.filter(group => !groups.some(parent => parent !== group && (
    (parent.source.kind === 'folder' && group.source.path.startsWith(`${parent.source.path}/`))
    || parent.moves.some(move => move.from === group.source.path && move.from !== parent.source.path)
  )));
  const moves = [...new Map(roots.flatMap(group => group.moves).map(move => [move.from, move])).values()];
  const destinations = new Set<string>();
  for (const move of moves) {
    if (existing.has(move.to) || destinations.has(move.to)) throw new Error(move.to);
    destinations.add(move.to);
    for (const group of roots) {
      if (group.source.kind === 'folder' && (move.to.startsWith(`${group.source.path}/`)
        || (move.from !== group.source.path && move.to.startsWith(`${group.moves[0]?.to}/`)))) {
        throw new Error(move.to);
      }
    }
  }
  return moves;
}
