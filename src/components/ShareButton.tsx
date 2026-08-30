import React, { useEffect, useRef, useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { shareOrCopyText, canUseWebShare } from '../utils/shareUtils';
import { useHistory } from '../context/HistoryContext';
import { HistoryEntry } from '../types';

interface ShareButtonProps {
  getText: () => string;
  shareTitle?: string;
  label?: string;
  /** Optional: log a history entry when the share/copy succeeds. */
  historyEntry?: () => Omit<HistoryEntry, 'id' | 'timestamp'>;
  className?: string;
}

/**
 * A single button that shares text via the native Web Share API when
 * available, and transparently falls back to copying to the clipboard
 * (with matching visual feedback) everywhere else.
 */
export const ShareButton: React.FC<ShareButtonProps> = ({
  getText,
  shareTitle = 'BitForge Result',
  label = 'Share',
  historyEntry,
  className = '',
}) => {
  const [status, setStatus] = useState<'idle' | 'shared' | 'copied'>('idle');
  const { addEntry } = useHistory();
  const shareCapable = canUseWebShare();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleClick = async () => {
    const result = await shareOrCopyText(getText(), shareTitle);
    if (result === 'cancelled' || result === 'failed') return;

    setStatus(result);
    if (historyEntry) addEntry(historyEntry());
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <button
      onClick={handleClick}
      title={shareCapable ? 'Share this result' : 'Copy this result (sharing isn\u2019t supported on this device)'}
      className={
        className ||
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors bg-black/20 text-[#D9FFF4]/70 hover:text-[#34E89A] border border-[#34E89A]/15 hover:border-[#34E89A]/40'
      }
    >
      {status === 'idle' && (shareCapable ? <Share2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />)}
      {status !== 'idle' && <Check className="w-3 h-3" />}
      <span>{status === 'idle' ? label : status === 'shared' ? 'Shared!' : 'Copied!'}</span>
    </button>
  );
};
