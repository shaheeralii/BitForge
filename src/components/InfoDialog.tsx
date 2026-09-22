import React, { useRef, useEffect } from 'react';
import {
  X, Info, HelpCircle, ShieldCheck, Scale, AlertTriangle,
  Github, Linkedin, Sparkles, GraduationCap,
} from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { APP_VERSION } from '../version';

export type InfoSection = 'about' | 'help' | 'privacy' | 'terms' | 'disclaimer';

interface InfoDialogProps {
  isOpen: boolean;
  activeSection: InfoSection;
  onSectionChange: (section: InfoSection) => void;
  onClose: () => void;
}

const TABS: { id: InfoSection; label: string; icon: React.ElementType }[] = [
  { id: 'about', label: 'About', icon: Info },
  { id: 'help', label: 'Help / FAQ', icon: HelpCircle },
  { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
  { id: 'terms', label: 'Terms', icon: Scale },
  { id: 'disclaimer', label: 'Disclaimer', icon: AlertTriangle },
];

const GITHUB_URL = 'https://github.com/shaheeralii/BitForge';
const AUTHOR_GITHUB = 'https://github.com/shaheeralii';
const AUTHOR_LINKEDIN = 'https://www.linkedin.com/in/syedshaheer/';

/** Small section heading used throughout the info content below. */
const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[11px] font-display font-semibold uppercase tracking-wide text-[var(--bf-accent)] mt-5 mb-2 first:mt-0">
    {children}
  </h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[13px] leading-relaxed text-[var(--bf-heading)]/85 mb-2">{children}</p>
);

const AboutContent: React.FC = () => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <GraduationCap className="w-4 h-4 text-[var(--bf-accent)]" />
      <span className="text-[11px] font-mono text-[var(--bf-heading)]/60">Student-built · v{APP_VERSION}</span>
    </div>

    <P>
      BitForge is an interactive, browser-based learning toolkit for understanding number systems,
      binary operations, and low-level data representation. It combines practical tools with visual
      explanations to make concepts often taught through static examples easier to explore and
      understand.
    </P>

    <H>Why it exists</H>
    <P>
      BitForge was created by <strong>Syed Shaheer Ali</strong>, a{" "} <strong>BS Computer Science</strong> student at Bahria University,
      while studying number systems and computer organization concepts.
    </P>
    <P>
      It began as a simple idea: instead of relying on static conversion tables or calculators that
      only provide a final result, create a tool that lets learners see how the result is produced.
    </P>
    <P>BitForge is designed to make experimentation, practice, and understanding easier in one place.</P>

    <H>What you can learn</H>
    <ul className="list-disc list-inside text-[13px] leading-relaxed text-[var(--bf-heading)]/85 space-y-1 mb-2">
      <li>Positional notation and base conversion across binary, octal, decimal, hexadecimal, and custom radices</li>
      <li>Binary arithmetic, including addition and subtraction with carry and borrow</li>
      <li>Signed number representation across Unsigned, Sign-Magnitude, One's Complement, and Two's Complement</li>
      <li>Text and byte-level encoding, including UTF-8 and ASCII</li>
      <li>Bitwise operations such as AND, OR, XOR, NOT, and bit shifts</li>
      <li>Interactive bit-level manipulation and visualization of numerical data</li>
      <li>Floating-point representation (Binary16, Binary32, Binary64, and custom formats), including normalization and rounding</li>
    </ul>

    <H>BitForge AI</H>
    <P>BitForge AI is a built-in learning assistant for questions related to the concepts covered by BitForge.</P>
    <P>
      Where applicable, it can work alongside BitForge's own calculation and conversion logic to
      support answers grounded in the tool's supported operations. AI-generated responses may still
      contain mistakes, so BitForge AI is intended as a learning aid rather than a replacement for
      authoritative course material or instruction.
    </P>
    <P>Information sent to the AI service and how it is handled are described in the Privacy section.</P>

    <H>Built with</H>
    <P>BitForge is built with React, TypeScript, Vite, Tailwind CSS, and Three.js, with a lightweight Vercel Edge Function supporting BitForge AI.</P>
    <P>The project is deployed on Vercel.</P>

    <H>Links</H>
    <div className="flex flex-wrap gap-2 mt-1">
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/25 hover:bg-[var(--bf-chip)] text-[var(--bf-heading)]/80 hover:text-[var(--bf-accent)] border border-[var(--bf-accent)]/25 text-xs font-medium transition-colors"
      >
        <Github className="w-3.5 h-3.5" /> Project repo
      </a>
      <a
        href={AUTHOR_GITHUB}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/25 hover:bg-[var(--bf-chip)] text-[var(--bf-heading)]/80 hover:text-[var(--bf-accent)] border border-[var(--bf-accent)]/25 text-xs font-medium transition-colors"
      >
        <Github className="w-3.5 h-3.5" /> Developer
      </a>
      <a
        href={AUTHOR_LINKEDIN}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/25 hover:bg-[var(--bf-chip)] text-[var(--bf-heading)]/80 hover:text-[var(--bf-accent)] border border-[var(--bf-accent)]/25 text-xs font-medium transition-colors"
      >
        <Linkedin className="w-3.5 h-3.5" /> LinkedIn
      </a>
    </div>
  </div>
);

