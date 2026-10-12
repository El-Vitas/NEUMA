/** A row the caller had just relied on is missing only when a concurrent delete won the race; name which one. */
export const requireRow = <Row>(row: Row | null, description: string): Row => {
  if (row === null) throw new Error(`${description} no longer exists`);
  return row;
};
