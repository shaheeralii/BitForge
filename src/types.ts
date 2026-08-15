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
