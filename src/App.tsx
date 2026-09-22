import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { BaseType, HistoryEntry, PresetItem } from './types';
import { autoDetectBase, convertNumber } from './utils/converter';
import { Header, AppMode } from './components/Header';
import { appRouteToHashPath, resolveAppDisplayState } from './routing';
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
  /** Set when the landing page routes in with a specific tool tile clicked
   * ('#/app/mode/<mode>') — selects that mode immediately instead of
   * requiring a second click once inside. */
  initialMode?: AppMode;
  /** Set when the landing page's BitForge AI tile is clicked ('#/app/chat')
   * — opens the chat panel immediately on entry. */
  initialChatOpen?: boolean;
}

export default function App({ initialMode, initialChatOpen }: AppProps = {}) {
  const [activeMode, setActiveMode] = useState<AppMode>(initialMode ?? 'converter');
  const [inputVal, setInputVal] = useState<string>('255.625');
  const [sourceBase, setSourceBase] = useState<BaseType>('10');
  const [targetBase, setTargetBase] = useState<BaseType>('2');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [customRadix, setCustomRadix] = useState<number>(12);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoSection, setInfoSection] = useState<InfoSection>('about');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  const shortcutTargetRef = useShortcutTargetRef();

  // History, the Shortcuts guide, and the Info dialog are mutually exclusive
  // overlays; opening one always closes the others so they can never stack
  // (which would leave two backdrops and ambiguous close-on-click behavior).
  // Wrapped in useCallback with stable setState identities so these don't
  // get new references on every App render (e.g. every keystroke in the
  // Converter), which would otherwise tear down and re-add the global
  // keydown listener on every render.
  const openHistory = useCallback(() => {
    setIsShortcutsHelpOpen(false);
    setIsInfoOpen(false);
    setIsChatOpen(false);
    setIsHistoryOpen(true);
  }, []);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
  const toggleHistory = useCallback(() => {
    setIsShortcutsHelpOpen(false);
    setIsInfoOpen(false);
    setIsChatOpen(false);
    setIsHistoryOpen(o => !o);
  }, []);
  const openShortcutsHelp = useCallback(() => {
    setIsHistoryOpen(false);
    setIsInfoOpen(false);
    setIsChatOpen(false);
    setIsShortcutsHelpOpen(true);
  }, []);
  const closeShortcutsHelp = useCallback(() => setIsShortcutsHelpOpen(false), []);
  const toggleShortcutsHelp = useCallback(() => {
    setIsHistoryOpen(false);
    setIsInfoOpen(false);
    setIsChatOpen(false);
    setIsShortcutsHelpOpen(o => !o);
  }, []);
  const openInfo = useCallback((section: InfoSection) => {
    setIsHistoryOpen(false);
    setIsShortcutsHelpOpen(false);
    setIsChatOpen(false);
    setInfoSection(section);
    setIsInfoOpen(true);
  }, []);
  const closeInfo = useCallback(() => setIsInfoOpen(false), []);

  const openChat = useCallback(() => {
    setIsHistoryOpen(false);
    setIsShortcutsHelpOpen(false);
    setIsInfoOpen(false);
    setIsChatOpen(true);
  }, []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);

  // --- Keeping the URL and the displayed app state consistent ---
  //
  // AppRoot only mounts a fresh `App` instance on the landing→app
  // transition; every hash change *after* that (clicking a different mode
  // tab, the browser's Back/Forward buttons, a fresh '#/app/mode/<mode>' or
  // '#/app/chat' link opened while this tab is already on the tool) updates
  // props on this same instance rather than remounting it. `initialMode`/
  // `initialChatOpen` being consumed only once, at mount, was exactly the
  // bug: switching modes via the Header left the URL frozen on whatever
  // mode the tool happened to start on, and a hash change arriving from
  // outside (Back/Forward, a pasted link) had no effect on what was
  // actually displayed. Two effects close both directions:

  // Forward (App state → URL): keeps the URL bar an accurate reflection of
  // what's on screen, so refreshing or sharing it while on, say, Bit
  // Representation actually reopens Bit Representation. Uses
  // `history.replaceState` rather than assigning `location.hash` so it
  // edits the current entry in place instead of adding a new one for every
  // mode switch — Back from anywhere in the tool still returns directly to
  // the landing page — and, just as importantly, `replaceState` never
  // fires a `hashchange` event, so it cannot loop into the reverse-sync
  // effect below.
  useEffect(() => {
    window.history.replaceState(null, '', '#' + appRouteToHashPath(activeMode, isChatOpen));
  }, [activeMode, isChatOpen]);

  // Reverse (URL → App state): reacts to a hash change this App instance
  // did not itself just cause — since the effect above never triggers a
  // `hashchange`, the only way `initialMode`/`initialChatOpen` change after
  // mount is a genuine external navigation. Comparing against the current
  // state before setting it means a user's own click is never fought: by
  // the time AppRoot's updated prop reaches here, `activeMode` already
  // equals it.
  //
  // A route that names no mode/chat at all (bare '#/app') means the
  // *default* state — converter, chat closed — not "leave whatever was
  // already showing alone". The first version of this effect got that
  // backwards (`if (initialMode && initialMode !== activeMode)`, `if
  // (initialChatOpen && !isChatOpen)`): since `initialMode`/`initialChatOpen`
  // are `undefined` for that route, both conditions were simply false, so
  // navigating from e.g. '#/app/mode/ascii' back to '#/app' — or from
  // '#/app/chat' to '#/app/mode/ascii', which needs chat to *close* — left
  // the tool showing whatever it last showed instead of resetting. Coalescing
  // to the default with `??` before comparing fixes both directions at once,
  // including the closing direction the old chat effect couldn't express at
  // all (it only ever opened, never closed).
  useEffect(() => {
    const desired = resolveAppDisplayState({ mode: initialMode, openChat: initialChatOpen });
    if (desired.mode !== activeMode) setActiveMode(desired.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);
  useEffect(() => {
    const desired = resolveAppDisplayState({ mode: initialMode, openChat: initialChatOpen });
    if (desired.chatOpen !== isChatOpen) {
      if (desired.chatOpen) openChat(); else closeChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatOpen]);

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
          onModeChange={setActiveMode}
          onOpenHistory={openHistory}
          onOpenShortcutsHelp={openShortcutsHelp}
        />

        {/* Main Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* First-Time User Welcome & Quick Navigation Guide */}
          <WelcomeBanner onNavigate={setActiveMode} />

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
                    <p className="text-slate-300 leading-relaxed font-sans">
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
                    <p className="text-slate-300 leading-relaxed font-sans">
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
                    <p className="text-slate-300 leading-relaxed font-sans">
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
          setActiveMode('converter');
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

