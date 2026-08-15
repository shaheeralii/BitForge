import { BaseType, BaseOption, AutoDetectResult, ConversionResult, StepDetail } from '../types';

export const BASE_OPTIONS: Record<BaseType, BaseOption> = {
  '10': {
    id: '10',
    name: 'Denary (Decimal)',
    radix: 10,
    prefix: '',
    digitsRegex: /^[-+]?[0-9]*\.?[0-9]+$/,
    allowedCharsLabel: '0-9',
    description: 'Standard base-10 numerical system used by humans globally.',
  },
  '2': {
    id: '2',
    name: 'Binary',
    radix: 2,
    prefix: '0b',
    digitsRegex: /^[-+]?(?:0b|0B)?[01]*\.?[01]+$/,
    allowedCharsLabel: '0, 1',
    description: 'Base-2 system fundamental to electronic circuitry and computers.',
  },
  '8': {
    id: '8',
    name: 'Octal',
    radix: 8,
    prefix: '0o',
    digitsRegex: /^[-+]?(?:0o|0O)?[0-7]*\.?[0-7]+$/,
    allowedCharsLabel: '0-7',
    description: 'Base-8 system frequently used in computer systems and file permissions.',
  },
  '16': {
    id: '16',
    name: 'Hexadecimal',
    radix: 16,
    prefix: '0x',
    digitsRegex: /^[-+]?(?:0x|0X)?[0-9a-fA-F]*\.?[0-9a-fA-F]+$/,
    allowedCharsLabel: '0-9, A-F',
    description: 'Base-16 system providing a compact human-readable representation of binary.',
  },
  'custom': {
    id: 'custom',
    name: 'Custom Base',
    radix: 12,
    prefix: '',
    digitsRegex: /^[-+]?[0-9a-zA-ZA-Z]*\.?[0-9a-zA-Z]+$/,
    allowedCharsLabel: '0-9, A-Z',
    description: 'Arbitrary base conversion between Base 2 and Base 36.',
  },
};

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Auto-detects the probable source base from the input string
 */
export function autoDetectBase(rawInput: string): AutoDetectResult {
  const cleanInput = rawInput.trim();
  if (!cleanInput) {
    return {
      detectedBase: '10',
      validBases: ['10', '2', '8', '16'],
      confidence: 'low',
      reasoning: 'Empty input defaults to Denary (Decimal)',
      hasPrefix: false,
      strippedInput: '',
    };
  }

  // Check prefix explicit hints
  if (/^(?:0x|0X)/.test(cleanInput)) {
    const stripped = cleanInput.replace(/^(?:0x|0X)/, '');
    return {
      detectedBase: '16',
      validBases: ['16'],
      confidence: 'high',
      reasoning: 'Explicit "0x" prefix detected for Hexadecimal',
      hasPrefix: true,
      strippedInput: stripped,
    };
  }

  if (/^(?:0b|0B)/.test(cleanInput)) {
    const stripped = cleanInput.replace(/^(?:0b|0B)/, '');
    return {
      detectedBase: '2',
      validBases: ['2'],
      confidence: 'high',
      reasoning: 'Explicit "0b" prefix detected for Binary',
      hasPrefix: true,
      strippedInput: stripped,
    };
  }

  if (/^(?:0o|0O)/.test(cleanInput)) {
    const stripped = cleanInput.replace(/^(?:0o|0O)/, '');
    return {
      detectedBase: '8',
      validBases: ['8'],
      confidence: 'high',
      reasoning: 'Explicit "0o" prefix detected for Octal',
      hasPrefix: true,
      strippedInput: stripped,
    };
  }

  // Remove optional sign
  const signMatch = cleanInput.match(/^[-+]/);
  const sign = signMatch ? signMatch[0] : '';
  const noSign = cleanInput.replace(/^[-+]/, '');

  // Check character validity across standard bases
  const isBinary = /^[01]*\.?[01]+$/.test(noSign);
  const isOctal = /^[0-7]*\.?[0-7]+$/.test(noSign);
  const isDenary = /^[0-9]*\.?[0-9]+$/.test(noSign);
  const isHex = /^[0-9a-fA-F]*\.?[0-9a-fA-F]+$/.test(noSign);

  const validBases: BaseType[] = [];
  if (isBinary) validBases.push('2');
  if (isOctal) validBases.push('8');
  if (isDenary) validBases.push('10');
  if (isHex) validBases.push('16');

  // Determine most likely base
  if (/[a-fA-F]/.test(noSign)) {
    return {
      detectedBase: '16',
      validBases: ['16'],
      confidence: 'high',
      reasoning: 'Contains hexadecimal letter digits (A-F)',
      hasPrefix: false,
      strippedInput: cleanInput,
    };
  }

  if (/[89]/.test(noSign)) {
    return {
      detectedBase: '10',
      validBases: validBases.includes('10') ? ['10', '16'] : ['16'],
      confidence: 'medium',
      reasoning: 'Contains digits 8 or 9, excluding Binary and Octal',
      hasPrefix: false,
      strippedInput: cleanInput,
    };
  }

  if (/[2-7]/.test(noSign)) {
    return {
      detectedBase: '10',
      validBases: ['8', '10', '16'],
      confidence: 'medium',
      reasoning: 'Contains octal/denary digits (2-7)',
      hasPrefix: false,
      strippedInput: cleanInput,
    };
  }

  if (isBinary) {
    // If it's pure 0s and 1s, binary is most likely unless single digit
    const lengthWithoutDot = noSign.replace('.', '').length;
    const confidence = lengthWithoutDot >= 3 ? 'high' : 'medium';
    return {
      detectedBase: '2',
      validBases: ['2', '8', '10', '16'],
      confidence,
      reasoning: 'Consists exclusively of binary digits (0 and 1)',
      hasPrefix: false,
      strippedInput: cleanInput,
    };
  }

  return {
    detectedBase: '10',
    validBases: validBases.length > 0 ? validBases : ['10'],
    confidence: 'low',
    reasoning: 'Fallback default detection to Denary',
    hasPrefix: false,
    strippedInput: cleanInput,
  };
}