const HelpContent: React.FC = () => (
  <div>
    <H>What is BitForge?</H>
    <P>BitForge is a collection of focused tools for exploring how numbers, bits, and text are represented and manipulated:</P>
    <ul className="list-disc list-inside text-[13px] leading-relaxed text-[var(--bf-heading)]/85 space-y-1 mb-2">
      <li><strong className="text-[var(--bf-heading)]">Number Converter</strong> — Convert values between number systems with step-by-step derivations</li>
      <li><strong className="text-[var(--bf-heading)]">Bit Representation</strong> — Toggle or type an 8-, 16-, or 32-bit value and interpret it as Unsigned, Sign-Magnitude, One's Complement, or Two's Complement</li>
      <li><strong className="text-[var(--bf-heading)]">Text &amp; UTF-8</strong> — Explore how text is represented as bytes</li>
      <li><strong className="text-[var(--bf-heading)]">Binary Operations</strong> — Perform and visualize common bitwise and binary arithmetic operations</li>
      <li><strong className="text-[var(--bf-heading)]">Floating Point</strong> — Explore how a decimal number is stored as sign, exponent, and fraction bits (or decode one back to decimal) using the standard Binary16/32/64 formats or a custom bit-width layout</li>
    </ul>

    <H>How do I convert a number?</H>
    <P>
      Enter a value in the Number Converter. BitForge can detect a likely source base from your
      input, or you can manually select and lock the source base.
    </P>
    <P>Choose a target base to see the converted result along with a step-by-step derivation.</P>

    <H>Which number systems are supported?</H>
    <P>BitForge supports Binary (2), Octal (8), Decimal (10), Hexadecimal (16), and custom radices from 2 through 36.</P>

    <H>What can I do with Binary Operations?</H>
    <P>Binary Operations supports AND, OR, XOR, NOT, left and right shifts, addition, and subtraction.</P>
    <P>Operations use arbitrary-precision arithmetic where supported and can include step-by-step carry or borrow information.</P>

    <H>How does Bit Representation work?</H>
    <P>Bit Representation is a single workspace with two synchronized inputs: a denary field and an interactive bit grid.</P>
    <P>
      Type a decimal value (positive or negative) or click a bit to toggle it between{' '}
      <code className="font-mono text-[var(--bf-accent)]/90">0</code> and{' '}
      <code className="font-mono text-[var(--bf-accent)]/90">1</code> — the other input updates immediately. Switch between
      8-, 16-, and 32-bit widths, then choose how the bits should be interpreted: Unsigned, Sign-Magnitude, One's
      Complement, or Two's Complement. Each interpretation shows its own explanation, calculation, and result, and the
      "Same Number, Different Encoding" and "Same Bits, Different Meaning" panels compare all systems side by side.
    </P>

    <H>How does Text &amp; UTF-8 work?</H>
    <P>Text &amp; UTF-8 shows how characters are represented as bytes.</P>
    <P>
      Text can be converted to and from binary, decimal, and hexadecimal representations. BitForge
      uses UTF-8 encoding. Standard ASCII characters (code points 0–127) use one byte, while many
      other characters, including accented letters, emoji, and characters from non-Latin scripts,
      require multiple bytes.
    </P>

    <H>How does the Floating Point tool work?</H>
    <P>
      The Floating-Point Explorer covers the standard IEEE 754 Binary16, Binary32, and Binary64
      formats, plus a fully configurable Custom Format. Enter a decimal number to see a short
      explanation of its sign, binary conversion, normalization, biased exponent, and fraction
      bits, with the full mathematical derivation available on demand behind "Show details".
    </P>
    <P>
      Switch direction to enter or click a bit pattern directly and see the decoded sign,
      exponent, fraction, and resulting decimal value, including special cases such as zero,
      infinity, NaN, and subnormal numbers.
    </P>

    <H>How precise are fractional conversions?</H>
    <P>
      A fraction's digits in the target base are computed exactly, using whole-number arithmetic
      rather than floating point, so a genuinely tiny value is never mistaken for zero. Digits are
      shown up to a fixed limit (12); a fraction that repeats forever (like decimal 0.1 in binary)
      is marked with the repeating part in parentheses, and one that neither terminates nor
      visibly repeats within that limit is shown with a trailing "…" rather than presented as
      complete. Nothing is ever rounded up or down to hide this — a truncated result is always
      marked as truncated.
    </P>

    <H>What input rules should I know?</H>
    <P>BitForge validates input according to the selected operation and number system.</P>
    <ul className="list-disc list-inside text-[13px] leading-relaxed text-[var(--bf-heading)]/85 space-y-1 mb-2">
      <li>Only digits valid for the selected base are accepted</li>
      <li>Binary input accepts only 0 and 1</li>
      <li>Empty input is treated as invalid rather than being interpreted as zero</li>
      <li>Custom radices must be between 2 and 36</li>
      <li>A sign (+ or −) and a base prefix (0x, 0b, 0o) are recognized independently, so "-0xFF" is parsed as negative 255, not rejected</li>
      <li>Values exceeding the active bit width are flagged instead of being silently wrapped</li>
    </ul>
    <P>When an input is invalid, BitForge aims to explain the problem and indicate how to correct it.</P>

    <H>Does BitForge save my history?</H>
    <P>BitForge can maintain a local history of supported results. Depending on the action and mode, using features such as copying or sharing a result may add it to your history.</P>
    <P>History can be searched by mode and exported in supported formats such as TXT, CSV, and JSON.</P>

    <H>Are there keyboard shortcuts?</H>
    <P>Yes. Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bf-chip)] border border-[var(--bf-accent)]/30 text-[var(--bf-accent)] text-[11px] font-mono">?</kbd> anywhere in BitForge to open the keyboard shortcuts guide.</P>

    <H>What is BitForge AI?</H>
    <P>
      BitForge AI is a built-in learning assistant designed to explain concepts and help users work
      through questions related to number systems, binary operations, and encoding.
    </P>
    <P>
      It is intended primarily as a teaching aid. Where supported, direct calculations or
      conversions may use BitForge's own calculation logic rather than relying solely on the AI
      model.
    </P>
    <P>AI-generated responses can still contain mistakes, so important results should be checked against the relevant BitForge tool or authoritative course material.</P>
  </div>
);

