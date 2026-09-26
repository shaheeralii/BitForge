import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { BaseType, HistoryEntry, PresetItem } from './types';
import { autoDetectBase, convertNumber } from './utils/converter';
import { Header, AppMode } from './components/Header';
import { ConversionInput } from './components/ConversionInput';
import { LiveBasesGrid } from './components/LiveBasesGrid';
import { StepByStepBreakdown } from './components/StepByStepBreakdown';
import { BitRepresentationLab } from './components/BitRepresentationLab';
import { AsciiConverterCard } from './components/AsciiConverterCard';
import { WelcomeBanner } from './components/WelcomeBanner';
import { PresetsBar } from './components/PresetsBar';
import { Footer } from './components/Footer';
import { FlowWaveBackground } from './components/FlowWaveBackground';
import { HistoryPanel } from './components/HistoryPanel';
import { ShortcutsHelpDialog } from './components/ShortcutsHelpDialog';
import { InfoDialog, InfoSection } from './components/InfoDialog';
import { ChatAssistant } from './components/ChatAssistant';
import { useRegisterShortcutTarget, useShortcutTargetRef } from './context/ShortcutTargetContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Calculator, Zap, BookOpen, Loader2 } from 'lucide-react';

// Binary Operations and Floating-Point are full, self-contained tool views
// (500-700+ lines each) that most sessions never visit — a session doing
// straightforward base conversion has no reason to pay for either one in
// the initial bundle. Split out and fetched on first visit to that mode.
const BinaryOperationsCard = lazy(() =>
  import('./components/BinaryOperationsCard').then((m) => ({ default: m.BinaryOperationsCard }))
);
const FloatingPointCard = lazy(() =>
  import('./components/FloatingPointCard').then((m) => ({ default: m.FloatingPointCard }))
);

/** Shell-matched placeholder shown only for the brief moment a mode's chunk is fetching. */
function ModeCardFallback() {
  return (
    <div className="bg-[var(--bf-surface)] rounded-xl border border-[var(--bf-muted)]/40 p-5 sm:p-6 shadow-sm flex items-center justify-center min-h-[280px]">
      <Loader2 className="w-5 h-5 text-[var(--bf-accent)] animate-spin" />
    </div>
  );
}

interface AppProps {
  /** The displayed tool mode. Owned by AppRoot (the route is the single
   * source of truth) — App never keeps its own copy. */
  mode: AppMode;
  /** Whether the BitForge AI panel is open. Also owned by AppRoot. */
  chatOpen: boolean;
  /** Ask AppRoot to show another tool mode (also closes chat). Updates the
   * URL in place, without adding a Back stop per tab click. */
  onModeChange: (mode: AppMode) => void;
  /** Ask AppRoot to open/close the chat panel, keeping the current mode. */
  onChatOpenChange: (open: boolean) => void;
  /** Ask AppRoot to return to the landing page (header logo). */
  onGoHome: () => void;
}

