# Whack-a-Note

Whack-a-Note is a mobile-first music note-reading game built with React and TypeScript.

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

Whack-a-Note now includes a timed mobile arcade loop with dynamically generated note targets, score, streaks, lives, automatic missed-round handling, game over, and restart. Difficulty progression, custom graphics, audio, persistence, and PWA support are still to come.