const PrivacyContent: React.FC = () => (
  <div>
    <span className="text-[11px] font-mono text-[var(--bf-heading)]/50">Last updated: September 6, 2026</span>

    <P>
      BitForge is designed with privacy in mind. Its core tools run in your browser and do not
      require an account or intentionally transmit the values you enter.
    </P>

    <H>Core Tools</H>
    <P>
      The Number Converter, Bit Representation, Text &amp; UTF-8, Binary Operations, and
      Floating Point tools process your inputs locally on your device.
    </P>
    <P>BitForge does not intentionally collect or transmit these inputs to its server-side services.</P>

    <H>BitForge AI</H>
    <P>
      BitForge AI requires server-side processing. When you send a message, your message and
      limited recent conversation context are sent through BitForge's server-side function to
      Google's Gemini API to generate a response.
    </P>
    <P>
      BitForge does not maintain a persistent database of AI conversations. Conversations shown in
      the interface are maintained for the current session and can be cleared using the available
      conversation controls.
    </P>
    <P>Requests sent to external services may be subject to their own data-handling and retention policies.</P>
    <P><strong className="text-[var(--bf-heading)]">Do not enter passwords, confidential information, or other sensitive personal information into BitForge AI.</strong></P>

    <H>Local Storage</H>
    <P>BitForge uses your browser's <code className="font-mono text-[var(--bf-accent)]/90">localStorage</code> for limited features such as conversion history and certain interface preferences.</P>
    <P>This information remains on your device unless you clear the relevant site data.</P>

    <H>Rate Limiting</H>
    <P>BitForge AI uses Upstash Redis to enforce request limits. Short-lived rate-limit information, such as an IP address and request count, may be processed for this purpose.</P>
    <P>Rate-limit data is used to control request frequency and is not used as BitForge's AI conversation storage.</P>

    <H>Cookies &amp; Analytics</H>
    <P>BitForge does not set cookies of any kind and does not use advertising trackers, analytics scripts, or third-party tracking pixels.</P>
    <P>The <code className="font-mono text-[var(--bf-accent)]/90">localStorage</code> described above is the only client-side data BitForge stores, and it stays on your device — it is never transmitted anywhere.</P>

    <H>Hosting &amp; Third-Party Services</H>
    <P>BitForge is hosted on Vercel and currently uses:</P>
    <ul className="list-disc list-inside text-[13px] leading-relaxed text-[var(--bf-heading)]/85 space-y-1 mb-2">
      <li><strong className="text-[var(--bf-heading)]">Vercel</strong> — hosting and server-side functions</li>
      <li><strong className="text-[var(--bf-heading)]">Google Gemini API</strong> — AI response generation</li>
      <li><strong className="text-[var(--bf-heading)]">Upstash Redis</strong> — rate limiting</li>
    </ul>
    <P>Hosting and external service providers may process technical or service-related information as necessary to operate their services and are governed by their own terms and privacy policies.</P>

    <H>Changes</H>
    <P>This Privacy section may be updated when BitForge's functionality or data practices change. The date above indicates the latest revision.</P>

    <H>Questions</H>
    <P>If you have questions about BitForge's privacy practices, please open an issue through the project's GitHub repository.</P>
  </div>
);

