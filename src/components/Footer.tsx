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
    <footer className="bg-[#041A11]/60 backdrop-blur-md px-4 sm:px-8 text-[10px] font-mono text-[#D9FFF4]/80 shrink-0 border-t border-[#34E89A]/15 relative z-10">
      {/* Links row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 border-b border-[#1F6B4C]/20 font-mono font-medium tracking-tight">
        <button onClick={() => onOpenInfo('about')} className="hover:text-[#34E89A] transition-colors">About</button>
        <span className="text-[#1F6B4C]">·</span>
        <button onClick={() => onOpenInfo('help')} className="hover:text-[#34E89A] transition-colors">Help / FAQ</button>
        <span className="text-[#1F6B4C]">·</span>
        <button onClick={() => onOpenInfo('privacy')} className="hover:text-[#34E89A] transition-colors">Privacy</button>
        <span className="text-[#1F6B4C]">·</span>
        <button onClick={() => onOpenInfo('disclaimer')} className="hover:text-[#34E89A] transition-colors">Disclaimer</button>
        <span className="text-[#1F6B4C]">·</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[#34E89A] transition-colors"
        >
          <Github className="w-3 h-3" /> GitHub
        </a>
        <span className="text-[#1F6B4C]">·</span>
        <a
          href={ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[#34E89A] transition-colors"
        >
          <Bug className="w-3 h-3" /> Report a bug
        </a>
      </div>

      {/* Status row */}
      <div className="h-9 flex items-center">
        <span className="text-[#D9FFF4]/60">BitForge v{APP_VERSION}</span>
      </div>
    </footer>
  );
};
