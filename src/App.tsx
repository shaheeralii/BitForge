import React, { useState, useMemo } from 'react';
import { BaseType, PresetItem } from './types';
import { autoDetectBase, convertNumber } from './utils/converter';
import { Header, AppMode } from './components/Header';
import { ConversionInput } from './components/ConversionInput';
import { LiveBasesGrid } from './components/LiveBasesGrid';
import { StepByStepBreakdown } from './components/StepByStepBreakdown';
import { BitGridVisualizer } from './components/BitGridVisualizer';
import { TwosComplementCard } from './components/TwosComplementCard';
import { AsciiConverterCard } from './components/AsciiConverterCard';
import { WelcomeBanner } from './components/WelcomeBanner';
import { PresetsBar } from './components/PresetsBar';
import { Footer } from './components/Footer';
import { FlowWaveBackground } from './components/FlowWaveBackground';
import { BinaryOperationsCard } from './components/BinaryOperationsCard';
import { HistoryPanel } from './components/HistoryPanel';
import { Calculator, Zap, BookOpen } from 'lucide-react';

export default function App() {
  const [activeMode, setActiveMode] = useState<AppMode>('converter');
  const [inputVal, setInputVal] = useState<string>('255.625');
  const [sourceBase, setSourceBase] = useState<BaseType>('10');
  const [targetBase, setTargetBase] = useState<BaseType>('2');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [customRadix, setCustomRadix] = useState<number>(12);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

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
    <div className="min-h-screen relative text-slate-900 dark:text-[#EAFFF6] flex flex-col justify-between font-sans transition-colors selection:bg-[#34E89A] selection:text-[#0A3324]">

      {/* Animated premium emerald/mint background */}
      <FlowWaveBackground />

      <div className="relative z-10">
        {/* Top Header */}
        <Header activeMode={activeMode} onModeChange={setActiveMode} onOpenHistory={() => setIsHistoryOpen(true)} />

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
              <div className="bg-white dark:bg-[#072818]/60 dark:backdrop-blur-[18px] rounded-xl border border-slate-200 dark:border-[#34E89A]/[0.14] p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs shadow-sm dark:shadow-[0_8px_30px_-8px_rgba(52,232,154,0.25)]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#0A3324] text-[#34E89A] shrink-0 shadow-xs">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0A3324] dark:text-[#D9FFF4] mb-0.5 uppercase tracking-wider text-[11px]">
                      Positional Weights (rⁿ)
                    </h4>
                    <p className="text-[#1F6B4C] dark:text-slate-300 leading-relaxed font-sans">
                      Values are calculated by multiplying each digit by Radix^position. Fractional digits use negative powers (Radix⁻ⁱ).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#0A3324] text-[#34E89A] shrink-0 shadow-xs">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0A3324] dark:text-[#D9FFF4] mb-0.5 uppercase tracking-wider text-[11px]">
                      Fast Bit Grouping
                    </h4>
                    <p className="text-[#1F6B4C] dark:text-slate-300 leading-relaxed font-sans">
                      Octal uses 3-bit triplets (2³ = 8). Hexadecimal uses 4-bit nibbles (2⁴ = 16), providing direct bit alignment.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#0A3324] text-[#34E89A] shrink-0 shadow-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0A3324] dark:text-[#D9FFF4] mb-0.5 uppercase tracking-wider text-[11px]">
                      Repeated Division
                    </h4>
                    <p className="text-[#1F6B4C] dark:text-slate-300 leading-relaxed font-sans">
                      Converting Decimal to Base Y divides repeatedly by Y. Remainders collected bottom-to-top yield the target representation.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Interactive Bit Grid Mode */}
          {activeMode === 'bitgrid' && <BitGridVisualizer />}

          {/* Two's Complement Signed Mode */}
          {activeMode === 'twos_complement' && <TwosComplementCard />}

          {/* ASCII / Text Mode */}
          {activeMode === 'ascii' && <AsciiConverterCard />}

          {/* Binary Arithmetic Operations Mode */}
          {activeMode === 'operations' && <BinaryOperationsCard />}

        </main>
      </div>

      {/* System Status Footer Bar */}
      <div className="relative z-10">
        <Footer />
      </div>

      {/* Conversion History Slide-Over */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onReuseConverterEntry={(value) => {
          setInputVal(value);
          setIsLocked(false);
          setActiveMode('converter');
        }}
      />
    </div>
  );
}

