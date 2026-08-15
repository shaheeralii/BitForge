# ⚙️ BitForge

> An interactive toolkit for exploring number systems, binary representation, signed integers, and text encoding.

**[🚀 Live Demo](https://bit-forge-tech-forge5.vercel.app/)**

![Live Demo](https://img.shields.io/badge/demo-live-65DCD5?style=flat-square)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)

---

## Overview

BitForge is a browser-based toolkit for working with number systems and low-level data representation. It brings base conversion, bit-level manipulation, two's complement arithmetic, and ASCII encoding together in one interactive interface, with live results and step-by-step mathematical breakdowns for every operation.

It's built as a practical companion for students, developers, and anyone learning how computers represent numbers and text — the kind of tool you'd reach for when you want to *see* a conversion happen, not just read about it.

---

## Features

### 🔢 Number System Converter
Convert values between **Decimal, Binary, Octal, Hexadecimal, and a Custom Base (2–36)**. Input is auto-detected from format (recognizing `0x`, `0b`, and `0o` prefixes) or can be locked to a specific base manually. Supports fractional values and displays results across all bases simultaneously in a live grid, alongside a full step-by-step derivation (positional weight expansion or repeated division, depending on direction).

### 🧩 Interactive Bit Grid
A clickable bit matrix at **8-, 16-, or 32-bit** width. Toggle individual bits to see the value update in real time, or use the built-in operations — Invert All (NOT), Shift Left, Shift Right, Clear, and Set All. Each bit is labeled with its position and weight, and the panel shows the live unsigned decimal, signed (two's complement) decimal, hexadecimal, and octal equivalents, each copyable with one click.

### ➕ Two's Complement Engine
Enter a signed decimal integer and get its **two's complement binary and hex representation** at a chosen bit width (8/16/32-bit), with automatic range/overflow detection. A step-by-step breakdown walks through the invert-and-add-one process for negative values, and quick preset buttons let you jump to boundary values (min, max, ±1, 0) for the selected width.

### 🔤 Text & ASCII Encoding
Type any text string and see it encoded character-by-character into **decimal ASCII code, 8-bit binary, hexadecimal, and octal**, along with a combined full binary stream and hex byte stream for the whole string. All outputs are copyable.

---

## Why BitForge?

Number systems, bits, signed integers, and text encoding are usually taught as separate topics — but they're all the same underlying idea viewed from different angles. BitForge ties them together in one place, so you can move naturally between:

**Number Systems → Binary Bits → Signed Integers → Text/ASCII**

and build an intuition for how computers actually store and manipulate data at the bit level, rather than memorizing each concept in isolation.

---

## How It Works

```text
Input (number, bit pattern, or text)
  ↓
Select Mode (Converter / Bit Grid / Two's Complement / ASCII)
  ↓
BitForge computes the result live, in-browser
  ↓
Converted value + step-by-step breakdown displayed
```

All computation happens client-side in the browser — there's no backend or API call involved.

---

## Use Cases

- Learning and practicing number system conversions
- Visualizing how individual bits contribute to a binary value
- Studying two's complement and signed integer representation
- Exploring ASCII character encoding
- Supporting introductory Computer Science coursework and revision
- Quickly cross-checking a manual conversion or bitwise operation

---

## Technology Stack

| Category | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Icons | lucide-react |
| Deployment | Vercel |

---

## Project Architecture

```text
BitForge/
├── index.html                       # App entry HTML
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Root component, mode routing & layout
│   ├── index.css                    # Global styles / Tailwind entry
│   ├── types.ts                     # Shared TypeScript types
│   ├── utils/
│   │   └── converter.ts             # Core conversion, base-detection & two's complement logic
│   └── components/
│       ├── Header.tsx               # Top nav & mode switcher
│       ├── WelcomeBanner.tsx        # First-time user onboarding guide
│       ├── PresetsBar.tsx           # Quick-select preset values
│       ├── ConversionInput.tsx      # Base input & auto-detect panel
│       ├── LiveBasesGrid.tsx        # All-bases live output grid
│       ├── StepByStepBreakdown.tsx  # Mathematical derivation steps
│       ├── BitGridVisualizer.tsx    # Interactive bit grid (8/16/32-bit)
│       ├── TwosComplementCard.tsx   # Signed integer / two's complement engine
│       ├── AsciiConverterCard.tsx   # Text ↔ ASCII/binary/hex/octal encoder
│       └── Footer.tsx               # Status footer bar
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm

### Installation

```bash
git clone <repository-url>
cd BitForge
npm install
```

### Run Locally

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Output is generated in `dist/`. Preview the production build with:

```bash
npm run preview
```

---

## Deployment

BitForge is deployed and publicly accessible on **Vercel**:

**Live Demo:** https://bit-forge-tech-forge5.vercel.app/

---

## 📸 Screenshots

> Screenshots coming soon.

---

## Learning Outcomes

Building BitForge involved working through:

- Number systems and radix/base conversion
- Binary representation and positional notation
- Bit-level manipulation (shifting, inverting, masking)
- Signed integer representation and two's complement
- ASCII character encoding
- Interactive UI development with React and TypeScript
- Component-based application architecture

---

## Future Improvements

> The following are potential future improvements — not current features.

- Support for additional number bases beyond the current custom range
- More advanced bitwise operations (AND, OR, XOR, rotate)
- Expanded character encoding support (e.g., Unicode/UTF-8)
- Additional visualization modes
- Keyboard shortcuts for faster input
- Conversion history
- Export/share functionality for results

---

## Author

**Syed Shaheer Ali**  
BSCS Undergrad @Bahria University

---