export default function App({ mode: activeMode, chatOpen: isChatOpen, onModeChange, onChatOpenChange, onGoHome }: AppProps) {
  const [inputVal, setInputVal] = useState<string>('255.625');
  const [sourceBase, setSourceBase] = useState<BaseType>('10');
  const [targetBase, setTargetBase] = useState<BaseType>('2');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [customRadix, setCustomRadix] = useState<number>(12);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoSection, setInfoSection] = useState<InfoSection>('about');

  const shortcutTargetRef = useShortcutTargetRef();

  // History, the Shortcuts guide, and the Info dialog are mutually exclusive
  // overlays; opening one always closes the others so they can never stack
  // (which would leave two backdrops and ambiguous close-on-click behavior).
  // Wrapped in useCallback with stable identities (setState setters and AppRoot's memoized navigation callbacks) so these don't
  // get new references on every App render (e.g. every keystroke in the
  // Converter), which would otherwise tear down and re-add the global
  // keydown listener on every render.
  const openHistory = useCallback(() => {
    setIsShortcutsHelpOpen(false);
    setIsInfoOpen(false);
    onChatOpenChange(false);
    setIsHistoryOpen(true);
  }, [onChatOpenChange]);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
  const toggleHistory = useCallback(() => {
    setIsShortcutsHelpOpen(false);
    setIsInfoOpen(false);
    onChatOpenChange(false);
    setIsHistoryOpen(o => !o);
  }, [onChatOpenChange]);
  const openShortcutsHelp = useCallback(() => {
    setIsHistoryOpen(false);
    setIsInfoOpen(false);
    onChatOpenChange(false);
    setIsShortcutsHelpOpen(true);
  }, [onChatOpenChange]);
  const closeShortcutsHelp = useCallback(() => setIsShortcutsHelpOpen(false), []);
  const toggleShortcutsHelp = useCallback(() => {
    setIsHistoryOpen(false);
    setIsInfoOpen(false);
    onChatOpenChange(false);
    setIsShortcutsHelpOpen(o => !o);
  }, [onChatOpenChange]);
  const openInfo = useCallback((section: InfoSection) => {
    setIsHistoryOpen(false);
    setIsShortcutsHelpOpen(false);
    onChatOpenChange(false);
    setInfoSection(section);
    setIsInfoOpen(true);
  }, [onChatOpenChange]);
  const closeInfo = useCallback(() => setIsInfoOpen(false), []);

  const openChat = useCallback(() => {
    setIsHistoryOpen(false);
    setIsShortcutsHelpOpen(false);
    setIsInfoOpen(false);
    onChatOpenChange(true);
  }, [onChatOpenChange]);
  const closeChat = useCallback(() => onChatOpenChange(false), [onChatOpenChange]);

  useKeyboardShortcuts({
    targetRef: shortcutTargetRef,
    isHistoryOpen,
    isHelpOpen: isShortcutsHelpOpen,
    onToggleHistory: toggleHistory,
    onCloseHistory: closeHistory,
    onToggleHelp: toggleShortcutsHelp,
    onCloseHelp: closeShortcutsHelp,
    isOtherModalOpen: isInfoOpen || isChatOpen,
  });

  // Converter mode owns inputVal directly, so its "clear" shortcut target
  // is registered here; "focus input" and "copy result" are registered by
  // ConversionInput and LiveBasesGrid respectively, since they own those
  // DOM refs / copy logic.
  useRegisterShortcutTarget(
    activeMode === 'converter' ? { clearInput: () => setInputVal('') } : {}
  );

  // Auto detect logic
  const autoDetect = useMemo(() => {
    return autoDetectBase(inputVal);
  }, [inputVal]);

  // Handle auto-detection assignment when not locked
  const currentSourceBase = isLocked ? sourceBase : autoDetect.detectedBase;

  // Real-time conversion execution
  const conversionResult = useMemo(() => {
    return convertNumber(inputVal, currentSourceBase, targetBase, customRadix);
  }, [inputVal, currentSourceBase, targetBase, customRadix]);

  // Preset Selection Handler
  const handleSelectPreset = (preset: PresetItem) => {
    setInputVal(preset.value);
    setSourceBase(preset.base);
    setIsLocked(true); // Lock to preset's explicit base format
  };

  // Change source base manually
  const handleSourceBaseChange = (base: BaseType) => {
    setSourceBase(base);
    setIsLocked(true); // Lock when user manually picks a base button

    // Auto-assign logical target base
    if (base === '10') setTargetBase('2');
    else if (base === '2') setTargetBase('10');
    else if (base === '16') setTargetBase('10');
    else if (base === '8') setTargetBase('2');
  };

  return (
    <div className="min-h-screen relative text-[var(--bf-text)] flex flex-col justify-between font-sans transition-colors selection:bg-[var(--bf-accent)] selection:text-[var(--bf-chip)]">

      {/* Animated premium emerald/mint background */}
      <FlowWaveBackground />

      <div className="relative z-10">
        {/* Top Header */}
        <Header
          activeMode={activeMode}
          onModeChange={onModeChange}
          onGoHome={onGoHome}
          onOpenHistory={openHistory}
          onOpenShortcutsHelp={openShortcutsHelp}
        />

        {/* Main Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* First-Time User Welcome & Quick Navigation Guide */}
          <WelcomeBanner onNavigate={onModeChange} />

          {/* Main Number System Converter Mode */}
          {activeMode === 'converter' && (
            <div className="space-y-6">
              
              {/* Quick Presets Bar */}
              <PresetsBar onSelectPreset={handleSelectPreset} />

              {/* Input & Auto Detect Panel */}
              <ConversionInput
                inputVal={inputVal}
                onInputChange={setInputVal}
                sourceBase={currentSourceBase}
                onSourceBaseChange={handleSourceBaseChange}
                autoDetect={autoDetect}
                isLocked={isLocked}
                onToggleLock={() => setIsLocked(!isLocked)}
                customRadix={customRadix}
                onCustomRadixChange={setCustomRadix}
                errorMessage={conversionResult.isValid ? undefined : conversionResult.errorMessage}
              />

              {/* Live All-Bases Output Grid */}
              <LiveBasesGrid
                conversion={conversionResult}
                targetBase={targetBase}
                onSelectTargetBase={setTargetBase}
                customRadix={customRadix}
              />

              {/* Detailed Step-by-Step Mathematical Derivation */}
              <StepByStepBreakdown
                conversion={conversionResult}
                targetBase={targetBase}
                customRadix={customRadix}
              />

              {/* Quick Reference Cheat Sheet Footer Card */}
              <div className="bg-[var(--bf-surface)]/60 backdrop-blur-[18px] rounded-xl border border-[var(--bf-accent)]/[0.14] p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs shadow-[0_8px_30px_-8px_rgb(var(--bf-accent-rgb)/25%)]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shrink-0 shadow-xs">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--bf-heading)] mb-0.5 uppercase tracking-wider text-[11px]">
                      Positional Weights (rⁿ)
                    </h4>
                    <p className="text-[var(--bf-heading)]/80 leading-relaxed font-sans">
                      Values are calculated by multiplying each digit by Radix^position. Fractional digits use negative powers (Radix⁻ⁱ).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shrink-0 shadow-xs">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--bf-heading)] mb-0.5 uppercase tracking-wider text-[11px]">
                      Fast Bit Grouping
                    </h4>
                    <p className="text-[var(--bf-heading)]/80 leading-relaxed font-sans">
                      Octal uses 3-bit triplets (2³ = 8). Hexadecimal uses 4-bit nibbles (2⁴ = 16), providing direct bit alignment.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shrink-0 shadow-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--bf-heading)] mb-0.5 uppercase tracking-wider text-[11px]">
                      Repeated Division
                    </h4>
                    <p className="text-[var(--bf-heading)]/80 leading-relaxed font-sans">
                      Converting Decimal to Base Y divides repeatedly by Y. Remainders collected bottom-to-top yield the target representation.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Unified Bit Representation Lab (merges the former Bit Grid and Two's Complement pages) */}
          {activeMode === 'bit_representation' && <BitRepresentationLab />}

          {/* ASCII / Text Mode */}
          {activeMode === 'ascii' && <AsciiConverterCard />}

          {/* Binary Arithmetic Operations Mode */}
          {activeMode === 'operations' && (
            <Suspense fallback={<ModeCardFallback />}>
              <BinaryOperationsCard />
            </Suspense>
          )}

          {/* IEEE 754 Floating-Point Representation Mode */}
          {activeMode === 'floating_point' && (
            <Suspense fallback={<ModeCardFallback />}>
              <FloatingPointCard />
            </Suspense>
          )}

        </main>
      </div>

      {/* System Status Footer Bar */}
      <div className="relative z-10">
        <Footer onOpenInfo={openInfo} />
      </div>

      {/* Activity History Slide-Over */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={closeHistory}
        onReuseConverterEntry={(entry: HistoryEntry) => {
          setInputVal(entry.input);
          if (entry.sourceBase) {
            // A known source base was saved with this entry — restore it
            // and lock it in, so the same entry always reproduces the same
            // calculation rather than being handed back to auto-detect,
            // which could land on a different interpretation than the one
            // originally used (e.g. a value entered explicitly as binary
            // that would otherwise auto-detect as decimal).
            setSourceBase(entry.sourceBase);
            setIsLocked(true);
            if (entry.sourceBase === 'custom' && entry.customRadix) {
              setCustomRadix(entry.customRadix);
            }
          } else {
            // Older entries saved before this metadata existed — fall back
            // to the previous behavior rather than restoring a base we
            // don't actually know.
            setIsLocked(false);
          }
          onModeChange('converter');
        }}
      />

      {/* Keyboard Shortcuts Guide */}
      <ShortcutsHelpDialog isOpen={isShortcutsHelpOpen} onClose={closeShortcutsHelp} />

      {/* About / Help / Privacy / Disclaimer */}
      <InfoDialog
        isOpen={isInfoOpen}
        activeSection={infoSection}
        onSectionChange={setInfoSection}
        onClose={closeInfo}
      />

      {/* AI Learning Assistant */}
      <ChatAssistant isOpen={isChatOpen} onOpen={openChat} onClose={closeChat} />
    </div>
  );
}

