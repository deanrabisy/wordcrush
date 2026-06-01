# Word Crush Duel

A two-player real-time word-search duel built with React, Vite, Express, and Socket.IO.

## Local development

The root package uses npm workspaces:

```sh
npm install
npm run dev
```

The client runs on http://localhost:5173 and the server runs on http://localhost:3001.

## GitHub Pages and Firebase

This repo publishes the Vite client to GitHub Pages on pushes to `main`.

Live multiplayer uses Firebase Realtime Database directly from the browser, so no Render or Express server is required. Add these GitHub repository variables before deploying a playable production build:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

For local development, copy `client/.env.example` to `client/.env.local` and fill in the same values.

The included `firebase.database.rules.json` is intentionally open for quick testing. Tighten these rules before sharing the game broadly.

## Branding

The theme colors live at the top of `client/src/styles.css` and are derived from the Adaptive logo palette. Replace `client/public/logo.png` with an updated logo file, keeping the same filename, and the app will use it in both local and GitHub Pages builds.
