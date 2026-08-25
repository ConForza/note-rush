# Whack-a-Note

Whack-a-Note is a mobile-first music note-reading game built with React and TypeScript.

[Play Whack-a-Note](https://conforza.github.io/note-rush/)

## Requirements

- Node.js 22.13.0 or newer
- npm 10.9.7 or newer

These minimum versions are also encoded in `package.json`. The development environment currently uses Node.js 22.22.2 and npm 10.9.7.

## Local development

```bash
npm install
npm run dev
```

## Installable offline app

Whack-a-Note is an installable Progressive Web App. The production build
includes the app shell, icons, manifest, and service worker so a device can
open the game and play offline after its first successful online visit.

```bash
npm run build
npm run preview
```

The service worker is disabled during normal Vite development. Production
updates use a deferred service-worker lifecycle, so a new build is picked up on
a later load rather than forcing a refresh during an active round. There is no
in-game update prompt. Asset
URLs use a relative Vite base, which keeps the manifest, icons, and worker
paths compatible with root hosting and GitHub Pages repository subpaths.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Current project status

Whack-a-Note v1.0.0 includes Arcade mode with six treble, bass, and mixed-clef stages; targeted Practice mode; optional session timers; scoring, streaks, and Arcade lives; synthesized sound and optional haptics; saved setup preferences; installable offline PWA support; and keyboard, reduced-motion, and mobile accessibility hardening.
