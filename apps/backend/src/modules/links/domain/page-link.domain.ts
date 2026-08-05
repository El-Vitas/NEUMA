export const resolveLinkTargets = (sourcePageId: string, mentionedPageIds: readonly string[]): readonly string[] =>
  [...new Set(mentionedPageIds)].filter((targetPageId) => targetPageId !== sourcePageId);
