/**
 * Attempts to share text via the native Web Share API. Falls back to
 * copying to the clipboard when Web Share isn't available (most desktop
 * browsers) or fails for a reason other than the user cancelling.
 */
export async function shareOrCopyText(text: string, title: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }) : undefined;

  if (nav?.share) {
    try {
      await nav.share({ title, text });
      return 'shared';
    } catch (err) {
      // The user closing the native share sheet isn't a failure worth
      // falling back for — trying to copy right after would be surprising.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Any other error (e.g. share target failure): fall through to clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as Navigator & { share?: unknown }).share;
}

/**
 * Writes text to the clipboard and reports whether it actually succeeded,
 * so callers don't show "Copied!" (or log a history entry) for a write
 * that silently failed — e.g. clipboard permission denied, an insecure
 * context, or Safari's stricter user-gesture requirements.
 */
export async function copyTextSafe(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