const TermsContent: React.FC = () => (
  <div>
    <span className="text-[11px] font-mono text-[var(--bf-heading)]/50">Last updated: September 13, 2026</span>

    <P>
      These Terms apply to your use of BitForge, a free, student-built educational toolkit. By
      using BitForge, you agree to the points below.
    </P>

    <H>What BitForge Is</H>
    <P>
      BitForge is provided for learning and experimentation with number systems, encoding, and
      bit-level concepts. It is not a professional, academic, legal, financial, or other expert
      advisory service, and nothing in BitForge — including responses from BitForge AI — should be
      treated as such.
    </P>
    <P>Results should be independently verified when accuracy matters, including for exams, coursework, or professional use.</P>

    <H>Acceptable Use</H>
    <P>
      BitForge, including BitForge AI, is intended for personal, non-commercial, educational use.
      Please don't attempt to abuse, overload, scrape at scale, or circumvent the rate limiting or
      other protections on BitForge's backend or API.
    </P>

    <H>Ownership &amp; Licensing</H>
    <P>
      BitForge's original source code is released under the MIT License (see the project's LICENSE
      file for full terms). The BitForge name and branding, as used on this site, belong to its
      developer. Third-party libraries, fonts, and services used by BitForge remain the property of
      their respective owners and are subject to their own licenses.
    </P>

    <H>Third-Party Services</H>
    <P>
      BitForge relies on third-party infrastructure — currently Vercel, Google's Gemini API, and
      Upstash — each governed by its own terms and policies. BitForge is not responsible for the
      availability, accuracy, or content of these third-party services.
    </P>

    <H>Availability</H>
    <P>
      BitForge is provided on an "as available" basis. Features, tools, and availability may change
      over time, and the software may contain bugs, limitations, or unexpected edge-case behavior.
    </P>

    <H>No Payments or Refunds</H>
    <P>
      BitForge is free to use. It does not currently sell anything or accept payments, subscriptions,
      or donations, so no refund process currently applies. If that changes, this section will be
      updated to reflect it.
    </P>

    <H>Limitation of Liability</H>
    <P>
      BitForge is provided "as is," without warranty of any kind, to the extent permitted by
      applicable law. As a free educational project, the developer is not liable for damages arising
      from your use of BitForge; use is at your own risk.
    </P>

    <H>Governing Law</H>
    <P>
      These Terms are written from the developer's context in Pakistan, but BitForge is accessible
      globally. No claim is made that BitForge complies with the laws of every jurisdiction, and
      nothing here is a substitute for independent legal advice.
    </P>

    <H>Changes to These Terms</H>
    <P>These Terms may be updated as BitForge's functionality changes. The date above indicates the latest revision — please check back periodically.</P>

    <H>Contact</H>
    <P>Questions about these Terms can be raised by opening an issue through the project's GitHub repository.</P>
  </div>
);

