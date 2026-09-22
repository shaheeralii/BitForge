import React from 'react';
import { Github, Bug } from 'lucide-react';
import { InfoSection } from './InfoDialog';
import { APP_VERSION } from '../version';

interface FooterProps {
  onOpenInfo: (section: InfoSection) => void;
}

const GITHUB_URL = 'https://github.com/shaheeralii/BitForge';
const ISSUES_URL = 'https://github.com/shaheeralii/BitForge/issues';

export const Footer: React.FC<FooterProps> = ({ onOpenInfo }) => {
  return (
    <footer className="bg-[var(--bf-overlay)]/60 backdrop-blur-md px-4 sm:px-8 text-[10px] font-mono text-[var(--bf-heading)]/80 shrink-0 border-t border-[var(--bf-accent)]/15 relative z-10">
      {/* Links row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 border-b border-[var(--bf-muted)]/20 font-mono font-medium tracking-tight">
        <button onClick={() => onOpenInfo('about')} className="hover:text-[var(--bf-accent)] transition-colors">About</button>
        <span className="text-[var(--bf-muted)]">·</span>
        <button onClick={() => onOpenInfo('help')} className="hover:text-[var(--bf-accent)] transition-colors">Help / FAQ</button>
        <span className="text-[var(--bf-muted)]">·</span>
        <button onClick={() => onOpenInfo('privacy')} className="hover:text-[var(--bf-accent)] transition-colors">Privacy</button>
        <span className="text-[var(--bf-muted)]">·</span>
        <button onClick={() => onOpenInfo('terms')} className="hover:text-[var(--bf-accent)] transition-colors">Terms</button>
        <span className="text-[var(--bf-muted)]">·</span>
        <button onClick={() => onOpenInfo('disclaimer')} className="hover:text-[var(--bf-accent)] transition-colors">Disclaimer</button>
        <span className="text-[var(--bf-muted)]">·</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[var(--bf-accent)] transition-colors"
        >
          <Github className="w-3 h-3" /> GitHub
        </a>
        <span className="text-[var(--bf-muted)]">·</span>
        <a
          href={ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[var(--bf-accent)] transition-colors"
        >
          <Bug className="w-3 h-3" /> Report a bug
        </a>
      </div>

      {/* Status row */}
      <div className="h-9 flex items-center">
        <span className="text-[var(--bf-heading)]/60">BitForge v{APP_VERSION}</span>
      </div>
    </footer>
  );
};
