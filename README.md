# ⚙️ BitForge

> An interactive toolkit for exploring number systems, binary arithmetic, bit-level manipulation, and text encoding — with every result backed by a live, step-by-step derivation.

**[🚀 Live Demo](https://bit-forge-tech-forge5.vercel.app/)**

![Live Demo](https://img.shields.io/badge/demo-live-34E89A?style=flat-square)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)
![Three.js](https://img.shields.io/badge/Three.js-r143-000000?style=flat-square&logo=three.js)

BitForge brings base conversion, bit-level manipulation, binary arithmetic, two's complement, and ASCII encoding into one browser-based tool — built for anyone who'd rather *see* a conversion happen than read about it. Everything runs client-side; there's no backend involved.

---

## Features

| Mode | What it does |
|---|---|
| 🔢 **Number Converter** | Convert between Decimal, Binary, Octal, Hex, and a custom base (2–36). Auto-detects format from `0x` / `0b` / `0o` prefixes, supports fractional values, and shows every base live alongside a full positional-weight or repeated-division derivation. |
| ➗ **Binary Operations** | Add, subtract, multiply, and divide raw binary values at a chosen bit width (4/8/16/32/64-bit). Every operation shows its full bit-by-bit trace — ripple-carry addition, two's-complement subtraction, shift-and-add multiplication, restoring long division — plus carry, borrow, and overflow flags. |
| 🧩 **Interactive Bit Grid** | A clickable 8/16/32-bit matrix. Toggle bits directly or use Invert, Shift Left/Right, Clear, and Set All. Live unsigned, signed, hex, and octal readouts, each copyable. |
| ➕ **Two's Complement Engine** | Enter a signed decimal integer and get its two's complement binary/hex at a chosen width, with range/overflow detection, an invert-and-add-one breakdown, and boundary-value presets. |
| 🔤 **Text & ASCII Encoding** | Encode text character-by-character into decimal, 8-bit binary, hex, and octal, plus combined binary and hex byte streams for the full string. |

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Background Rendering | Three.js r143 (custom WebGL shader scene) |
| Icons | lucide-react |
| Deployment | Vercel |

---

## Project Architecture

```text
BitForge/
├── index.html
├── src/
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Root component, mode routing & layout
│   ├── index.css                     # Global styles, theme tokens, glass utilities
│   ├── types.ts                      # Shared TypeScript types
│   ├── utils/
│   │   ├── converter.ts              # Base conversion, auto-detection & two's complement
│   │   └── binaryOps.ts              # Bit-accurate add/sub/mul/div engine + step traces
│   ├── three/
│   │   └── FlowWaveScene.ts          # Animated WebGL background (Three.js)
│   └── components/
│       ├── Header.tsx                # Top nav & mode switcher
│       ├── FlowWaveBackground.tsx    # React mount point for the animated background
│       ├── WelcomeBanner.tsx         # First-time user onboarding guide
│       ├── PresetsBar.tsx            # Quick-select preset values
│       ├── ConversionInput.tsx       # Base input & auto-detect panel
│       ├── LiveBasesGrid.tsx         # All-bases live output grid
│       ├── StepByStepBreakdown.tsx   # Conversion derivation steps
│       ├── BinaryOperationsCard.tsx  # Binary arithmetic UI + derivation tables
│       ├── BitGridVisualizer.tsx     # Interactive bit grid (8/16/32-bit)
│       ├── TwosComplementCard.tsx    # Signed integer / two's complement engine
│       ├── AsciiConverterCard.tsx    # Text ↔ ASCII/binary/hex/octal encoder
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

### v2.5.0 — Premium Emerald UI & Binary Operations

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

## Future Improvements

- Signed operand support (currently unsigned magnitudes) in Binary Operations, plus AND / OR / XOR / rotate
- Expanded character encoding support (Unicode / UTF-8)
- Conversion history and export/share functionality
- Keyboard shortcuts for faster input

---

## 📸 Screenshots

<table>
  <tr>
    <td><img width="1905" height="995" alt="1" src="https://github.com/user-attachments/assets/62e17018-4f88-4b36-b42b-9dda2d8e09ca" /></td>
    <td><img width="1919" height="996" alt="2" src="https://github.com/user-attachments/assets/5a52972d-9ad4-4dfa-89b4-37d2fc0a7f12" /></td>
  </tr>
  <tr>
    <td><img width="1906" height="996" alt="3" src="https://github.com/user-attachments/assets/a5423ea4-cbe8-4ee8-b09f-1d565d9855a6" /></td>
    <td><img width="1905" height="996" alt="4" src="https://github.com/user-attachments/assets/bb816817-6e7f-4f98-9ba2-b57de1460b77" /></td>
  </tr>
</table>

> Screenshots reflect the pre-v2.5 UI — refresh with new captures once the emerald redesign is live.

---

## Author

**Syed Shaheer Ali**
BSCS Undergrad @ Bahria University
