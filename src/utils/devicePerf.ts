export type PerfTier = 'high' | 'low';

/**
 * Coarse, cheap, synchronous heuristic for whether this device can
 * comfortably afford the full visual treatment (composited backdrop blur,
 * the post-process warp/flame shader, a denser particle field) or should
 * get the lighter build instead.
 *
 * There's no reliable "GPU benchmark" API available synchronously at
 * startup, so this leans on a handful of cheap, widely-supported signals
 * that correlate reasonably well with weaker hardware: a coarse (touch)
 * pointer, a small viewport, a low logical core count, and (where exposed)
 * a low device-memory estimate. It errs toward 'low' when signals are
 * mixed — a low-tier device stuck with the full-fat scene is a much worse
 * experience than a high-tier device getting the lighter one.
 */
export function getPerfTier(): PerfTier {
  if (typeof window === 'undefined') return 'high';

  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const smallViewport = window.innerWidth < 768;
  const fewCores =
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4;
  // Chrome/Edge/Android expose this as a rough RAM estimate in GB; Safari
  // and Firefox don't implement it, so it's treated as "unknown" (false)
  // rather than penalizing browsers that simply don't report it.
  const lowMemory =
    typeof navigator !== 'undefined' &&
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number' &&
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4;

  const lowSignals = [coarsePointer, smallViewport, fewCores, lowMemory].filter(Boolean).length;
  return lowSignals >= 2 ? 'low' : 'high';
}
