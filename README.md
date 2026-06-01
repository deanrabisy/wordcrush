# Word Crush Duel

A two-player real-time word-search duel built with React, Vite, Express, and Socket.IO.

## Local development

The root package uses npm workspaces:

```sh
npm install
npm run dev
```

The client runs on http://localhost:5173 and the server runs on http://localhost:3001.

## GitHub Pages

This repo includes `.github/workflows/pages.yml`, which publishes the Vite client from `client/dist` on pushes to `main`.

GitHub Pages can host the React client, but it cannot host the Socket.IO/Express server. Host the server separately, then add a repository variable named `VITE_SERVER_URL` with the public server URL, for example:

```text
https://your-word-crush-server.example.com
```

The server should also receive `CLIENT_ORIGIN` set to the GitHub Pages URL so CORS allows the deployed client.

## Branding

The theme colors live at the top of `client/src/styles.css` and are derived from the Adaptive logo palette. Replace `client/public/logo.png` with an updated logo file, keeping the same filename, and the app will use it in both local and GitHub Pages builds.