/**
 * Strip prefix and normalize input for processing
 */
export function sanitizeInput(input: string, base: BaseType): string {
  let cleaned = input.trim();
  if (!cleaned) return '';

  // Remove prefix if present
  if (base === '2') cleaned = cleaned.replace(/^(?:0b|0B)/, '');
  if (base === '8') cleaned = cleaned.replace(/^(?:0o|0O)/, '');
  if (base === '16') cleaned = cleaned.replace(/^(?:0x|0X)/, '');

  return cleaned.toUpperCase();
}

/**
 * Validates whether string is valid for given radix
 */
export function isValidForRadix(input: string, radix: number): boolean {
  if (!input) return false;
  const noSign = input.replace(/^[-+]/, '');
  if (!noSign) return false;

  const parts = noSign.split('.');
  if (parts.length > 2) return false; // Multiple decimal points

  for (const part of parts) {
    for (const char of part) {
      const val = DIGITS.indexOf(char.toUpperCase());
      if (val === -1 || val >= radix) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Convert arbitrary base string to Decimal (Base 10) numerical value
 */
export function baseToDecimalValue(input: string, radix: number): {
  integerVal: bigint;
  fractionVal: number;
  isNegative: boolean;
  integerStr: string;
  fractionStr: string;
} {
  const isNegative = input.startsWith('-');
  const clean = input.replace(/^[-+]/, '');
  const [intPart, fracPart = ''] = clean.split('.');

  // Integer part to BigInt
  let integerVal = 0n;
  const bigRadix = BigInt(radix);
  for (let i = 0; i < intPart.length; i++) {
    const digitValue = BigInt(DIGITS.indexOf(intPart[i]));
    integerVal = integerVal * bigRadix + digitValue;
  }

  // Fractional part to number
  let fractionVal = 0;
  for (let i = 0; i < fracPart.length; i++) {
    const digitValue = DIGITS.indexOf(fracPart[i]);
    fractionVal += digitValue / Math.pow(radix, i + 1);
  }

  return {
    integerVal,
    fractionVal,
    isNegative,
    integerStr: intPart || '0',
    fractionStr: fracPart,
  };
}

/**
 * Convert Decimal Integer BigInt to target base string
 */
export function decimalIntToBase(value: bigint, radix: number): string {
  if (value === 0n) return '0';
  let temp = value;
  let result = '';
  const bigRadix = BigInt(radix);

  while (temp > 0n) {
    const remainder = Number(temp % bigRadix);
    result = DIGITS[remainder] + result;
    temp = temp / bigRadix;
  }
  return result || '0';
}

/**
 * Convert Decimal Fraction number (0.xxx) to target base string
 */
export function decimalFracToBase(value: number, radix: number, maxDigits = 10): string {
  if (value <= 0) return '';
  let temp = value;
  let result = '';
  let count = 0;

  while (temp > 0 && count < maxDigits) {
    temp = temp * radix;
    const digit = Math.floor(temp);
    result += DIGITS[digit];
    temp -= digit;
    count++;
    // Stop if tiny precision residual
    if (temp < 1e-12) break;
  }
  return result;
}

/**
 * Master conversion function calculating all bases and step-by-step breakdown
 */
export function convertNumber(
  rawInput: string,
  sourceBase: BaseType,
  targetBaseChoice: BaseType = '10',
  customRadix = 12
): ConversionResult {
  const sanitized = sanitizeInput(rawInput, sourceBase);
  const srcRadix = sourceBase === 'custom' ? customRadix : BASE_OPTIONS[sourceBase].radix;

  if (!sanitized) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid number.',
      sourceBase,
      sourceValue: rawInput,
      normalizedSource: '',
      denary: '0',
      binary: '0',
      octal: '0',
      hexadecimal: '0',
      isNegative: false,
      hasFraction: false,
      integerPart: '0',
      fractionPart: '',
      bitLengthNeeded: 0,
      steps: [],
    };
  }

  if (!isValidForRadix(sanitized, srcRadix)) {
    return {
      isValid: false,
      errorMessage: `Input "${sanitized}" contains characters invalid for Base ${srcRadix} (${sourceBase === 'custom' ? 'Custom' : BASE_OPTIONS[sourceBase].name}).`,
      sourceBase,
      sourceValue: rawInput,
      normalizedSource: sanitized,
      denary: 'Error',
      binary: 'Error',
      octal: 'Error',
      hexadecimal: 'Error',
      isNegative: false,
      hasFraction: false,
      integerPart: '',
      fractionPart: '',
      bitLengthNeeded: 0,
      steps: [],
    };
  }

  // Parse source into Base 10 representation
  const parsed = baseToDecimalValue(sanitized, srcRadix);
  const signPrefix = parsed.isNegative ? '-' : '';

  // Generate values for standard target bases
  const intDenary = parsed.integerVal.toString();
  // Use toFixed (not toString) to avoid scientific notation on very small fractions,
  // then trim trailing zeros introduced by the fixed-precision expansion.
  const fracDenary =
    parsed.fractionVal > 0
      ? parsed.fractionVal.toFixed(15).replace(/^0/, '').replace(/0+$/, '').replace(/^\.$/, '')
      : ''; // e.g. ".625"
  const denaryStr = signPrefix + intDenary + fracDenary;

  const intBin = decimalIntToBase(parsed.integerVal, 2);
  const fracBin = decimalFracToBase(parsed.fractionVal, 2);
  const binaryStr = signPrefix + intBin + (fracBin ? '.' + fracBin : '');

  const intOct = decimalIntToBase(parsed.integerVal, 8);
  const fracOct = decimalFracToBase(parsed.fractionVal, 8);
  const octalStr = signPrefix + intOct + (fracOct ? '.' + fracOct : '');

  const intHex = decimalIntToBase(parsed.integerVal, 16);
  const fracHex = decimalFracToBase(parsed.fractionVal, 16);
  const hexStr = signPrefix + intHex + (fracHex ? '.' + fracHex : '');

  const intCustom = decimalIntToBase(parsed.integerVal, customRadix);
  const fracCustom = decimalFracToBase(parsed.fractionVal, customRadix);
  const customStr = signPrefix + intCustom + (fracCustom ? '.' + fracCustom : '');

  const bitLengthNeeded = intBin.length;

  // Generate Step-by-Step Breakdown for the specified Target Base
  const targetRadix = targetBaseChoice === 'custom' 
    ? customRadix 
    : BASE_OPTIONS[targetBaseChoice]?.radix || 10;
  
  const steps = generateStepBreakdown({
    sourceBase,
    srcRadix,
    targetBase: targetBaseChoice,
    targetRadix,
    sanitizedInput: sanitized,
    parsed,
    denaryInt: parsed.integerVal,
    denaryFrac: parsed.fractionVal,
    resultStr: targetBaseChoice === '2' ? binaryStr 
             : targetBaseChoice === '8' ? octalStr 
             : targetBaseChoice === '16' ? hexStr 
             : targetBaseChoice === 'custom' ? customStr 
             : denaryStr,
  });

  return {
    isValid: true,
    sourceBase,
    sourceValue: rawInput,
    normalizedSource: sanitized,
    denary: denaryStr,
    binary: binaryStr,
    octal: octalStr,
    hexadecimal: hexStr,
    customBaseValue: customStr,
    customRadix,
    isNegative: parsed.isNegative,
    hasFraction: parsed.fractionVal > 0,
    integerPart: parsed.integerStr,
    fractionPart: parsed.fractionStr,
    bitLengthNeeded,
    steps,
  };
}

interface StepGenParams {
  sourceBase: BaseType;
  srcRadix: number;
  targetBase: BaseType;
  targetRadix: number;
  sanitizedInput: string;
  parsed: ReturnType<typeof baseToDecimalValue>;
  denaryInt: bigint;
  denaryFrac: number;
  resultStr: string;
}

/**
 * Builds clear, educational, mathematically rigorous steps
 */
function generateStepBreakdown(params: StepGenParams): StepDetail[] {
  const {
    sourceBase,
    srcRadix,
    targetBase,
    targetRadix,
    sanitizedInput,
    parsed,
    denaryInt,
    denaryFrac,
    resultStr,
  } = params;

  const steps: StepDetail[] = [];

  // If source and target are identical
  if (srcRadix === targetRadix) {
    steps.push({
      title: 'Identical Base Selected',
      type: 'info',
      explanation: `Source base (Base ${srcRadix}) and target base (Base ${targetRadix}) are identical. No mathematical transformation is needed.`,
      finalResult: sanitizedInput,
    });
    return steps;
  }

  // Shortcut 1: Binary <-> Octal (3-bit grouping)
  if ((srcRadix === 2 && targetRadix === 8) || (srcRadix === 8 && targetRadix === 2)) {
    if (srcRadix === 2 && targetRadix === 8) {
      steps.push(...generateBinaryToOctalSteps(parsed.integerStr, parsed.fractionStr));
      return steps;
    } else if (srcRadix === 8 && targetRadix === 2) {
      steps.push(...generateOctalToBinarySteps(parsed.integerStr, parsed.fractionStr));
      return steps;
    }
  }

  // Shortcut 2: Binary <-> Hexadecimal (4-bit nibble grouping)
  if ((srcRadix === 2 && targetRadix === 16) || (srcRadix === 16 && targetRadix === 2)) {
    if (srcRadix === 2 && targetRadix === 16) {
      steps.push(...generateBinaryToHexSteps(parsed.integerStr, parsed.fractionStr));
      return steps;
    } else if (srcRadix === 16 && targetRadix === 2) {
      steps.push(...generateHexToBinarySteps(parsed.integerStr, parsed.fractionStr));
      return steps;
    }
  }

  // General Path:
  // Step 1: Convert Source Base -> Decimal (Base 10) (if source is not already Base 10)
  if (srcRadix !== 10) {
    steps.push(...generateBaseToDecimalSteps(sanitizedInput, srcRadix, parsed));
  }

  // Step 2: Convert Decimal (Base 10) -> Target Base (if target is not Base 10)
  if (targetRadix !== 10) {
    steps.push(...generateDecimalToBaseSteps(denaryInt, denaryFrac, targetRadix, resultStr));
  }

  return steps;
}

/**
 * Step 1: Base X -> Decimal (Positional Weight Expansion)
 */
function generateBaseToDecimalSteps(
  input: string,
  radix: number,
  parsed: ReturnType<typeof baseToDecimalValue>
): StepDetail[] {
  const steps: StepDetail[] = [];
  const cleanInt = parsed.integerStr;
  const cleanFrac = parsed.fractionStr;

  // Integer Positional Weight Table
  const intRows: (string | number)[][] = [];
  const equationTerms: string[] = [];
  let currentPower = cleanInt.length - 1;

  for (let i = 0; i < cleanInt.length; i++) {
    const digitChar = cleanInt[i];
    const digitVal = DIGITS.indexOf(digitChar);
    const weight = Math.pow(radix, currentPower);
    const termValue = BigInt(digitVal) * BigInt(Math.pow(radix, currentPower));

    intRows.push([
      digitChar,
      `Position ${currentPower}`,
      `${radix}^${currentPower} = ${weight}`,
      `${digitVal} × ${weight}`,
      termValue.toString(),
    ]);

    equationTerms.push(`(${digitChar} × ${radix}<sup>${currentPower}</sup>)`);
    currentPower--;
  }

  steps.push({
    title: `Step 1: Convert Integer Part from Base ${radix} to Decimal (Base 10)`,
    type: 'positional',
    explanation: `Expand digits by positional weights $d_n \\times r^n$ where $r = ${radix}$ and sum the products:`,
    tableData: {
      headers: ['Digit', 'Power Position', 'Weight Value', 'Calculation', 'Subtotal'],
      rows: intRows,
    },
    equationLines: [
      `Positional Sum: ${equationTerms.join(' + ')}`,
      `Decimal Integer Total = ${parsed.integerVal.toString()}`,
    ],
    finalResult: parsed.integerVal.toString(),
  });

  // Fractional Positional Weight Expansion if present
  if (cleanFrac) {
    const fracRows: (string | number)[][] = [];
    const fracTerms: string[] = [];

    for (let i = 0; i < cleanFrac.length; i++) {
      const digitChar = cleanFrac[i];
      const digitVal = DIGITS.indexOf(digitChar);
      const negPower = -(i + 1);
      const weight = Math.pow(radix, negPower);
      const termValue = digitVal * weight;

      fracRows.push([
        digitChar,
        `Position ${negPower}`,
        `${radix}^(${negPower}) ≈ ${weight.toFixed(6)}`,
        `${digitVal} × ${weight.toFixed(6)}`,
        termValue.toFixed(6),
      ]);

      fracTerms.push(`(${digitChar} × ${radix}<sup>${negPower}</sup>)`);
    }

    steps.push({
      title: `Step 1b: Convert Fractional Part from Base ${radix} to Decimal (Base 10)`,
      type: 'positional',
      explanation: `Expand fractional digits using negative powers $d_{-i} \\times r^{-i}$:`,
      tableData: {
        headers: ['Fraction Digit', 'Power Position', 'Weight', 'Calculation', 'Subtotal'],
        rows: fracRows,
      },
      equationLines: [
        `Fractional Sum: ${fracTerms.join(' + ')}`,
        `Decimal Fractional Total ≈ ${parsed.fractionVal.toString()}`,
      ],
      finalResult: (parsed.integerVal.toString() + '.' + parsed.fractionVal.toString().substring(2)),
    });
  }

  return steps;
}

/**
 * Step 2: Decimal (Base 10) -> Target Base (Repeated Division & Multiplication)
 */
function generateDecimalToBaseSteps(
  intVal: bigint,
  fracVal: number,
  targetRadix: number,
  finalResult: string
): StepDetail[] {
  const steps: StepDetail[] = [];

  // Integer Part: Repeated Division Algorithm
  const divRows: (string | number)[][] = [];
  let tempInt = intVal;
  const bigRadix = BigInt(targetRadix);
  const remainderDigits: string[] = [];

  if (tempInt === 0n) {
    divRows.push(['0', `÷ ${targetRadix}`, '0', '0', '0']);
    remainderDigits.push('0');
  } else {
    let stepNum = 1;
    while (tempInt > 0n) {
      const quotient = tempInt / bigRadix;
      const remainder = Number(tempInt % bigRadix);
      const digitChar = DIGITS[remainder];
      remainderDigits.unshift(digitChar); // Reversing remainder digits

      divRows.push([
        `Step ${stepNum}`,
        `${tempInt.toString()} ÷ ${targetRadix}`,
        quotient.toString(),
        remainder.toString(),
        `Digit '${digitChar}'`,
      ]);

      tempInt = quotient;
      stepNum++;
    }
  }

  steps.push({
    title: `Step 2: Convert Decimal Integer (${intVal.toString()}) to Base ${targetRadix}`,
    type: 'division',
    explanation: `Perform successive division by Base ${targetRadix}. Collect remainders from last to first (bottom-up):`,
    tableData: {
      headers: ['Iteration', 'Operation', 'Quotient', 'Remainder', 'Base Digit'],
      rows: divRows,
    },
    equationLines: [
      `Collected Remainders (Bottom to Top): ${remainderDigits.join('')}`,
      `Base ${targetRadix} Integer Result: ${remainderDigits.join('')}`,
    ],
    finalResult: remainderDigits.join(''),
  });

  // Fractional Part: Repeated Multiplication Algorithm
  if (fracVal > 0) {
    const multRows: (string | number)[][] = [];
    let currentFrac = fracVal;
    const fracDigits: string[] = [];
    let stepNum = 1;

    while (currentFrac > 0 && stepNum <= 8) {
      const multiplied = currentFrac * targetRadix;
      const intDigit = Math.floor(multiplied);
      const charDigit = DIGITS[intDigit];
      fracDigits.push(charDigit);

      const nextFrac = multiplied - intDigit;

      multRows.push([
        `Step ${stepNum}`,
        `${currentFrac.toFixed(6)} × ${targetRadix}`,
        multiplied.toFixed(6),
        intDigit,
        `Digit '${charDigit}'`,
      ]);

      currentFrac = nextFrac;
      stepNum++;
    }

    steps.push({
      title: `Step 2b: Convert Decimal Fraction (${fracVal}) to Base ${targetRadix}`,
      type: 'multiplication',
      explanation: `Multiply fractional part successively by Base ${targetRadix} and record integer parts top-down:`,
      tableData: {
        headers: ['Iteration', 'Operation', 'Product', 'Integer Part', 'Base Digit'],
        rows: multRows,
      },
      equationLines: [
        `Collected Integer Parts (Top to Bottom): .${fracDigits.join('')}`,
        `Combined Base ${targetRadix} Fractional Result: .${fracDigits.join('')}`,
      ],
      finalResult: `.${fracDigits.join('')}`,
    });
  }

  return steps;
}

/**
 * Binary -> Octal Direct 3-Bit Grouping
 */
function generateBinaryToOctalSteps(intBin: string, fracBin: string): StepDetail[] {
  // Pad integer left to multiple of 3
  const intPadLen = Math.ceil(intBin.length / 3) * 3 || 3;
  const paddedInt = intBin.padStart(intPadLen, '0');

  const intGroups: string[] = [];
  const octalDigits: string[] = [];
  const tableRows: (string | number)[][] = [];

  for (let i = 0; i < paddedInt.length; i += 3) {
    const chunk = paddedInt.slice(i, i + 3);
    const octVal = parseInt(chunk, 2);
    intGroups.push(chunk);
    octalDigits.push(octVal.toString());

    tableRows.push([chunk, `${chunk[0]}×4 + ${chunk[1]}×2 + ${chunk[2]}×1`, octVal]);
  }

  return [
    {
      title: 'Direct Fast Step: 3-Bit Binary Grouping to Octal',
      type: 'bitgroup',
      explanation: 'Since 8 = 2³, every 3 binary bits correspond directly to 1 octal digit. Group binary bits from right-to-left in triplets of 3:',
      tableData: {
        headers: ['Binary 3-Bit Triplet', 'Weight Calculation (4-2-1)', 'Octal Digit'],
        rows: tableRows,
      },
      equationLines: [
        `Grouped Binary: ${intGroups.join('  |  ')}`,
        `Octal Digits:    ${octalDigits.join('     |  ')}`,
      ],
      finalResult: octalDigits.join(''),
    },
  ];
}

/**
 * Octal -> Binary Direct Expansion
 */
function generateOctalToBinarySteps(intOct: string, fracOct: string): StepDetail[] {
  const tableRows: (string | number)[][] = [];
  const binaryTriplets: string[] = [];

  for (let i = 0; i < intOct.length; i++) {
    const octDigit = intOct[i];
    const val = parseInt(octDigit, 8);
    const binChunk = val.toString(2).padStart(3, '0');

    tableRows.push([octDigit, val, binChunk]);
    binaryTriplets.push(binChunk);
  }

  return [
    {
      title: 'Direct Fast Step: Octal Digits to 3-Bit Binary Triplets',
      type: 'bitgroup',
      explanation: 'Expand each individual Octal digit into its exact 3-bit binary equivalent:',
      tableData: {
        headers: ['Octal Digit', 'Decimal Value', '3-Bit Binary Representation'],
        rows: tableRows,
      },
      equationLines: [
        `Octal Digits:   ${intOct.split('').join('      ')}`,
        `Binary Triplets: ${binaryTriplets.join('  ')}`,
      ],
      finalResult: binaryTriplets.join(''),
    },
  ];
}

/**
 * Binary -> Hexadecimal Direct 4-Bit Nibble Grouping
 */
function generateBinaryToHexSteps(intBin: string, fracBin: string): StepDetail[] {
  const padLen = Math.ceil(intBin.length / 4) * 4 || 4;
  const paddedInt = intBin.padStart(padLen, '0');

  const groups: string[] = [];
  const hexDigits: string[] = [];
  const tableRows: (string | number)[][] = [];

  for (let i = 0; i < paddedInt.length; i += 4) {
    const chunk = paddedInt.slice(i, i + 4);
    const val = parseInt(chunk, 2);
    const hexChar = DIGITS[val];
    groups.push(chunk);
    hexDigits.push(hexChar);

    tableRows.push([
      chunk,
      `${chunk[0]}×8 + ${chunk[1]}×4 + ${chunk[2]}×2 + ${chunk[3]}×1`,
      val,
      hexChar,
    ]);
  }

  return [
    {
      title: 'Direct Fast Step: 4-Bit Nibble Grouping to Hexadecimal',
      type: 'bitgroup',
      explanation: 'Since 16 = 2⁴, every 4 binary bits (a Nibble) correspond directly to 1 hexadecimal digit. Group binary bits from right-to-left in quads of 4:',
      tableData: {
        headers: ['4-Bit Nibble', 'Weight Calculation (8-4-2-1)', 'Decimal Value', 'Hex Digit'],
        rows: tableRows,
      },
      equationLines: [
        `Grouped Nibbles: ${groups.join('  |  ')}`,
        `Hexadecimal:     ${hexDigits.join('     |  ')}`,
      ],
      finalResult: hexDigits.join(''),
    },
  ];
}

/**
 * Hexadecimal -> Binary Direct 4-Bit Expansion
 */
function generateHexToBinarySteps(intHex: string, fracHex: string): StepDetail[] {
  const tableRows: (string | number)[][] = [];
  const binaryQuads: string[] = [];

  for (let i = 0; i < intHex.length; i++) {
    const hexChar = intHex[i];
    const val = DIGITS.indexOf(hexChar);
    const binChunk = val.toString(2).padStart(4, '0');

    tableRows.push([hexChar, val, binChunk]);
    binaryQuads.push(binChunk);
  }

  return [
    {
      title: 'Direct Fast Step: Hexadecimal to 4-Bit Binary Quads',
      type: 'bitgroup',
      explanation: 'Expand each Hexadecimal character into its exact 4-bit nibble binary representation:',
      tableData: {
        headers: ['Hex Character', 'Decimal Value', '4-Bit Binary Nibble'],
        rows: tableRows,
      },
      equationLines: [
        `Hex Input:   ${intHex.split('').join('       ')}`,
        `Binary Quads: ${binaryQuads.join('  ')}`,
      ],
      finalResult: binaryQuads.join(''),
    },
  ];
}

/**
 * Two's Complement signed calculation generator
 */
export function calculateTwosComplement(numValue: number, bitWidth = 8): {
  binaryStr: string;
  positiveBinary: string;
  onesComplement: string;
  twosComplement: string;
  hexStr: string;
  steps: StepDetail[];
} {
  const maxVal = Math.pow(2, bitWidth - 1) - 1;
  const minVal = -Math.pow(2, bitWidth - 1);

  if (numValue > maxVal || numValue < minVal) {
    return {
      binaryStr: 'Overflow',
      positiveBinary: '',
      onesComplement: '',
      twosComplement: '',
      hexStr: '',
      steps: [
        {
          title: `Bit Width Overflow (${bitWidth}-bit)`,
          type: 'info',
          explanation: `The value ${numValue} exceeds the signed ${bitWidth}-bit range [${minVal} to ${maxVal}]. Increase bit width to 16-bit or 32-bit.`,
        },
      ],
    };
  }

  const absVal = Math.abs(numValue);
  const posBin = absVal.toString(2).padStart(bitWidth, '0');

  if (numValue >= 0) {
    const hex = parseInt(posBin, 2).toString(16).toUpperCase().padStart(bitWidth / 4, '0');
    return {
      binaryStr: posBin,
      positiveBinary: posBin,
      onesComplement: posBin,
      twosComplement: posBin,
      hexStr: hex,
      steps: [
        {
          title: `Positive Signed ${bitWidth}-bit Integer`,
          type: 'twos_complement',
          explanation: `For non-negative numbers (${numValue}), Two's Complement representation is identical to standard unsigned binary representation padded to ${bitWidth} bits.`,
          finalResult: posBin,
        },
      ],
    };
  }

  // Negative number Two's Complement computation
  const onesComp = posBin.split('').map(b => (b === '0' ? '1' : '0')).join('');
  const rawTwosInt = (BigInt(1) << BigInt(bitWidth)) - BigInt(absVal);
  const twosComp = rawTwosInt.toString(2).padStart(bitWidth, '0');
  const hexVal = rawTwosInt.toString(16).toUpperCase().padStart(bitWidth / 4, '0');

  const steps: StepDetail[] = [
    {
      title: `Step 1: Write Positive Magnitude (${absVal}) in ${bitWidth}-bit Binary`,
      type: 'twos_complement',
      explanation: `Convert absolute value +${absVal} to binary and left-pad with zeros to fill ${bitWidth} bits:`,
      finalResult: posBin,
    },
    {
      title: `Step 2: Invert All Bits (1's Complement)`,
      type: 'twos_complement',
      explanation: `Flip every 0 to 1 and every 1 to 0 across all ${bitWidth} bits:`,
      equationLines: [
        `Positive Bits: ${posBin}`,
        `Inverted Bits: ${onesComp}`,
      ],
      finalResult: onesComp,
    },
    {
      title: `Step 3: Add 1 to Inverted Bits (2's Complement)`,
      type: 'twos_complement',
      explanation: `Add 1 to the 1's complement bit pattern to complete signed negative representation:`,
      equationLines: [
        `  ${onesComp}  (1's Complement)`,
        `+ ${'1'.padStart(bitWidth, '0')}  (Add 1)`,
        `= ${twosComp}  (2's Complement Result)`,
      ],
      finalResult: twosComp,
    },
  ];

  return {
    binaryStr: twosComp,
    positiveBinary: posBin,
    onesComplement: onesComp,
    twosComplement: twosComp,
    hexStr: hexVal,
    steps,
  };
}

/**
 * Text (ASCII / UTF-8) to Hex/Binary/Decimal converter
 */
export function textToNumberSystems(text: string): {
  asciiCodes: number[];
  binaryList: string[];
  hexList: string[];
  octalList: string[];
  fullBinary: string;
  fullHex: string;
} {
  const asciiCodes: number[] = [];
  const binaryList: string[] = [];
  const hexList: string[] = [];
  const octalList: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    asciiCodes.push(code);
    binaryList.push(code.toString(2).padStart(8, '0'));
    hexList.push(code.toString(16).toUpperCase().padStart(2, '0'));
    octalList.push(code.toString(8).padStart(3, '0'));
  }

  return {
    asciiCodes,
    binaryList,
    hexList,
    octalList,
    fullBinary: binaryList.join(' '),
    fullHex: hexList.join(' '),
  };
}
