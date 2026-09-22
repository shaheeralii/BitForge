import React, { useState } from 'react';
import { ArrowRight, Github, Bug, MessageCircle } from 'lucide-react';
import { BitForgeLogo } from './BitForgeLogo';
import { ThemeSwitcher } from './ThemeSwitcher';
import { BitCellRow } from './BitCellRow';
import { InfoDialog, InfoSection } from './InfoDialog';
import { AppMode } from './Header';
import { APP_VERSION } from '../version';
import {
  decodeAllRepresentations,
  formatValueForDisplay,
  getBitGridMeta,
} from '../utils/signedRepresentations';

const GITHUB_URL = 'https://github.com/shaheeralii/BitForge';
const ISSUES_URL = 'https://github.com/shaheeralii/BitForge/issues';

interface LandingPageProps {
  /** Navigates into the actual tool (App.tsx) with its default mode. */
  onEnterApp: () => void;
  /** Navigates into the tool with a specific mode already selected. */
  onOpenTool: (mode: AppMode) => void;
  /** Navigates into the tool with the BitForge AI chat panel already open. */
  onOpenChat: () => void;
}

/**
 * Five real tool tiles (each a genuine AppMode to route to) plus BitForge AI,
 * which isn't a mode — it's the floating chat launcher available from every
 * mode — so its tile opens the tool with the chat panel already open instead
 * of a mode. `mode: null` marks that case.
 */
const TOOLS: { n: string; title: string; body: string; mode: AppMode | null }[] = [
  { n: '01', title: 'Number Converter', body: 'Move between binary, decimal, hex and octal — with the full derivation, digit by digit.', mode: 'converter' },
  { n: '02', title: 'Bit Representation', body: "Toggle bits or type a signed value, then read it as unsigned, sign-magnitude, one's or two's complement.", mode: 'bit_representation' },
  { n: '03', title: 'Binary Operations', body: 'AND, OR, XOR, NOT and shifts, worked column by column so the logic stays visible.', mode: 'operations' },
  { n: '04', title: 'Floating Point', body: 'Take IEEE 754 apart — sign, exponent, mantissa — and watch precision behave the way it really does.', mode: 'floating_point' },
  { n: '05', title: 'Text & UTF-8', body: 'Follow a character down to its bytes, and see why encoding is never just "one byte each".', mode: 'ascii' },
  { n: '06', title: 'BitForge AI', body: 'Ask why, not just what. Every calculation it quotes is verified by BitForge itself, not guessed.', mode: null },
];

const PRINCIPLES = [
  { n: '01', title: 'Shows its working', body: 'A number that appears without explanation teaches nothing. Every result can be expanded into the steps that produced it.' },
  { n: '02', title: 'Runs on your machine', body: 'Every calculation happens in your browser. No account, no upload, no telemetry — your work never leaves the device.' },
  { n: '03', title: 'Correct at the edges', body: "\u2212128, negative zero, overflow boundaries, the gap between one's and two's complement. The cases textbooks gloss over are the ones that matter." },
  { n: '04', title: 'Quiet by design', body: 'Three themes, including a motion-free plain mode. Keyboard shortcuts throughout. Nothing blinks for attention.' },
];

