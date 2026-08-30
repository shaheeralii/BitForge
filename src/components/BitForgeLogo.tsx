import React from 'react';

interface BitForgeLogoProps {
  className?: string;
}

/**
 * The BitForge mark: a blocky "B" monogram (built from rectangular strokes,
 * echoing the app's own bit/pixel theme) with a flag-shaped "F" accent,
 * scattered bit pixels, and an anvil base, on a dark rounded plate. Pure
 * flat fills — no filters or blur — so it stays crisp and cheap to render
 * from favicon size up to the header.
 */
export const BitForgeLogo: React.FC<BitForgeLogoProps> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    role="img"
    aria-label="BitForge logo"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="bitforge-plate" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0A3324" />
        <stop offset="1" stopColor="#072818" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="96" height="96" rx="22" fill="url(#bitforge-plate)" />
    {/* Scattered bit pixels */}
    <g fill="#D9FFF4" opacity="0.9">
      <rect x="10" y="8" width="7" height="7" rx="1" />
      <rect x="20" y="6" width="5" height="5" rx="1" />
      <rect x="8" y="19" width="6" height="6" rx="1" />
      <rect x="18" y="17" width="4" height="4" rx="1" />
      <rect x="6" y="29" width="5" height="5" rx="1" />
    </g>
    {/* Anvil base */}
    <polygon points="28,86 76,86 66,95 38,95" fill="#1F6B4C" />
    {/* Blocky "B", built from rectangular strokes */}
    <g fill="#34E89A">
      <rect x="24" y="20" width="9" height="60" />
      <rect x="24" y="20" width="24" height="9" />
      <rect x="41" y="20" width="9" height="25" />
      <rect x="24" y="41" width="24" height="9" />
      <rect x="41" y="41" width="11" height="39" />
      <rect x="24" y="71" width="28" height="9" />
    </g>
    {/* "F" rendered as flag/pennant shapes */}
    <g fill="#D9FFF4">
      <polygon points="58,24 84,16 84,25 64,33" />
      <polygon points="58,45 76,39 76,48 62,54" />
    </g>
    {/* Spark */}
    <path d="M84 76 L88 80 L84 84 L80 80 Z" fill="#D9FFF4" />
  </svg>
);
