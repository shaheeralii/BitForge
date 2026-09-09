export type BaseType = '10' | '2' | '8' | '16' | 'custom';

export interface BaseOption {
  id: BaseType;
  name: string;
  radix: number;
  prefix: string;
  digitsRegex: RegExp;
  allowedCharsLabel: string;
  description: string;
}

export interface AutoDetectResult {
  detectedBase: BaseType;
  validBases: BaseType[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  hasPrefix: boolean;
  strippedInput: string;
}

export interface StepDetail {
  title: string;
  type: 'division' | 'multiplication' | 'positional' | 'bitgroup' | 'twos_complement' | 'info';
  explanation: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  equationLines?: string[];
  finalResult?: string;
}

export interface ConversionResult {
  isValid: boolean;
  errorMessage?: string;
  sourceBase: BaseType;
  sourceValue: string;
  normalizedSource: string;
  
  // Converted values
  denary: string;
  binary: string;
  octal: string;
  hexadecimal: string;
  customBaseValue?: string;
  customRadix?: number;
  
  // Numerical analysis
  isNegative: boolean;
  hasFraction: boolean;
  integerPart: string;
  fractionPart: string;
  bitLengthNeeded: number;
  
  // Step by step breakdown for chosen source -> target
  steps: StepDetail[];
}

export interface PresetItem {
  label: string;
  value: string;
  base: BaseType;
  category: 'common' | 'signed' | 'fraction' | 'networking' | 'color';
  description?: string;
}

export type HistoryMode = 'converter' | 'bitgrid' | 'twos_complement' | 'ascii' | 'operations' | 'floating_point';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  mode: HistoryMode;
  operation: string;
  input: string;
  inputLabel: string;
  output: string;
  outputLabel: string;
  /**
   * The exact source base the calculation used, when `mode` is 'converter'.
   * Reusing a history entry restores this alongside `input` so the same
   * entry always reproduces the same calculation, rather than handing the
   * raw input string back to auto-detection to reinterpret — which can land
   * on a different base than the one originally used (e.g. an explicitly
   * chosen 'custom' or binary source for a value that reads as decimal by
   * default). Optional so older stored entries without it still validate.
   */
  sourceBase?: BaseType;
  /** The custom radix in effect, when `sourceBase` is 'custom'. */
  customRadix?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Set when this assistant message represents a failed request, so the UI can offer a retry. */
  isError?: boolean;
  timestamp: number;
}

