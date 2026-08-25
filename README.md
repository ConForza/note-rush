# Note Rush

Note Rush is a mobile-first music note-reading game built with React and TypeScript.

## Requirements

- Node.js 22.13.0 or newer
- npm 10.9.7 or newer

These minimum versions are also encoded in `package.json`. The development environment currently uses Node.js 22.22.2 and npm 10.9.7.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Current project status

Note Rush now includes a playable mobile whack-a-mole-style treble note-identification loop using dynamically generated correct and decoy targets. Scoring, lives, timing, progression, custom graphics, audio, and persistence are still to come.
