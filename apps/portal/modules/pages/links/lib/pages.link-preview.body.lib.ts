/**
 * Reads at most `limit` bytes and stops pulling from the source after that, so a huge or endless
 * response never lands in memory. The cut may split a character; the decoder replaces it.
 */
export const readTextUpToLimit = async (chunks: AsyncIterable<Uint8Array>, limit: number): Promise<string> => {
  const kept: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of chunks) {
    const room = limit - total;
    kept.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
    total += Math.min(chunk.length, room);
    if (total >= limit) break;
  }
  return new TextDecoder().decode(Buffer.concat(kept));
};
