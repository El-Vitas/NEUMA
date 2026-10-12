/** The clipboard is absent on insecure pages (plain HTTP on a LAN address) and accessing it throws. */
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!('clipboard' in navigator)) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