/** Small reusable divider/section wrapper matching the approved sample's hairline rhythm. */
const Section: React.FC<{ id?: string; className?: string; children: React.ReactNode }> = ({ id, className = '', children }) => (
  <section id={id} className={`border-t border-[var(--bf-muted)]/20 py-20 sm:py-24 md:py-28 ${className}`}>
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7">{children}</div>
  </section>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block font-mono text-[11px] font-medium tracking-[0.18em] uppercase text-[var(--bf-accent)]/90 mb-4">
    {children}
  </span>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onOpenTool, onOpenChat }) => {
  // The hero demo's own bit pattern — deliberately independent of anything
  // happening in the actual tool (there is no tool mounted yet on this
  // route), but driven by the exact same engine, not a reimplementation.
  const [bits, setBits] = useState('11100111');
  const decoded = decodeAllRepresentations(bits);
  const gridMeta = getBitGridMeta('twos-complement', 8);

  // The landing page's own Info dialog — the exact same component the tool
  // uses, but with its own local open/close state rather than routing into
  // the tool to show it. Clicking "Privacy" from a marketing page dropping
  // you into the Number Converter with a dialog on top of it was the bug
  // this replaced: entering the tool at all is no longer part of this flow.
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [infoSection, setInfoSection] = useState<InfoSection>('about');
  const openInfo = (section: InfoSection) => {
    setInfoSection(section);
    setIsInfoOpen(true);
  };

  const handleToggleBit = (index: number) => {
    setBits(prev => {
      const arr = prev.split('');
      arr[index] = arr[index] === '0' ? '1' : '0';
      return arr.join('');
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bf-app-bg)] text-[var(--bf-text)]">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bf-app-bg)]/85 backdrop-blur-xl border-b border-[var(--bf-muted)]/20">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-7 h-16 flex items-center gap-7">
          <a href="#top" className="flex items-center gap-2.5 mr-auto">
            <BitForgeLogo className="w-7 h-7 shrink-0" />
            <span className="font-display font-semibold text-[15px] tracking-wide text-[var(--bf-heading)]">BitForge</span>
          </a>
          <nav className="hidden sm:flex items-center gap-6">
            <a href="#tools" className="text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-text)] transition-colors">Tools</a>
            <a href="#why" className="text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-text)] transition-colors">Why BitForge</a>
          </nav>
          <ThemeSwitcher />
          <button
            onClick={onEnterApp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bf-accent)] hover:bg-[var(--bf-accent-hover)] text-[var(--bf-app-bg)] font-mono text-[13px] font-bold transition-colors shrink-0"
          >
            Open BitForge
          </button>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <div className="max-w-[1080px] mx-auto px-6 sm:px-7 pt-20 sm:pt-24 pb-20">
          <Eyebrow>Interactive computer-science toolkit</Eyebrow>
          <h1 className="font-display font-bold tracking-tight text-[2.3rem] sm:text-[3.2rem] lg:text-[3.9rem] leading-[1.08] text-[var(--bf-heading)] max-w-[17ch]">
            See how computers <span className="text-[var(--bf-accent)]">actually</span> count.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[var(--bf-text)]/70 max-w-[58ch] leading-relaxed">
            BitForge turns binary, number systems and bit-level representation into something you can
            touch. Every conversion shows its working — not just the answer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={onEnterApp}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[var(--bf-accent)] hover:bg-[var(--bf-accent-hover)] text-[var(--bf-app-bg)] font-mono text-sm font-bold transition-colors"
            >
              Start exploring <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#tools"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[var(--bf-muted)]/50 hover:border-[var(--bf-accent)] text-[var(--bf-text)] hover:text-[var(--bf-accent)] font-mono text-sm font-medium transition-colors"
            >
              See the tools
            </a>
          </div>

          {/* Live demo console */}
          <div className="mt-16 rounded-2xl border border-[var(--bf-muted)]/40 bg-[var(--bf-surface)] overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--bf-muted)]/30 bg-[var(--bf-surface-inset)]">
              <span className="w-2 h-2 rounded-full bg-[var(--bf-muted)]/60" />
              <span className="font-mono text-[11px] tracking-wider uppercase text-[var(--bf-text)]/55">Bit Representation · 8-bit</span>
              <span className="ml-auto font-mono text-[11px] text-[var(--bf-accent)]/80">click any bit ↓</span>
            </div>
            <div className="px-5 sm:px-7 py-8">
              <div className="flex justify-center overflow-x-auto scrollbar-none">
                <BitCellRow
                  bits={bits}
                  onToggle={handleToggleBit}
                  subLabels={gridMeta.labels}
                  highlightIndices={gridMeta.highlightIndices}
                />
              </div>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl overflow-hidden border border-[var(--bf-muted)]/30 bg-[var(--bf-muted)]/20">
                {([
                  ['Unsigned', decoded.unsigned],
                  ['Sign-Magnitude', decoded['sign-magnitude']],
                  ["One's Compl.", decoded['ones-complement']],
                  ["Two's Compl.", decoded['twos-complement']],
                ] as const).map(([label, value]) => (
                  <div key={label} className="bg-[var(--bf-surface-inset)] px-3.5 py-4 text-center">
                    <span className="block font-mono text-[10px] tracking-wider uppercase text-[var(--bf-text)]/45 mb-1.5">{label}</span>
                    <span className="font-mono text-lg font-bold text-[var(--bf-accent)]">{formatValueForDisplay(value)}</span>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-center text-sm text-[var(--bf-text)]/55">
                One pattern — <b className="font-mono text-[var(--bf-heading)] font-semibold">{bits}</b> — four different numbers.
                A bit pattern has no meaning until you choose how to read it.
              </p>
            </div>
          </div>
        </div>

        {/* Tools — each tile is a real destination, not decoration: clicking one
            opens the tool with that mode already selected (or, for BitForge AI,
            with the chat panel already open). */}
        <Section id="tools">
          <Eyebrow>Five tools, one workspace</Eyebrow>
          <h2 className="font-display font-semibold text-[1.5rem] sm:text-[2.05rem] text-[var(--bf-heading)]">Built for the moment it clicks.</h2>
          <p className="mt-3.5 text-[var(--bf-text)]/70 max-w-[60ch]">
            Each tool is a small, focused instrument. No dashboards, no setup, no account.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-[var(--bf-muted)]/30 bg-[var(--bf-muted)]/20">
            {TOOLS.map(tool => (
              <button
                key={tool.n}
                type="button"
                onClick={() => (tool.mode ? onOpenTool(tool.mode) : onOpenChat())}
                className="group text-left bg-[var(--bf-app-bg)] hover:bg-[var(--bf-surface-inset)] transition-colors px-6 sm:px-7 py-7 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--bf-accent)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] text-[var(--bf-accent)]/60 tracking-wider">{tool.n}</span>
                  {tool.mode === null ? (
                    <MessageCircle className="w-3.5 h-3.5 text-[var(--bf-accent)]/50 group-hover:text-[var(--bf-accent)] transition-colors shrink-0 mt-0.5" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--bf-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  )}
                </div>
                <h3 className="mt-3.5 mb-2 font-display font-semibold text-[15px] text-[var(--bf-heading)] group-hover:text-[var(--bf-accent)] transition-colors">{tool.title}</h3>
                <p className="text-[13px] text-[var(--bf-text)]/60 leading-relaxed">{tool.body}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* Why */}
        <Section id="why">
          <Eyebrow>Why BitForge</Eyebrow>
          <h2 className="font-display font-semibold text-[1.5rem] sm:text-[2.05rem] text-[var(--bf-heading)]">Restraint is the feature.</h2>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-14 gap-y-10">
            {PRINCIPLES.map(p => (
              <div key={p.n} className="flex gap-4">
                <span className="font-mono text-[11px] text-[var(--bf-accent)]/70 pt-1 shrink-0">{p.n}</span>
                <div>
                  <h3 className="font-display font-semibold text-[15px] text-[var(--bf-heading)] mb-1.5">{p.title}</h3>
                  <p className="text-[13px] text-[var(--bf-text)]/60 leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Closing CTA */}
        <Section className="text-center">
          <Eyebrow>Free · No account · Open in your browser</Eyebrow>
          <h2 className="font-display font-semibold text-[1.5rem] sm:text-[2.05rem] text-[var(--bf-heading)]">Start with a single bit.</h2>
          <p className="mt-3.5 text-[var(--bf-text)]/70 max-w-[52ch] mx-auto">
            Nothing to install. Nothing to sign up for. Open it and start flipping bits.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={onEnterApp}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[var(--bf-accent)] hover:bg-[var(--bf-accent-hover)] text-[var(--bf-app-bg)] font-mono text-sm font-bold transition-colors"
            >
              Open BitForge <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[var(--bf-muted)]/50 hover:border-[var(--bf-accent)] text-[var(--bf-text)] hover:text-[var(--bf-accent)] font-mono text-sm font-medium transition-colors"
            >
              <Github className="w-4 h-4" /> View on GitHub
            </a>
          </div>
        </Section>
      </main>

      {/* Footer — same five destinations as the in-app Footer.tsx, but opening
          this page's own Info dialog directly (see below) rather than routing
          into the tool to show it. */}
      <footer className="border-t border-[var(--bf-muted)]/20 py-8">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-7 flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="text-[13px] text-[var(--bf-text)]/50 mr-auto">BitForge v{APP_VERSION} — built for people learning how machines think.</span>
          <button onClick={() => openInfo('about')} className="text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-accent)] transition-colors">About</button>
          <button onClick={() => openInfo('help')} className="text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-accent)] transition-colors">Help</button>
          <button onClick={() => openInfo('privacy')} className="text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-accent)] transition-colors">Privacy</button>
          <button onClick={() => openInfo('terms')} className="text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-accent)] transition-colors">Terms</button>
          <button onClick={() => openInfo('disclaimer')} className="text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-accent)] transition-colors">Disclaimer</button>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-accent)] transition-colors">
            <Github className="w-3.5 h-3.5" /> GitHub
          </a>
          <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] text-[var(--bf-text)]/60 hover:text-[var(--bf-accent)] transition-colors">
            <Bug className="w-3.5 h-3.5" /> Report a bug
          </a>
        </div>
      </footer>

      <InfoDialog
        isOpen={isInfoOpen}
        activeSection={infoSection}
        onSectionChange={setInfoSection}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
};
