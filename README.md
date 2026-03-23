# Math Knowledge Tool

A Vite + React + TypeScript prototype for elementary school math knowledge-point practice.

## Online Access

- Public page: <https://peihan-banana.github.io/Math_Knowledge/>
- Page QR code: `public/math-knowledge-pages-qr.png`

## Current MVP

- Grade 3 first semester
- 2 sample units
- Knowledge catalog and concept cards
- Point practice
- Unit challenge
- Wrong-question review
- Weak-tag summary
- Per-student local records
- Firebase Realtime Database cloud sync

## Firebase Cloud Sync

### Local development

1. Create a Firebase Web App and enable `Realtime Database`
2. Copy `.env.example` to `.env.local`
3. Fill in these variables:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

4. Run:

```bash
npm install
npm run dev
```

### GitHub Pages deployment

If you want the published GitHub Pages site to use Firebase too, add the same keys in the GitHub repository Variables page:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Path:
`Settings` -> `Secrets and variables` -> `Actions` -> `Variables`

The Pages workflow already reads those variables during build.

If Firebase is not configured, the app automatically falls back to local storage.

## Project Structure

- `src/App.tsx`: main UI and practice flow
- `src/data/mathContent.ts`: course and question data
- `src/lib/learningSync.ts`: local/cloud learning record sync
- `src/App.css`: layout and visuals
- `src/index.css`: global theme styles

## Build

```bash
npm run build
```