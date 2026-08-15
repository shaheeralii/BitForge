# BitForge — Number Systems & Encoding Toolkit

BitForge is an interactive number-system converter built with React, TypeScript, and Tailwind CSS. It supports:

- Live conversion between Denary (Decimal), Binary, Octal, Hexadecimal, and any Custom Base (2–36)
- Automatic base detection from raw input (with support for `0x`, `0b`, `0o` prefixes)
- Step-by-step mathematical derivations for every conversion
- A 32-bit interactive Bit Grid visualizer
- Two's Complement signed-integer calculator
- ASCII / text-to-binary-hex-octal encoding

## Run locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Build for production

```bash
npm run build
```

Output is generated in `dist/`. Preview it locally with `npm run preview`.

## Tech stack

React 19, TypeScript, Vite 6, Tailwind CSS 4, lucide-react icons.
