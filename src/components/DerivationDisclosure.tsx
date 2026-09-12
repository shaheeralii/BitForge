import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DerivationDisclosureProps {
  /** The always-visible bar content (icon, title, subtitle, badges, etc). */
  bar: React.ReactNode;
  /** The collapsible body — the actual step list / trace tables. */
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
  const contentId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
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
        <div className="overflow-hidden min-h-0">{children}</div>
      </div>
    </div>
  );
};
