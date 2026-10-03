import React, { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * How long the body stays mounted after a close, so the collapse animation
 * (`duration-300` on the region below) can finish before its content is
 * removed. A timer rather than `transitionend`: that event never fires when
 * the transition is disabled (prefers-reduced-motion) or the tab is hidden.
 */
const COLLAPSE_ANIMATION_MS = 300;
const UNMOUNT_GRACE_MS = COLLAPSE_ANIMATION_MS + 50;

/** Reduced-motion collapses instantly, so there is nothing to wait for. */
function unmountDelayMs(): number {
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduced ? 0 : UNMOUNT_GRACE_MS;
}

interface DerivationDisclosureProps {
  /** The always-visible bar content (icon, title, subtitle, badges, etc). */
  bar: React.ReactNode;
  /**
   * The collapsible body — the actual step list / trace tables. It is only
   * rendered while the disclosure is open (or finishing its close
   * animation), so pass it as a single component element
   * (`<StepList steps={…} />`) rather than an inline `.map()`: elements
   * built in the caller are created even when the body never mounts.
   */
  children: React.ReactNode;
  /** Closed by default keeps the page uncluttered; pass true to override. */
  defaultOpen?: boolean;
  className?: string;
  /** aria-label for the toggle button when the bar content isn't a plain string. */
  toggleLabel?: string;
}

/**
 * A native disclosure-widget pattern (button + aria-expanded/aria-controls)
 * used to hide the Step-by-Step Derivation panels behind a single toggle
 * bar. Closed by default so the primary tool surface isn't overwhelmed by
 * a wall of derivation math until the learner actually asks for it.
 *
 * The open/close animation uses the CSS grid-rows trick (0fr -> 1fr) rather
 * than measuring scrollHeight in JS, so it works with dynamically-changing
 * content (e.g. re-running a calculation while open) without extra effort,
 * and respects prefers-reduced-motion automatically via index.css.
 */
export const DerivationDisclosure: React.FC<DerivationDisclosureProps> = ({
  bar,
  children,
  defaultOpen = false,
  className = '',
  toggleLabel,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // Whether the body is in the tree. Follows `isOpen` immediately on open, but
  // lags it on close so the collapse animation has content to animate.
  const [isMounted, setIsMounted] = useState(defaultOpen);
  const contentId = useId();

  useEffect(() => {
    if (isOpen || !isMounted) return;
    const timer = window.setTimeout(() => setIsMounted(false), unmountDelayMs());
    return () => window.clearTimeout(timer); // re-opened before the grace period ended
  }, [isOpen, isMounted]);

  const handleToggle = () => {
    if (!isOpen) setIsMounted(true);
    setIsOpen(!isOpen);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={toggleLabel}
        className="w-full flex items-center justify-between gap-3 text-left group/disclosure"
      >
        <div className="flex-1 min-w-0">{bar}</div>
        <span
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-black/20 border border-[var(--bf-accent)]/25 text-[var(--bf-accent)] transition-colors group-hover/disclosure:bg-[var(--bf-chip)] group-hover/disclosure:border-[var(--bf-accent)]/50"
          aria-hidden="true"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      <div
        id={contentId}
        role="region"
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]'
        }`}
      >
        {isMounted && <div className="overflow-hidden min-h-0">{children}</div>}
      </div>
    </div>
  );
};
