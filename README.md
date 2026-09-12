<img width="3282" height="1312" alt="Cartoon banner (1)" src="https://github.com/user-attachments/assets/903e4220-766c-4af6-a10d-b3497690d4cf" />


> An interactive toolkit for exploring number systems, binary arithmetic, bit-level manipulation, and text encoding; with every result backed by a live, step-by-step derivation.

**[Live Demo](https://bitforge-tool.vercel.app/)**

![Live Demo](https://img.shields.io/badge/demo-live-34E89A?style=flat-square)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)
![Three.js](https://img.shields.io/badge/Three.js-r143-000000?style=flat-square&logo=three.js)

BitForge brings base conversion, bit-level manipulation, binary arithmetic, two's complement, floating-point representation, and ASCII/UTF-8 encoding into one browser-based tool — built for anyone who'd rather *see* a conversion happen than read about it. The six core tools run entirely client-side; the only server-side piece is a small Edge Function powering the optional **BitForge AI** learning assistant.

---

## Features

| Mode | What it does |
|---|---|
| 🔢 **Number Converter** | Convert between Decimal, Binary, Octal, Hex, and a custom base (2–36). Auto-detects format from `0x` / `0b` / `0o` prefixes, supports fractional values and negative numbers, and shows every base live alongside a full positional-weight, repeated-division, or bit-grouping derivation. |
| ➗ **Binary Operations** | Add, subtract, multiply, and divide raw binary values at a chosen bit width (4/8/16/32/64-bit). Every operation shows its full bit-by-bit trace — ripple-carry addition, two's-complement subtraction, shift-and-add multiplication, restoring long division — plus carry, borrow, and overflow flags. |
| 🧩 **Interactive Bit Grid** | A clickable 8/16/32-bit matrix. Toggle bits directly or use Invert, Shift Left/Right, Clear, and Set All. Live unsigned, signed, hex, and octal readouts, each copyable. |
| ➕ **Two's Complement Engine** | Enter a signed decimal integer and get its two's complement binary/hex at a chosen width, with range/overflow detection, an invert-and-add-one breakdown, and boundary-value presets. |
| 🔤 **Text & UTF-8 Encoding** | Encode text into real UTF-8 bytes — decimal, binary, hex, and octal per byte, plus combined byte streams for the full string — correctly handling accented characters, emoji, and anything outside plain ASCII, with each character flagged as ASCII or not. |
| 🎚️ **Floating-Point Explorer** | See how a decimal number is stored as sign, exponent, and fraction bits, or decode an existing bit pattern back to decimal. Supports the standard Binary16/32/64 formats and a fully configurable Custom Format, with a short plain-language explanation up front and full derivation, rounding, and special-value details available on demand. |

**Also included:** a searchable, persistent Activity History across all six tools; one-click copy and share (Web Share API, with a clipboard fallback) for any result; a keyboard-shortcut reference dialog (`?`); two selectable dark themes — the original Emerald look and a more restrained Premium Dark Gray — switchable from the header and remembered across visits; an animated background that adapts its rendering cost to the device it's running on (and re-tints itself to match the selected theme); and **BitForge AI**, a lightweight chat assistant that teaches number-system and encoding concepts, backing any direct conversion or two's-complement question with BitForge's own verified calculation rather than the model's own arithmetic.

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
│   ├── main.tsx                      # React entry point; sets device performance tier & theme pre-render
│   ├── App.tsx                       # Root component, mode routing & layout
│   ├── index.css                     # Global styles, theme tokens, glass utilities
│   ├── types.ts                      # Shared TypeScript types
│   ├── version.ts                    # Single source of truth for the app version string
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
│   │   ├── ShortcutTargetContext.tsx # Routes shortcuts to the active tool
│   │   └── ThemeContext.tsx          # Premium Dark / Emerald theme state & persistence
│   ├── three/
│   │   └── FlowWaveScene.ts          # Animated WebGL background (Three.js, tiered quality, per-theme palette)
│   └── components/
│       ├── Header.tsx                # Top nav, mode switcher, logo & theme toggle
│       ├── BitForgeLogo.tsx          # BitForge monogram (SVG, theme-aware)
│       ├── ThemeToggle.tsx           # Premium Dark / Emerald theme switcher
│       ├── FlowWaveBackground.tsx    # React mount point for the animated background
│       ├── WelcomeBanner.tsx         # First-time user onboarding guide
│       ├── HistoryPanel.tsx          # Activity History slide-over panel
│       ├── ShortcutsHelpDialog.tsx   # Keyboard shortcut reference dialog
│       ├── ShareButton.tsx           # Shared copy/share control used across every tool
│       ├── PresetsBar.tsx            # Quick-select preset values
│       ├── ConversionInput.tsx       # Base input & auto-detect panel
│       ├── LiveBasesGrid.tsx         # All-bases live output grid
│       ├── StepByStepBreakdown.tsx   # Conversion derivation steps
│       ├── DerivationDisclosure.tsx  # Shared closed-by-default toggle for derivation panels
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

### BitForge AI setup (optional)

The five core tools work with zero configuration. To also run **BitForge AI** locally or in your
own Vercel deployment, copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | A free key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` *(optional)* | Overrides the Gemini model used by `/api/chat`. Defaults to a current stable GA model — see `.env.example` before assuming the default hasn't been deprecated ([deprecation schedule](https://ai.google.dev/gemini-api/docs/deprecations)) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | A free Redis database at [Upstash](https://console.upstash.com/redis) (used only for rate limiting; if omitted, the endpoint runs without rate limiting, but if set and later unreachable, `/api/chat` fails closed rather than letting requests through unmetered) |

On Vercel, set the same variables under **Project Settings → Environment Variables** — the
`/api/chat` Edge Function picks them up automatically, and the API key never reaches the browser.

---

## Changelog

All notable changes to this project are documented below, newest first.

### v5.1.0 — Selectable Themes, Mobile Popup Fixes & BitForge AI Rendering

**Added**
- **Two selectable dark themes** — a lightweight `Palette` control in the header (persisted via `localStorage`, applied instantly on load with no flash of the wrong theme) switches between:
  - **Emerald** — BitForge's original look, unchanged pixel-for-pixel.
  - **Premium Dark Gray** — a neutral charcoal/slate surface system in the same layout, with the brand emerald kept only as a restrained, desaturated accent rather than the dominant hue.
  - Implemented as a set of CSS custom properties (`--bf-*` in `src/index.css`, keyed off a `data-theme` attribute) that the existing component markup already reads through Tailwind arbitrary values — no component was restructured, resized, or re-laid-out to support this; only color values change between themes. The animated FlowWave background re-tints its particle palette and dials back its flame/warp intensity for Premium via a new `FlowWaveScene.setTheme()`, without rebuilding the WebGL scene. `prefers-reduced-motion` is respected for the theme swap itself, and both themes were checked against WCAG-style contrast ratios for every text/surface pairing introduced.
  - The completed footer and the site favicon are intentionally excluded from this system and keep their original hardcoded Emerald styling in both themes.
- Added `"version": "5.1.0"` to the existing `SoftwareApplication` JSON-LD block in `index.html`, matching `src/version.ts`.

**Fixed**
- **Mobile popup scrolling** — About / Help & FAQ / Privacy / Disclaimer (the `InfoDialog` tabs) used to grow past the visible viewport instead of scrolling on narrow screens. On mobile the dialog stacks its tab strip above its content, and the flex sizing along that chain let the content area expand to fit all of its content rather than respecting the dialog's own height limit. Fixed by making the sizing explicit end-to-end: the content column gets `min-h-0` so it no longer refuses to shrink below its content size, and the scrollable pane itself now declares `flex-1 min-h-0` alongside its existing `overflow-y-auto` so it — not the dialog around it — is unambiguously the scroll container. Content scrolls freely on both mobile and desktop.
- **Inconsistent popup exit behavior** — About, Help & FAQ, Privacy, Disclaimer, and the Keyboard Shortcuts guide could only be closed with the X button; tapping or clicking outside the dialog silently did nothing. The dimmed backdrop behind these dialogs sat *underneath* a full-screen click-catching layer with no click handler of its own, so its close-on-click never actually had a chance to fire. All five now close the same way BitForge AI and Activity History already did: X button, or a tap/click anywhere outside the dialog card.
- **Garbled formatting in BitForge AI responses** — the AI window rendered replies as raw text, so any Markdown or LaTeX-style notation the model used showed up literally instead of being formatted (e.g. a literal `$\rightarrow$` instead of an arrow, literal `**`/backticks instead of bold/code). BitForge AI responses now render `**bold**` and `` `inline code` `` properly, and any inline LaTeX math is converted to the same plain Unicode notation BitForge's own interface already uses elsewhere (→, ×, ², ₂, etc.) instead of showing raw LaTeX syntax. The system prompt now also asks the model to use that same plain-Unicode style directly rather than LaTeX in the first place. Plain replies with none of this syntax render exactly as before.

**Housekeeping**
- The root package version in `package-lock.json` had drifted to `5.0.0` while `package.json` and `src/version.ts` had already moved to `5.1.0`; the lockfile was regenerated from a clean install rather than hand-edited, so it's back in sync.
- Added an explicit `allowScripts` entry for `esbuild` in `package.json`. Newer npm releases (11.16+) warn — and npm 12+ blocks by default — on any dependency's install script that isn't explicitly reviewed; esbuild's `postinstall` only fetches its own platform-native binary (required for Vite/Vitest to run at all) and is pulled in at two different versions here (Vite 6 directly, and an older version bundled inside Vitest's internal dev server), so both are now covered.

**Deployment readiness**
- **Production SEO/social metadata** — `index.html` was missing a canonical URL, `og:url`, a real social-preview image, and structured data, all pointing at the actual production domain (`https://bitforge-tool.vercel.app/`). Added `<link rel="canonical">`, `og:url`, `og:image`/`twitter:image` (with a real 1200×630 `public/og-image.png` built from BitForge's own logo mark and brand palette, not a placeholder), and a `SoftwareApplication` JSON-LD block. Added `public/sitemap.xml` (BitForge is a single-page app with no client-side routing, so it lists the one real URL rather than inventing routes) and pointed `robots.txt` at it.
- **Self-hosted fonts** — Orbitron and JetBrains Mono were loaded from `fonts.googleapis.com`/`fonts.gstatic.com` at request time. Both are now bundled locally via `@fontsource` (latin subset only — this app has no non-Latin UI copy, so the other script subsets would just be dead weight) and declared with `font-display: swap`. No third-party font request remains; typography roles (Orbitron for branding/headings, JetBrains Mono for numeric/code output, default sans for body copy) are unchanged.
- **Reduced initial JavaScript** — the Binary Operations and Floating-Point Explorer views (500–700+ lines each) were statically bundled into the initial chunk even though a given session often visits neither. Both are now lazy-loaded via `React.lazy`/`Suspense` and fetched only on first visit to that mode, with a shell-matched loading placeholder so there's no layout shift. Shaves roughly 16 KB gzip off the initial bundle and defers the rest until it's actually needed.
- **Verified, left unchanged**: the FlowWave Three.js background already disables pointer interaction on its canvas, disposes its scene on cleanup, handles WebGL context loss/restoration, disables backdrop blur on lower-tier devices, and respects `prefers-reduced-motion` — confirmed all five in source rather than replacing a working, already-defensive implementation without cause. Also confirmed unchanged: the Gemini API key is read only in the serverless function and never reaches client code, Upstash rate limiting fails closed in production (on timeout, on an unreachable store, and if it's simply unconfigured), and AI conversation state is still plain React state with no persistence.

### v5.0.0 — User-Readiness, Trust, AI Learning Assistant & Polish Pass

**Added**
- **Floating-Point Explorer** — a sixth core mode covering IEEE 754-style floating-point representation, treated as one page with Sign, Binary Conversion, Normalization, Exponent & Bias, and Fraction as inspectable subsections rather than separate top-level tools. Supports the standard Binary16/32/64 formats plus a fully configurable Custom Format (exponent/fraction bit widths), with progressive disclosure — a short explanation is always visible, with detailed derivations, rounding analysis, and special-value exploration available behind expandable "Show details" controls.
  - New generalized `utils/floatingPoint.ts` engine supporting arbitrary sign/exponent/fraction bit-width formats with software round-to-nearest-even, verified against native `DataView` ground truth for Binary32/Binary64 and known bit patterns for Binary16, and covered by a large Vitest suite.

**Added**
- **BitForge AI** — an in-app chat assistant (floating launcher, bottom-right) that teaches number-system and encoding concepts. Direct conversion or two's-complement questions are answered using BitForge's own verified conversion engine rather than the model's own arithmetic; requests are handled by a Vercel Edge Function (`/api/chat`) so the AI provider's API key never reaches the browser, with Upstash-backed rate limiting and no server-side storage of conversations.
- **About**, **Help / FAQ**, **Privacy**, and **Disclaimer** pages, accessible from the footer.
- MIT `LICENSE` and a `robots.txt`.

**Hardened (pre-deployment security review)**
- BitForge's verified-calculation context is now passed to Gemini exclusively via the system instruction, a channel user input can never write to — closing a prompt-injection path where a user could type their own fake "VERIFIED CALCULATION" line and have it treated as trustworthy. User-supplied text is also sanitized to strip literal occurrences of that marker as defense in depth.
- Gemini authentication moved from the `?key=` URL query parameter to the `x-goog-api-key` header, so the key can't end up in access logs, browser history, or a `Referer` header.
- Rate limiting now fails **closed**: if Upstash is configured but becomes unreachable at request time, `/api/chat` rejects the request (503) instead of silently letting it through unmetered. (If Upstash isn't configured at all — e.g. local development — that's treated as an intentional, known state, not a failure.)
- Gemini model is now read from an env var (`GEMINI_MODEL`) with a currently-stable GA fallback, rather than a hardcoded model ID that can silently start 404ing after a deprecation.

**Polish pass**
- The Step-by-Step Derivation panel on the Number Converter, Two's Complement, and Binary Operations tools is now a closed-by-default disclosure (`DerivationDisclosure`) — the math is one click away instead of always taking up the page.
- Introduced a small typographic hierarchy: Orbitron for the brand name and tool/section headings, JetBrains Mono for the version badge, navigation labels, and all numeric/code-style output (via a single Tailwind theme override), and the existing sans-serif retained for body copy and large onboarding headings.
- The app version is now defined once in `src/version.ts` and imported by the Header, Footer, and About section, instead of being hand-typed in three places.
- Refreshed the About / Help & FAQ / Privacy / Disclaimer content for clarity and consistency; page `<title>` and metadata updated to "BitForge - Number Systems Toolkit".

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