const DisclaimerContent: React.FC = () => (
  <div>
    <P>BitForge is provided for educational and informational purposes only.</P>
    <ul className="list-disc list-inside text-[13px] leading-relaxed text-[var(--bf-heading)]/85 space-y-1.5 mb-2">
      <li>Results should be independently checked when accuracy is important, including for exams, coursework, or professional use.</li>
      <li>BitForge is not a substitute for authoritative academic, technical, or professional resources.</li>
      <li>While reasonable care is taken to ensure accuracy, the software may contain bugs, limitations, or unexpected edge-case errors.</li>
      <li>BitForge AI uses a third-party language model. Its responses may be incomplete, inaccurate, or misleading and should not be treated as authoritative. Where applicable, responses may be supported by BitForge's own calculation logic, but results should still be checked when accuracy matters.</li>
      <li>You are responsible for how you interpret and use information or results produced by BitForge.</li>
    </ul>

    <H>No Warranty</H>
    <P>BitForge is open-source software provided "as is," without warranty of any kind, to the extent permitted by applicable law.</P>
    <P>BitForge is released under the MIT License. The full license terms are available in the project's LICENSE file.</P>
  </div>
);

export const InfoDialog: React.FC<InfoDialogProps> = ({ isOpen, activeSection, onSectionChange, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);
  useScrollLock(isOpen);

  // This dialog opens independently of the global keyboard-shortcuts system,
  // so Escape-to-close is handled locally rather than relying on the app-wide
  // Escape handler (which only knows about History and the Shortcuts guide).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ActiveContent = {
    about: AboutContent,
    help: HelpContent,
    privacy: PrivacyContent,
    terms: TermsContent,
    disclaimer: DisclaimerContent,
  }[activeSection];

  return (
    <>
      {/* Purely visual dimming layer — click-to-close is handled by the
          wrapper below, since that's the element that actually receives
          clicks anywhere outside the dialog card (this backdrop sits under
          it and would never see a click of its own). */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="BitForge information"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[85dvh] bg-[var(--bf-overlay)] border border-[var(--bf-accent)]/20 rounded-xl shadow-2xl animate-fadeIn overflow-hidden flex flex-col sm:flex-row"
        >
          {/* Tabs: horizontal scroll strip on mobile, vertical rail on larger screens */}
          <nav
            className="flex sm:flex-col gap-1 p-2 sm:p-3 sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--bf-muted)]/30 overflow-x-auto sm:overflow-visible scrollbar-none bg-black/15"
            aria-label="Information sections"
          >
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSectionChange(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-xs font-mono font-medium tracking-tight transition-colors shrink-0 ${
                    isActive
                      ? 'bg-[var(--bf-accent)] text-[var(--bf-chip)] font-semibold'
                      : 'text-[var(--bf-heading)]/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex flex-col min-w-0 flex-1 min-h-0">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--bf-muted)]/30 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--bf-accent)]" />
                <h2 className="text-sm font-display font-semibold text-[var(--bf-heading)] uppercase tracking-wide">
                  {TABS.find(t => t.id === activeSection)?.label}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-[var(--bf-heading)]/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto overscroll-contain">
              <ActiveContent />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

