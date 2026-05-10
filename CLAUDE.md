# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server
npm run build    # type-check + production build
npm run lint     # eslint
npm run preview  # preview production build
```

## Stack

- **Vite 8** + **React 19** + **TypeScript 6**
- **MUI v9** (`@mui/material`, `@mui/icons-material`) with Emotion for styling

## Key notes

- MUI v9 does not support shorthand system props (e.g. `mt={2}`). Always use the `sx` prop: `sx={{ mt: 2 }}`.
- `ThemeProvider` and `CssBaseline` are set up in `App.tsx` — all components render inside that tree.
- TypeScript is strict: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` are enabled. No `any`, no type assertions to bypass errors.
