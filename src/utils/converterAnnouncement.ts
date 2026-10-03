import { BaseType, ConversionResult } from '../types';

/** Long values are cut for speech: 1,000 digits read aloud is not an announcement. */
const MAX_SPOKEN_CHARS = 32;
/** Pause after the last keystroke before anything is announced. */
export const ANNOUNCE_DELAY_MS = 700;

function shorten(value: string): string {
  return value.length > MAX_SPOKEN_CHARS
    ? `${value.slice(0, MAX_SPOKEN_CHARS)}… (${value.length} characters)`
    : value;
}

function baseName(base: BaseType, customRadix: number): string {
  switch (base) {
    case '2': return 'binary';
    case '8': return 'octal';
    case '10': return 'decimal';
    case '16': return 'hexadecimal';
    default: return `base ${customRadix}`;
  }
}

function resultFor(conversion: ConversionResult, target: BaseType): string {
  switch (target) {
    case '2': return conversion.binary;
    case '8': return conversion.octal;
    case '16': return conversion.hexadecimal;
    case 'custom': return conversion.customBaseValue ?? '';
    default: return conversion.denary;
  }
}

export interface AnnouncementInput {
  conversion: ConversionResult;
  targetBase: BaseType;
  customRadix: number;
  /** The typed text (used to suppress announcements for an empty field). */
  inputText: string;
  /** True when the text is also valid as Decimal but was read as Binary. */
  ambiguous: boolean;
}

/**
 * The two short sentences a screen reader should hear about the converter:
 * a polite result summary, or an assertive error. Exactly one is non-empty.
 * Pure, so it can be tested without a DOM.
 */
export function buildConverterAnnouncement({
  conversion, targetBase, customRadix, inputText, ambiguous,
}: AnnouncementInput): { result: string; error: string } {
  if (!inputText.trim()) return { result: '', error: '' };
  // Mid-entry text ("-", "0.", a bare "0x") is not an error: say so politely,
  // never through the assertive alert region.
  if (conversion.incompleteHint) return { result: conversion.incompleteHint, error: '' };
  if (!conversion.isValid) {
    return { result: '', error: conversion.errorMessage ?? 'Invalid input.' };
  }
  const from = baseName(conversion.sourceBase, customRadix);
  const to = baseName(targetBase, customRadix);
  const readAs = ambiguous ? ` Read as ${from}; also valid as decimal.` : '';
  return {
    result: `Converted result: ${shorten(inputText.trim())} ${from} equals ${shorten(resultFor(conversion, targetBase))} ${to}.${readAs}`,
    error: '',
  };
}
