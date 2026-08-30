<img width="6440" height="1640" alt="banner" src="https://github.com/user-attachments/assets/5d1032ad-915a-4461-8537-643b6253a91e" />


> An interactive toolkit for exploring number systems, binary arithmetic, bit-level manipulation, and text encoding; with every result backed by a live, step-by-step derivation.

**[🚀 Live Demo](https://bitforge-tool.vercel.app/)**

![Live Demo](https://img.shields.io/badge/demo-live-34E89A?style=flat-square)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)
![Three.js](https://img.shields.io/badge/Three.js-r143-000000?style=flat-square&logo=three.js)

BitForge brings base conversion, bit-level manipulation, binary arithmetic, two's complement, and ASCII/UTF-8 encoding into one browser-based tool — built for anyone who'd rather *see* a conversion happen than read about it. Everything runs entirely client-side; there's no application backend involved.

---

## Features

| Mode | What it does |
|---|---|
| 🔢 **Number Converter** | Convert between Decimal, Binary, Octal, Hex, and a custom base (2–36). Auto-detects format from `0x` / `0b` / `0o` prefixes, supports fractional values and negative numbers, and shows every base live alongside a full positional-weight, repeated-division, or bit-grouping derivation. |
| ➗ **Binary Operations** | Add, subtract, multiply, and divide raw binary values at a chosen bit width (4/8/16/32/64-bit). Every operation shows its full bit-by-bit trace — ripple-carry addition, two's-complement subtraction, shift-and-add multiplication, restoring long division — plus carry, borrow, and overflow flags. |
| 🧩 **Interactive Bit Grid** | A clickable 8/16/32-bit matrix. Toggle bits directly or use Invert, Shift Left/Right, Clear, and Set All. Live unsigned, signed, hex, and octal readouts, each copyable. |
| ➕ **Two's Complement Engine** | Enter a signed decimal integer and get its two's complement binary/hex at a chosen width, with range/overflow detection, an invert-and-add-one breakdown, and boundary-value presets. |
| 🔤 **Text & UTF-8 Encoding** | Encode text into real UTF-8 bytes — decimal, binary, hex, and octal per byte, plus combined byte streams for the full string — correctly handling accented characters, emoji, and anything outside plain ASCII, with each character flagged as ASCII or not. |

**Also included:** a searchable, persistent Activity History across all five tools; one-click copy and share (Web Share API, with a clipboard fallback) for any result; a keyboard-shortcut reference dialog (`?`); and an animated background that adapts its rendering cost to the device it's running on.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.8 (strict mode) |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Background Rendering | Three.js r143 (custom WebGL shader scene, adaptive quality) |
| Icons | lucide-react |
| Deployment | Vercel |

---

## Project Architecture

```text
BitForge/
├── index.html
├── public/
│   └── favicon.svg                   # BitForge monogram, also used as the site favicon
├── src/
│   ├── main.tsx                      # React entry point; sets device performance tier pre-render
│   ├── App.tsx                       # Root component, mode routing & layout
│   ├── index.css                     # Global styles, theme tokens, glass utilities
│   ├── types.ts                      # Shared TypeScript types
│   ├── utils/
│   │   ├── converter.ts              # Base conversion, auto-detection & two's complement
│   │   ├── binaryOps.ts              # Bit-accurate add/sub/mul/div engine + step traces
│   │   ├── downloadUtils.ts          # History export (CSV / JSON / TXT)
│   │   ├── shareUtils.ts             # Web Share API + clipboard-copy fallback
│   │   └── devicePerf.ts             # Lightweight device-capability heuristic
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts   # Global shortcut bindings, input-aware
│   │   ├── useFocusTrap.ts           # Modal focus management (trap, auto-focus, restore)
│   │   └── useAutoResetTimer.ts      # Timed UI-state resets (e.g. "Copied!" labels)
│   ├── context/
│   │   ├── HistoryContext.tsx        # Activity History state, persistence & validation
│   │   └── ShortcutTargetContext.tsx # Routes shortcuts to the active tool
│   ├── three/
│   │   └── FlowWaveScene.ts          # Animated WebGL background (Three.js, tiered quality)
│   └── components/
│       ├── Header.tsx                # Top nav, mode switcher & logo
│       ├── BitForgeLogo.tsx          # BitForge monogram (SVG)
│       ├── FlowWaveBackground.tsx    # React mount point for the animated background
│       ├── WelcomeBanner.tsx         # First-time user onboarding guide
│       ├── HistoryPanel.tsx          # Activity History slide-over panel
│       ├── ShortcutsHelpDialog.tsx   # Keyboard shortcut reference dialog
│       ├── ShareButton.tsx           # Shared copy/share control used across every tool
│       ├── PresetsBar.tsx            # Quick-select preset values
│       ├── ConversionInput.tsx       # Base input & auto-detect panel
│       ├── LiveBasesGrid.tsx         # All-bases live output grid
│       ├── StepByStepBreakdown.tsx   # Conversion derivation steps
│       ├── BinaryOperationsCard.tsx  # Binary arithmetic UI + derivation tables
│       ├── BitGridVisualizer.tsx     # Interactive bit grid (8/16/32-bit)
│       ├── TwosComplementCard.tsx    # Signed integer / two's complement engine
│       ├── AsciiConverterCard.tsx    # Text ↔ UTF-8/binary/hex/octal encoder
│       └── Footer.tsx                # Status footer bar
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) 18+, npm

```bash
git clone <repository-url>
cd BitForge
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build       # outputs to dist/
npm run preview      # preview the production build
```

---

## Changelog

All notable changes to this project are documented below, newest first.

### v4.0.0 — Correctness Audit, Accessibility Pass & Adaptive Performance

**Added**
- **BitForge logo** — a custom monogram (blocky "B" + flag-shaped "F", bit-pixel accents, anvil base) replacing the generic "BF" text badge, used in the header and shipped as an SVG favicon.
- **Export & Share** — copy or share any result (via the Web Share API where supported, falling back to clipboard copy) from every tool.
- **Keyboard shortcuts** with an accessible, focus-trapped reference dialog (`?`).

**Changed**
- **"Conversion History" renamed to "Activity History"** to match its actual behavior — entries are logged when a result is copied or shared, not on every keystroke.
- **FlowWave background now adapts to device capability.** A lightweight heuristic (pointer type, viewport size, core count, device memory) picks between a full-fidelity path — post-process warp shader, DPR up to 1.5, a denser particle field — on capable hardware, and a lighter path with no post-processing, DPR capped at 1, and fewer particles on mobile or low-power devices. The point-cloud wave itself, `prefers-reduced-motion` support, and the tab-visibility render pause are unchanged either way.
- Backdrop-filter blur is now disabled on lower-power devices project-wide — re-compositing a blurred glass panel over an animating canvas on every frame is one of the more expensive things a weak mobile GPU can be asked to do.
- **TypeScript strict mode** enabled project-wide, along with the `@types/react`, `@types/react-dom`, and `@types/three` dev dependencies needed to actually type-check the app's own React and Three.js usage (previously silently falling back to `any`).
- Corrected footer/header status text: removed a fabricated "LATENCY: 0.001ms" reading that didn't measure anything real, removed the "CLIENT-SIDE · NO SERVER REQUIRED" claim now that the app is deployed on Vercel, and renamed "64-BIT EXACT" to "INTEGER ENGINE: EXACT" — shown once, in the footer — since only integer arithmetic is exact (fractional conversion still uses floating-point).

**Fixed**
- Binary→Octal and Binary→Hex step-by-step derivations silently dropped the fractional part of the number from the on-screen working (the final answer was already correct — only the shown steps weren't). Both directions, plus the reverse Octal→Binary and Hex→Binary derivations, now display explicit integer- and fraction-part grouping steps and a step combining them across the binary point.
- Negative-number derivations gave no indication of where the sign went; the breakdown now includes explicit "separate sign and magnitude" and "reattach sign" steps.
- `.`, `+.`, and `-.` were incorrectly accepted as valid numeric input (silently evaluating to zero); `.5` and `5.` remain valid, as intended.
- The Text/UTF-8 encoder read input as raw UTF-16 code units rather than real UTF-8 bytes, producing incorrect values for any non-ASCII character. It now encodes with `TextEncoder` and correctly reports which characters are and aren't ASCII.
- Activity History entries loaded from `localStorage` are now validated against their expected shape at runtime; a malformed or outdated entry is discarded individually instead of risking a crash or corrupting the whole list.
- A latent type bug in the Binary Operations card — three result-display components resolved to TypeScript's `never` type via a conditional-type pattern that TypeScript never distributes over a concrete union — had been silently masked by the missing `@types/react` dependency above, and only surfaced once that dependency and strict mode were both in place. Fixed by referencing the already-exported result types directly.
- Several clickable elements were built from `<div>`s with no keyboard support. The homepage feature cards are now real `<button>` elements; the base-selector cards (which contain a nested interactive control, so can't themselves be a `<button>`) now use `role="button"` with full keyboard handling.
- Icon-only buttons throughout the app (copy, close, remove, reuse, shortcuts, history) had no accessible name for assistive technology; all now carry descriptive `aria-label`s.
- The Activity History panel and Keyboard Shortcuts dialog didn't manage focus at all: opening one didn't move focus into it, <kbd>Tab</kbd> could escape to the page behind it, and closing didn't return focus to whatever opened it. Both now auto-focus on open, trap <kbd>Tab</kbd>/<kbd>Shift+Tab</kbd> within the dialog, and restore focus on close, via a new shared `useFocusTrap` hook.

### v3.0.0 — Performance Overhaul & Conversion History

**Fixed**
- **Background performance** — the animated Three.js scene was rendering two entirely dead post-processing passes every frame (nothing was ever assigned to the layers they read from, so they composited pure black with zero visual effect). Removed both, along with cutting the particle-field geometry from ~120,000 vertices to ~4,700, disabling an unused shadow map, fixing a resize bug in the mote shader's resolution uniform, and capping device pixel ratio — eliminating the input lag and navigation stutter introduced in v2.0.0.
- Added a tab-visibility pause and `prefers-reduced-motion` handling so the render loop stops entirely when the tab is hidden or motion is disabled at the OS level, instead of continuing to render in the background.
- Fixed real GPU resource leaks — geometries and materials were never disposed on unmount/remount.
- **Binary Operations bit-index labeling** — the trace table's bit-position column and its LSB/MSB labels were computed from inverted conventions, so labels landed on the wrong rows.
- **Invisible dark-mode info panel** — the Number Converter's bottom reference panel was unreadable (near-white text on a white background) due to a Tailwind dark-variant that silently failed to compile for a custom utility class.
- **Inconsistent scrollbars** — hidden-scrollbar styling was only applied to one of several scrollable containers (including the main mode-navigation bar); now applied consistently everywhere content can overflow horizontally.
- Minor UI/UX pass: corrected a stale version number in the footer, fixed a non-functional entrance animation on the welcome banner, and added `aria-current`/`aria-pressed` states to mode tabs, base selectors, and toggle buttons for screen-reader clarity.

**Added**
- **Conversion History** — a searchable, filterable history panel (opened from the header, with a live count badge) recording input, output, and operation across all five tools. Entries persist across sessions via `localStorage`, support per-entry removal or bulk clearing, and Number Converter entries can be reused with one click. Logged automatically whenever a result is copied.

### v2.0.0 — Premium Emerald UI & Binary Operations

**Added**
- **Binary Operations mode** — bit-accurate binary add, subtract, multiply, and divide, each with a full step-by-step derivation table (ripple-carry adder, two's-complement subtraction, shift-and-add multiplication, restoring long division) and carry/borrow/overflow flags. Powered by a new `BigInt`-based arithmetic engine (`utils/binaryOps.ts`) supporting 4- to 64-bit widths.
- **Animated background** — a custom Three.js particle-wave scene (emerald/mint palette, noise-driven motion, bloom post-processing, pointer parallax) rendered behind the entire app.
- **Glass design system** — reusable `glass-panel` / `mint-glow` utility classes for translucent, backdrop-blurred surfaces used across every card and panel.
- A 5th onboarding card in the Welcome banner introducing Binary Operations.

**Changed**
- Full color palette re-themed from the previous plum/teal scheme to a deep-emerald/mint palette (`#02160c → #34E89A`), applied consistently across every component.
- Header, footer, and navigation converted from solid panels to translucent, blurred glass surfaces.
- The app now renders in the premium dark theme at all times, rather than following the OS light/dark preference.

**Removed**
- Automatic light/dark theme switching based on system preference — superseded by the always-on premium theme.

### v1.0.0 — Initial Release

- Number System Converter (Decimal / Binary / Octal / Hex / custom base 2–36)
- Interactive 8/16/32-bit Bit Grid with shift, invert, and set/clear operations
- Two's Complement engine with overflow detection and boundary presets
- Text & ASCII encoder with binary/hex/octal byte streams
- Step-by-step derivations for every conversion
---
## Author
**Syed Shaheer Ali**  
BSCS, 1st Year    
Bahria University Karachi
