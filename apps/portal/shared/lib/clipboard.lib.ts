/**
 * Copies a text to the clipboard and says whether it got there.
 *
 * The clipboard exists only on a secure page: opened over plain HTTP, on a
 * local network address, the browser does not have one at all, and asking for
 * it throws before anything could catch the refusal. Every copy goes through
 * here so the person is told either way, and can copy by hand.
 */
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!('clipboard' in navigator)) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
