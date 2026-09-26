<img width="3282" height="1312" alt="Cartoon banner (1)" src="https://github.com/user-attachments/assets/903e4220-766c-4af6-a10d-b3497690d4cf" />


> An interactive toolkit for exploring number systems, binary arithmetic, bit-level manipulation, and text encoding; with every result backed by a live, step-by-step derivation.

**[Live Demo](https://bitforge-tool.vercel.app/)**

![Live Demo](https://img.shields.io/badge/demo-live-34E89A?style=flat-square)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)
![Three.js](https://img.shields.io/badge/Three.js-r143-000000?style=flat-square&logo=three.js)

BitForge brings base conversion, bit-level manipulation, binary arithmetic, signed integer representations, floating-point representation, and ASCII/UTF-8 encoding into one browser-based tool — built for anyone who'd rather *see* a conversion happen than read about it. Visiting the site opens a landing page with a live, click-to-flip demo of the core idea before you ever reach the tool itself. The five core tools run entirely client-side; the only server-side piece is a small Edge Function powering the optional **BitForge AI** learning assistant.

---

## Features

| Mode | What it does |
|---|---|
| 🔢 **Number Converter** | Convert between Decimal, Binary, Octal, Hex, and a custom base (2–36). Auto-detects format from `0x` / `0b` / `0o` prefixes, supports fractional values and negative numbers, and shows every base live alongside a full positional-weight, repeated-division, or bit-grouping derivation. |
| ➗ **Binary Operations** | Add, subtract, multiply, and divide raw binary values at a chosen bit width (4/8/16/32/64-bit). Every operation shows its full bit-by-bit trace — ripple-carry addition, two's-complement subtraction, shift-and-add multiplication, restoring long division — plus carry, borrow, and overflow flags. |
| 🧬 **Bit Representation** | One synchronized workspace: type a signed decimal (any width) or toggle bits directly on an 8/16/32-bit grid, then choose how those bits should be interpreted — Unsigned, Sign-Magnitude, One's Complement, or Two's Complement — each with its own explanation and step-by-step derivation. Includes Invert/Shift/Clear, live hex/octal, and "Same Number, Different Encoding" / "Same Bits, Different Meaning" comparisons that show all four systems side by side. |
| 🔤 **Text & UTF-8 Encoding** | Encode text into real UTF-8 bytes — decimal, binary, hex, and octal per byte, plus combined byte streams for the full string — correctly handling accented characters, emoji, and anything outside plain ASCII, with each character flagged as ASCII or not. |
| 🎚️ **Floating-Point Explorer** | See how a decimal number is stored as sign, exponent, and fraction bits, or decode an existing bit pattern back to decimal. Supports the standard Binary16/32/64 formats and a fully configurable Custom Format, with a short plain-language explanation up front and full derivation, rounding, and special-value details available on demand. |

**Also included:** a searchable, persistent Activity History across all five tools; one-click copy and share (Web Share API, with a clipboard fallback) for any result; a keyboard-shortcut reference dialog (`?`); three selectable themes — the original Emerald look, a more restrained Premium Dark Gray, and a lightweight Plain mode with no background animation at all (the default for new visitors with reduced motion enabled at the OS level) — switchable from the header and remembered across visits; an animated background (skipped entirely under Plain) that adapts its rendering cost to the device it's running on and re-tints itself to match the selected theme; and **BitForge AI**, a lightweight chat assistant that teaches number-system and encoding concepts, backing any direct conversion or signed-representation question with BitForge's own verified calculation rather than the model's own arithmetic.

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
├── api/
│   └── chat.ts                       # Vercel Edge Function: Gemini proxy + Upstash rate limiting
├── src/
│   ├── main.tsx                      # React entry point; sets device performance tier & theme pre-render
│   ├── AppRoot.tsx                   # Owns the route (single source of truth): landing vs. tool, mode, chat; all navigation goes through it
│   ├── routing.ts                    # Pure hash<->route logic: parseHash, RouteState, URL projection (see routing.test.ts)
│   ├── App.tsx                       # The tool itself (controlled by AppRoot: receives mode/chat as props): layout & overlays
│   ├── index.css                     # Global styles, theme tokens, glass utilities
│   ├── types.ts                      # Shared TypeScript types
│   ├── version.ts                    # Single source of truth for the app version string
│   ├── utils/
│   │   ├── numberParsing.ts          # Canonical numeric-literal parser shared by converter.ts and chatIntent.ts
│   │   ├── converter.ts              # Base conversion, auto-detection & two's complement
│   │   ├── signedRepresentations.ts  # Unsigned/Sign-Magnitude/One's/Two's Complement encode-decode engine (Bit Representation)
│   │   ├── binaryOps.ts              # Bit-accurate add/sub/mul/div engine + step traces
│   │   ├── floatingPoint.ts          # IEEE 754 breakdown/derivation engine (Binary16/32/64 & custom formats)
│   │   ├── chatIntent.ts             # Routes direct conversion questions through BitForge's own engine before Gemini
│   │   ├── formatAiText.ts           # Markdown/LaTeX-ish parser for BitForge AI responses
│   │   ├── downloadUtils.ts          # History export (CSV / JSON / TXT)
│   │   ├── shareUtils.ts             # Web Share API + clipboard-copy fallback
│   │   └── devicePerf.ts             # Lightweight device-capability heuristic
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts   # Global shortcut bindings, input-aware
│   │   ├── useFocusTrap.ts           # Modal focus management (trap, auto-focus, restore)
│   │   ├── useScrollLock.ts          # Locks background scroll while a dialog is open
│   │   └── useAutoResetTimer.ts      # Timed UI-state resets (e.g. "Copied!" labels)
│   ├── context/
│   │   ├── HistoryContext.tsx        # Activity History provider: React state mirrors the persisted list; cross-tab `storage` sync
│   │   ├── historyStore.ts           # History persistence: validation, versioned wrapper, lock-serialized operations (no lost writes)
│   │   ├── ShortcutTargetContext.tsx # Routes shortcuts to the active tool
│   │   ├── ChatContext.tsx           # BitForge AI conversation state (session-only, not persisted)
│   │   ├── ThemeContext.tsx          # Theme provider: one React state, applied to the DOM by one effect; cross-tab `storage` sync
│   │   └── themeCore.ts              # Theme list, storage validation, applyThemeToDocument (data-theme + browser chrome colors)
│   ├── test/                         # Shared jsdom test helpers and a fake FlowWaveScene
│   ├── three/
│   │   └── FlowWaveScene.ts          # Animated WebGL background (Three.js, tiered quality, per-theme palette)
│   └── components/
│       ├── Header.tsx                # Top nav, mode switcher, logo & theme switcher
│       ├── BitForgeLogo.tsx          # BitForge monogram (SVG, theme-aware)
│       ├── ThemeSwitcher.tsx         # Emerald / Premium / Plain theme picker
│       ├── FlowWaveBackground.tsx    # Static base layer + FlowWave canvas (canvas and scene exist only under Emerald/Premium)
│       ├── LandingPage.tsx           # Marketing landing page (route: '#/' — see AppRoot.tsx)
│       ├── WelcomeBanner.tsx         # First-time user onboarding guide (in-app, not the landing page)
│       ├── InfoDialog.tsx            # About / Help / Privacy / Terms / Disclaimer tabs
│       ├── HistoryPanel.tsx          # Activity History slide-over panel
│       ├── ShortcutsHelpDialog.tsx   # Keyboard shortcut reference dialog
│       ├── ShareButton.tsx           # Shared copy/share control used across every tool
│       ├── PresetsBar.tsx            # Quick-select preset values
│       ├── ConversionInput.tsx       # Base input & auto-detect panel
│       ├── LiveBasesGrid.tsx         # All-bases live output grid
│       ├── StepByStepBreakdown.tsx   # Conversion derivation steps
│       ├── DerivationDisclosure.tsx  # Shared closed-by-default toggle for derivation panels
│       ├── BinaryOperationsCard.tsx  # Binary arithmetic UI + derivation tables
│       ├── BitCellRow.tsx            # Shared interactive/static bit-row visualization primitive
│       ├── BitRepresentationLab.tsx  # Bit Representation: unified denary+bit-grid workspace (merges the former Bit Grid & Two's Complement pages)
│       ├── BitRepresentationPanel.tsx    # Per-representation explanation + derivation panel
│       ├── BitRepresentationInsights.tsx # Collapsible reference panels (same bits/different meaning, why two's complement, comparison table)
│       ├── AsciiConverterCard.tsx    # Text ↔ UTF-8/binary/hex/octal encoder
│       ├── FloatingPointCard.tsx     # Floating-Point Explorer (IEEE 754 & custom formats)
│       ├── FloatBitStrip.tsx         # Interactive sign/exponent/fraction bit strip
│       ├── ChatAssistant.tsx         # BitForge AI chat panel & launcher
│       ├── FormattedAiMessage.tsx    # Renders parsed BitForge AI responses
│       └── Footer.tsx                # Status footer bar
├── package.json
├── vite.config.ts
├── eslint.config.js
├── .github/
│   └── workflows/
│       └── ci.yml                    # install, typecheck, test, build (blocking); lint (informational)
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

### Development

```bash
npm run typecheck   # tsc --noEmit — the fast, authoritative correctness gate
npm run lint         # eslint . — catches real mistakes (stale hook deps, unused vars),
                      # not a style guide; kept deliberately separate from typecheck
npm test             # vitest run — the full test suite
```

`npm run typecheck` and `npm run lint` check different things and are not
interchangeable: TypeScript's structural type-checking doesn't catch a stale
closure over a `useEffect` dependency, and ESLint doesn't catch a type
mismatch. Both, plus the test suite and a production build, run in CI
(`.github/workflows/ci.yml`) on every push and pull request. Lint currently
runs as informational rather than a blocking gate — see the comment in that
workflow file for why and what flips it to blocking.

`tsconfig.json` does not enable `noUnusedLocals`/`noUnusedParameters`;
ESLint's `@typescript-eslint/no-unused-vars` is what catches those instead,
so an unused import or variable shows up in `npm run lint`, not
`npm run typecheck`.

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

### v6.1.0 — UI Synchronization, Route Ownership & Lossless Multi-Tab History

This release is about *one source of truth per piece of state*, so nothing in normal use can leave the UI showing something the state doesn't say. It was verified by driving the built app in a real Chromium (with WebGL) rather than only by unit tests. See "Verification notes" below for exactly what did and did not reproduce.

**Fixed**
- **Route state was duplicated and could desynchronize.** `AppRoot` held the parsed route while `App` held its own `activeMode`/`isChatOpen`, mirrored back and forth by two suppressed-lint effects and a URL-writing effect. If the router already held a mode (e.g. `ascii`), the person switched tabs (URL rewritten in place to `#/app`), and then navigated to `#/app/mode/ascii` again — or closed chat and re-opened `#/app/chat` — the prop looked *unchanged* to App's effect, so the URL changed but the display did not. Reproduced in the previous build; fixed by removing the duplicate state entirely (see Changed).
- **WebGL context restore could rebuild the scene with the wrong palette.** The FlowWave lifecycle effect is deliberately keyed on `theme === 'plain'` (so Emerald ↔ Premium re-tints in place), which meant its `create()` closure kept the theme from when the effect last ran; a context restore after an Emerald → Premium switch rebuilt an *Emerald* scene. Recovery now reads the current theme from a ref. The in-place re-tint optimization is unchanged.
- **`chatIntent.ts` read `A5` as `5`** (Copilot finding). The generic digit regex could begin in the middle of a bare hex token, so `convert A5 hex to decimal` produced a "verified" result for 5, and `-A5`, `16-bit two's complement of A5 hex` were wrong the same way. Number tokens must now start at a token boundary, and a digit-bearing bare hex token framed by the word "hex" is recognized whole (`A5`, `2A`, `-A5`, `hex of 4A`) before the generic match. The same review fixed adjacent false positives: `the code hex` no longer yields `de`, `what is a hex value…` no longer reads the article "a" as 0xA, a bit-width phrase (`8 bit`) is no longer mistaken for the operand (`FF hex to 8 bit binary` converts FF), and the token's real position is used instead of re-searching it with `indexOf`. Letters-only tokens (`FF hex`) remain a last-resort fallback so `255 dec hex` still means decimal 255. Unprefixed hex without the word "hex" is still deliberately *not* guessed.
- **Concurrent History writes from two tabs could lose entries** (Copilot finding). Each tab saved its whole in-memory list from an effect, so near-simultaneous additions overwrote one another. History now treats `localStorage` as the source of truth and React state as a mirror: every mutation (add / remove / clear all / clear mode) is an *operation* applied to the latest persisted list under a Web Locks lock, then written. Deletes and clears therefore cannot be undone by another tab's stale copy, and no merge heuristics or tombstones are needed. Without `navigator.locks`, operations fall back to an in-tab queue with a single synchronous read-modify-write each (documented as best-effort across tabs). Stored format, validation, the 200-entry cap, duplicate suppression and legacy bare-array reading are unchanged; entries are now also de-duplicated by id and kept newest-first.
- Theme and route state can no longer drift from the DOM/URL by construction (details below), rather than by a comment claiming they stay in sync.

**Changed**
- **`AppRoot` owns the route; `App` is controlled.** `App` receives `mode` and `chatOpen` as props and asks `AppRoot` to navigate (`onModeChange`, `onChatOpenChange`, `onGoHome`). Every navigation — landing tiles, header tabs, the BitForge logo, chat launcher, overlays closing chat, Back/Forward, pasted links — goes through one `commit()` that updates React state and the URL in the same synchronous call (via `history.pushState`/`replaceState`, which never fire `hashchange`, so there is no loop). Only navigation originating *outside* the app arrives through the `hashchange`/`popstate` listener, and is ignored when it matches what the state already projects to. History semantics are unchanged: landing ↔ tool pushes an entry; switching mode/chat inside the tool replaces the current entry. Chat now preserves the underlying mode (closing it returns to the same tool). Unrecognized hashes (`#tools`, `#why`) still never change the view. The two reverse-sync effects and their lint suppressions are gone.
- **The header logo stays a real link** (`href="#/"`) but a plain left-click is routed through the same centralized navigation; modified clicks still fall through to the browser.
- **Single theme synchronization path.** `ThemeProvider`'s React state is authoritative; one layout effect writes `data-theme` (via `applyThemeToDocument` in the new `themeCore.ts`, the same function `main.tsx` uses before mount). `setTheme` persists the person's choice; changes arriving from another tab update state only and are never written back. Stored values are validated against the allowed themes.
- **Two-layer background.** `FlowWaveBackground` now always renders a static `#bf-base-bg` layer painted from `--bf-app-bg`, with the FlowWave canvas as an enhancement above it for Emerald/Premium only. Plain still builds no WebGL context, render loop or Three.js resources; the canvas is not rendered and the scene is disposed.
- **Defensive Plain kill-switch** in `index.css`: `html[data-theme="plain"] #flow-wave-scene { display: none; visibility: hidden }`, so a still-attached canvas can never show its last frame regardless of when React's cleanup runs.
- **`FlowWaveScene.dispose()`** is idempotent and every release step is isolated, so one failing step can't skip the rest or throw out of a React cleanup.
- **Browser chrome follows the theme:** `<meta name="theme-color">` and the `mask-icon` color update with the active theme (safe if the elements are missing). The static default in `index.html` is now the Emerald page background (`#02160C`, previously the header tint `#041A11`). `themeCore.test.ts` parses `index.css` and fails if the TypeScript copy of these colors drifts from `--bf-app-bg`/`--bf-accent`.
- **Text-color token consistency.** The older tool cards (Floating Point, Bit Representation lab/panel/insights, Converter input, Text & ASCII, Live Bases, Step-by-Step, the converter cheat-sheet) used theme-independent `text-slate-*` greys and `text-white` on themed surfaces, while newer components already used `--bf-*` text tokens. Those neutral text greys now use `--bf-heading` at the same visual hierarchy, so Emerald/Premium/Plain tint text consistently. Semantic colors are intentionally untouched: success (emerald), error (rose), warning (amber), and the sign/exponent/mantissa bit-field colors.
- `<html data-app-version>` is set at startup so a deployed build can be identified from DevTools without reading hashed asset names.

**Tests** (359 → 530)
- New jsdom integration tests drive the real `AppRoot`/`App`/`Header`/`ThemeSwitcher` with a fake `FlowWaveScene`: theme transitions (all six, plus rapid toggling) checking state, `data-theme`, canvas presence, scene count and disposal; WebGL lose/restore for Emerald and Premium including the stale-closure regression; every-mode logo navigation; Back/Forward; deep links; unrecognized hashes; chat transitions; and the two route-desync regressions.
- Cross-tab tests for theme (`storage` events, invalid values, no write-back) and History (two providers over shared storage, deletes/clears not resurrected).
- `historyStore` tests with a fake lock manager for interleaved additions, the 200-entry cap, duplicate suppression across tabs, destructive operations, legacy payloads, corrupt/unavailable storage, and lock-acquisition failure.
- `chatIntent` regression tests for every case in the Copilot report, plus the false-positive guards above.
- Dev dependencies added: `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`. Node-only suites are unaffected (jsdom is opted into per file).

**Verification notes**
- The attached v6.0.0 source, built and run in Chromium, did **not** reproduce a stuck Plain theme or a failed logo click in the straightforward paths (canvas removed and rAF loop cancelled immediately on Emerald/Premium → Plain; logo returned to landing from every mode). What it did reproduce were the route desyncs and the restore-palette closure above, which are the state-synchronization defects behind the reported class of symptom. If the deployed site still misbehaves after this release, check `<html data-app-version>` in DevTools first: a mismatch means an old build is being served, not that the fix failed.
- The production site itself could not be inspected from the environment this release was prepared in (no access to its bundle, DevTools, or headers).

### v6.0.0 — Bit Representation Redesign, Landing Page, Legal & Compliance

**Added**
- **Plain theme** — a third background option alongside Emerald and Premium: a flat near-black surface system with no FlowWave/WebGL animation at all. `FlowWaveBackground` never constructs a `FlowWaveScene` under Plain — no canvas context, no Three.js work — rather than just hiding a running one; switching into or out of Plain creates or tears down the scene, while switching between Emerald and Premium still just re-tints the running one as before. First-time visitors (no saved theme yet) default to Plain automatically when the OS reports `prefers-reduced-motion: reduce`, and to Emerald otherwise; a saved choice always wins after that, and the picker itself always offers all three regardless of motion settings.
- **Three-way theme picker** (`ThemeSwitcher.tsx`) replacing the old two-way cycling toggle — a small dropdown anchored in the same header slot (same collapsed footprint on mobile), with Escape-to-close and focus return to the trigger, mirroring the existing `ExportDropdown` interaction pattern already used in `HistoryPanel`.
- **Terms & Conditions** tab in the Info dialog — acceptable-use/anti-abuse for the AI backend, IP/licensing (MIT code license plus branding), third-party services subject to their own terms, availability/bugs, a no-payments-so-no-refunds statement, a reasonable limitation-of-liability statement, and a Pakistan-context governing-law note that doesn't claim compliance with every jurisdiction.
- Site-wide `:focus-visible` outline for buttons, links, and `<summary>` elements — a single consistent accent-colored ring instead of a mix of the browser default and ad-hoc per-component treatments. Uses a negative `outline-offset` so it sits inside the element's own box and is never clipped by a dialog's `overflow-hidden`. Text inputs keep their existing border-color focus treatment untouched.
- **Marketing landing page** (`LandingPage.tsx`) at the root route — a live, click-to-flip 8-bit demo (built from the same `BitCellRow` and `signedRepresentations` engine as the real tool, not a mockup) demonstrating that one bit pattern reads as four different numbers, and the app's actual `ThemeSwitcher` so the three themes can be previewed before entering. The six tool tiles are real destinations, not decoration: each opens the tool with that mode already selected, and the BitForge AI tile opens it with the chat panel already open. The footer's About/Help/Privacy/Terms/Disclaimer render this page's own `InfoDialog` directly rather than entering the tool to show one. Routing (`AppRoot.tsx` + `routing.ts`) is a small hash-based router rather than a routing library or a second Vite entry point: reading and writing only `location.hash` means a direct link or a page refresh on any route resolves correctly with zero server-side rewrite rules, on any host. Deliberately hardened against one specific failure mode — see `routing.test.ts` — where an unrelated in-page anchor hash change could otherwise be misread as "navigate to landing" and silently eject someone mid-task; only a hash that names a recognized destination is ever treated as a navigation.

**Changed**
- **Privacy tab** — strengthened the cookies section to state plainly that BitForge sets no cookies of any kind (not just "no advertising cookies"), and that `localStorage` never leaves the device.
- **BitForge AI chat input** — the small disclaimer next to the input now also states that messages are sent to Google's Gemini API, not just that responses are AI-generated.
- **Footer** — added a Terms link alongside the existing About/Help/Privacy/Disclaimer links.
- **Merged Bit Grid and Two's Complement into one Bit Representation lab** (`BitRepresentationLab.tsx`) — a single denary input and interactive bit grid (8/16/32-bit) now drive all four interpretations (Unsigned, Sign-Magnitude, One's Complement, Two's Complement) via a shared encode/decode engine (`utils/signedRepresentations.ts`), rather than two separate tools with overlapping bit-toggle UIs. Adds "Same Number, Different Encoding" and "Same Bits, Different Meaning" comparisons plus a representation reference table, and reuses the existing tested `calculateTwosComplement()` engine rather than re-deriving Two's Complement a second way. Old `bitgrid`/`twos_complement` Activity History entries remain viewable (labeled "(legacy)"); nothing is destroyed.
- **Bit Representation hierarchy pass** — reordered the page so the representation selector sits immediately after the denary input (previously buried below Bit Width, Bit Controls, and a large Basic Binary Information block), demoted Bit Width to a compact corner control, replaced the three-card Basic Binary Information section with a single compact Binary/Hex/Octal line near the bottom, and gave the active representation panel clearer visual weight as the page's centerpiece.
- **Visual restraint pass** — removed the welcome banner's gradient background and two purely decorative blurred glow shapes, and thinned its border from 2px to 1px; removed the chat launcher's escalating colored glow and hover-scale bounce in favor of a single static shadow and a plain background-color hover; softened the header's drop shadow; thinned every primary input's border from 2px to 1px across all six tool cards, matching the one card that already used 1px; simplified the Bit Grid's active-toggle and Live Bases Grid's selected-card states from three or four simultaneous emphasis effects (border + ring + shadow, or border + ring + shadow + gradient) down to two.
- **Dead code removal** — this app runs permanently in dark mode (`<html class="dark">` never toggles), so every Tailwind `dark:` variant was already the only style that ever rendered. Removed the now-provably-dead light-mode counterpart class from every affected element across nine files. No visual change — confirmed via full typecheck, test suite, and production build after every file, after an initial scripted attempt at this same cleanup was caught in review (it conflated same-prefix utilities governing different CSS properties, e.g. `ring-offset` width vs. color) and discarded before touching any real file.
- **Bit Representation correctness pass** — the main bit grid now labels bits according to the selected representation (`−128 64 32 …` for Two's Complement, `S | 64 32 …` with a sign divider for Sign-Magnitude, neutral `b7…b0` positions for One's Complement, unsigned weights otherwise), resolving a contradiction where the grid called the MSB `128` while the panel directly below called it `−128`. Grid labels, ranges and value formatting now come from the engine (`getBitGridMeta`, `formatRange`, `formatValueForInput`/`formatValueForDisplay`) so the grid and panel render from one definition rather than computing labels separately. Negative zero is now shown as `−0` for Sign-Magnitude `10000000` and One's Complement `11111111` instead of being flattened to `0` by default number conversion (and is never shown for Unsigned or Two's Complement, which have a single zero). Ranges display as `−128 → +127`. Shift Right is relabelled **Logical Shift Right** to be explicit that it shifts a 0 into the MSB regardless of representation. Switching representation now preserves the user's numeric value and re-encodes the bits, rather than reinterpreting the same pattern and making the displayed number jump.

**Fixed**
- **Premium/Emerald → Plain theme transition** — switching into Plain could leave the last rendered FlowWave frame visible in the persistent `<canvas>` until the page was refreshed. `FlowWaveScene.dispose()` stopped the render loop and freed GPU resources but never explicitly cleared the canvas's drawing buffer, so whatever was last painted stayed on screen indefinitely once nothing was rendering to replace it. `dispose()` now resets the render target and issues one explicit fully-transparent clear before releasing the renderer, so Plain's flat background shows through immediately. Emerald ↔ Premium re-tinting and Plain → Emerald/Premium scene creation are unaffected.
- **Landing page footer links** — About/Help/Privacy/Terms/Disclaimer previously routed into the tool and opened the Info dialog there, which meant clicking "Privacy" from the landing page flashed the Number Converter behind the dialog before it appeared. The landing page now renders its own `InfoDialog` directly — same component, same content, its own local open/close state — and never enters the tool at all for this. The `#/app/info/<section>` route this used is removed.
- **Tool tiles on the landing page were inert** — the six-card tools grid was purely decorative. Each tile is now a real button: the five real tools navigate into the tool with that mode already selected (`#/app/mode/<mode>`), and BitForge AI opens the tool with the chat panel already open (`#/app/chat`).
- **No way back to the landing page from inside the tool** — the BitForge logo/wordmark in the tool's header is now a real link (`href="#/"`) back to the landing page, with no new state or prop plumbing: it sets the same hash the landing page's own navigation already does, and the router's existing hashchange listener picks it up identically.
- **Hash navigation could go stale while already inside the tool** — switching modes via the Header updated what was displayed but never touched the URL, so refreshing, sharing the link, or hitting Back could return you to a mode you'd already left; conversely, a hash change arriving from outside the current session (Back/Forward, or a fresh `#/app/mode/<mode>` link opened while the tool was already mounted) had no effect on what was shown, since `App.tsx` only ever consumed its initial mode/chat props once, at mount. Fixed with two effects that close both directions without fighting each other: a forward sync writes the current mode/chat state to the URL via `history.replaceState` (never creating a new history entry per mode switch, and — because `replaceState` never fires `hashchange` — never triggering the second effect itself), and a reverse sync reacts to the URL prop changing for a reason other than the app's own last write. The hash↔state mapping (`parseHash`/`appRouteToHashPath`) was pulled into its own `routing.ts` module specifically so the round-trip between the two is unit-tested directly (`routing.test.ts`) rather than only reachable through effects that need a real DOM to exercise.
- **Unified numeric parsing across the converter and the AI intent system** (new `utils/numberParsing.ts`) — `chatIntent.ts`'s Two's Complement path ran `parseInt(token, 10)` on tokens that could be prefixed or signed, so `"0x2A"` silently parsed as `0` and `"-0xFF"` as `-0` (parseInt stops at the first character invalid for the radix it's told to use — here, at `x`). Both the converter engine and the AI intent system now resolve sign, base prefix (`0x`/`0b`/`0o`), and digits through the same canonical parser, with sign and prefix recognized independently of each other — `autoDetectBase` and `sanitizeInput` had the matching bug in the other direction (checking for a prefix at the very start of the string, which can never match when a sign comes first), fixed the same way. 24 new tests in `numberParsing.test.ts` cover every radix from 2 to 36, negative fractions like `-.5`, and the exact prefixed/signed cases above.
- **Two's Complement now uses BigInt throughout, not just at the edges** — `calculateTwosComplement` took a plain `number`, which cannot exactly represent 64-bit boundary values (`2^63 - 1` is already outside `Number.MAX_SAFE_INTEGER`), and even computed its own valid range with `Math.pow(2, 63) - 1`, a value that isn't itself exactly representable as a double (doubles are 2048 apart at that magnitude, so the subtraction silently rounds back up to `2^63`). Now accepts `number | bigint` — every existing 8/16/32-bit caller keeps working unchanged, since those magnitudes convert to BigInt exactly — and does every internal computation, including the range check, in BigInt. New tests confirm `2^63 - 1` and `-2^63` round-trip exactly and that `2^63` itself correctly overflows, both directly and through the AI's Two's Complement intent path.
- **Fractional conversion could silently show a tiny nonzero value as zero** — the pipeline converted a source fraction to a lossy floating-point `number` and stopped early once the running value fell under a fixed `1e-12` epsilon; a genuinely tiny value (e.g. decimal `0.0000000000001`) could hit that threshold within a single digit, displaying as flat `0` — indistinguishable from the value actually being zero. Every fraction conversion — to decimal and to any other target base, including a custom radix — now goes through exact BigInt numerator/denominator long division (`fractionDigitsToExactBase`, generalizing the decimal-only `fractionDigitsToExactDecimal` that already existed) with no floating point anywhere in the path. A value that doesn't terminate within the shared, explicit `MAX_FRACTION_DIGITS` display budget (12, replacing three different ad-hoc limits — 8, 10, and 12 — that used to disagree across three different functions) is marked with a trailing "…" rather than silently presented as complete, and a repeating fraction (e.g. decimal `0.1` in binary) is shown with the repeating part in parentheses. The step-by-step breakdown shown to the user was rewritten to walk the same exact arithmetic one digit at a time, so it can no longer disagree with the final result displayed above it — a real risk with the old float-based table, whose own hardcoded 8-step limit was the third inconsistent value.

**Improved (correctness and maintainability pass)**
- **`dangerouslySetInnerHTML` removed** — its only actual use was rendering `<sup>` tags for positional-weight exponents in equation-line text. Replaced with real Unicode superscript characters (e.g. `10²`) generated at the source, so the string never contains markup and React can render it as plain text directly. A regression test asserts no equation line produced by any conversion direction contains an HTML tag.
- **Centralized radix validation** — `MIN_RADIX`/`MAX_RADIX` (2/36) and `isValidRadix()` now live in one place (`numberParsing.ts`) instead of the bounds being repeated as bare `2`/`36` literals in the custom-radix slider, its paired number input, and its clamping logic.
- **History persistence hardened**: stored data now carries an explicit `{version, entries}` wrapper (`STORAGE_VERSION`) instead of a bare array with no way to detect a future schema change — old bare-array data is still read for backward compatibility. The parsing and serialization logic was pulled into pure functions (`parseStoredHistoryPayload`/`serializeHistoryPayload`, both exported and directly unit-tested in `HistoryContext.test.ts`) decoupled from the `localStorage` global itself, rather than needing a browser environment to test at all. Also added multi-tab sync via the `storage` event, so adding or clearing history in one open tab is reflected in others without a manual refresh.
- **Linting distinguished from type-checking**: `npm run lint` previously just ran `tsc --noEmit` under a misleading name. `typecheck` now owns that job; `lint` runs a real ESLint flat config (`eslint.config.js`) — the standard recommended JS/TS rules plus `react-hooks`/`react-refresh`, not a broader style guide — added with zero pre-existing errors and 12 low-severity warnings, all pre-existing and left for deliberate future attention rather than a mechanical fix bundled into this change.
- **CI added** (`.github/workflows/ci.yml`): install, typecheck, test, and build run as blocking checks on every push and pull request. Lint runs too, but non-blocking for now — see the workflow file's comment for why and what flips it to blocking.
- **Documentation aligned with actual behavior**: the Help tab now explicitly documents the fractional-conversion precision policy (exact arithmetic, a stated 12-digit display budget, repeating-decimal notation, honest truncation marking) where previously nothing was claimed either way, and documents that a sign and a base prefix are recognized independently (`-0xFF` parses as −255 rather than being rejected).
- **Assessed, deliberately not done**: further splitting `converter.ts` (still the largest file at ~1400 lines) into separate step-generation and exact-arithmetic modules. A clean split is possible but the two halves depend on each other closely enough that separating them cleanly would need a third shared module purely to avoid a circular import between them — a bigger, riskier change than this pass's other extractions (`numberParsing.ts`, `routing.ts`), which had no such entanglement. Left as one cohesive file rather than rushed.

**Fixed (final correctness pass)**
- **Routing still went stale in the reverse direction** — the previous fix synced App state to the URL, but the URL-to-state direction only ever *opened* things (`if (initialMode && initialMode !== activeMode)`, `if (initialChatOpen && !isChatOpen)`), never reset them: navigating from `#/app/mode/ascii` back to bare `#/app` left the mode showing `ascii`, and `#/app/chat` → `#/app/mode/ascii` left chat open. A route naming no mode/chat means the *default* state, not "no opinion" — both effects now resolve through one function (`resolveAppDisplayState`, in `routing.ts`) that coalesces a missing mode to `converter` and missing chat to closed before comparing. Directly regression-tested as state transitions, not just hash parsing: `routing.test.ts` simulates the exact named scenarios (`#/app/mode/ascii → #/app`, `#/app/chat → #/app/mode/ascii`, every mode to every other mode) and a throwaway script confirmed each one genuinely fails against the old logic before the fix and passes after.
- **`chatIntent.ts` retained its own numeric grammar that could still fail independently of `numberParsing.ts`**: `findNumberToken()`'s token-locating regex required at least one digit *before* a decimal point, so it could not find `.5` or `-.5` in a message at all — not misparse them, never locate them as a token in the first place, silently falling through to an unverified answer. Fixed to recognize `\.\d+` and `\d+\.\d*` as their own alternatives, and extended the prefixed-literal patterns to allow a fractional suffix (`0x2A.8`, `0b101.101`, `0o17.4`). Separately, `findBareHexToken()` matched only `[0-9A-Fa-f]+`, with no sign capture at all — "`-FF` hex" silently became `+255`. Both are now covered end-to-end via `detectVerifiedContext`, including through the Two's Complement path specifically, which had its own version of the same gap: it defaulted to decimal unconditionally, so `-FF` (bare hex, no prefix) had no way to be recognized as hex there even after the token-finding fix. Now resolves a radix hint through `autoDetectBase`, the same function the general conversion path already trusts — **but only at high confidence**: an early version of this fix trusted the guess unconditionally and broke `"twos complement of -10"`, which `autoDetectBase` also validly reads as binary `10` at medium confidence (regressing `-10` to `-2`). Caught by the pre-existing test for that exact phrase before this reached review; the fix keeps the conventional decimal default for anything below high confidence.
- **Removed the dead floating-point `fractionVal` field** from `baseToDecimalValue()` — every real consumer already worked from `fractionStr` (the exact digit string) after the fractional-exactness fix earlier in this version, but the lossy `number` computation itself was still sitting there, unused, as a standing invitation for a future shortcut to wire it back in.
- **A leftover overclaim**: the step-by-step derivation panel's footer still literally read "Math Core 64-Bit Exact" — a prior version's changelog claimed this exact wording had already been corrected (to "Integer Engine: Exact"), but the fix had evidently only reached one occurrence, not this one, and the label was never actually true as written even before that (fractional conversion has a stated, finite display budget — see `MAX_FRACTION_DIGITS` — not unconditional exactness). Now reads "Integer Engine: Exact", matching what's actually guaranteed.
- **BigInt coverage audited**: `signedRepresentations.ts` (the Unsigned/Sign-Magnitude/One's/Two's Complement engine behind the Bit Representation UI) still uses plain `number`/`Math.pow` throughout, not BigInt. Verified this is correct rather than an oversight — that UI only ever offers 8/16/32-bit widths, and every magnitude those can produce is trivially exact as a double — and documented the constraint explicitly at the top of the file, including exactly what migrating it to 64-bit would require if that ever changes, rather than leaving the range it's safe for unstated.

Test count as of this pass, freshly run rather than carried over from an earlier report: **359 passing** across 10 files (`npm test`), plus a clean `npm run typecheck` and `npm run build`, and `npm run lint` unchanged at 0 errors / 12 pre-existing warnings.

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
