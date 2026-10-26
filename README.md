# XiaMusic

A minimal, elegant music player designed to run as a web app and as a Windows desktop app via Electron.

## Current features

- Import local audio files or select a folder
- Persistent, device-local library storage using IndexedDB
- Browser/Electron audio playback with play/pause, seek, volume, next/previous
- Search imported tracks by title, artist, or album
- Favorites, Recently Added, Most Played, and Recently Played smart playlists
- Album and artist browsing based on available filename information
- Local library statistics and playback counts
- Queue panel and shuffle/repeat toggles
- Responsive desktop and small-screen layouts
- Settings panel and clear-library action
- Electron desktop wrapper and Windows NSIS packaging configuration

## Important MVP limitations

- **Local files are not uploaded.** Audio blobs, library metadata, favorites, and playback history are stored in the browser profile's IndexedDB database. Clearing browser data removes the stored library.
- Track titles and artists are inferred from filenames such as `Artist - Song`; folder imports use the parent folder as an album fallback. Track durations are detected when a track loads, and metadata cannot be read reliably for every format.
- Album-art visuals are generated CSS artwork, not official cover art. Artwork embedded in audio files is not extracted.
- Play counts increment after 30 seconds of playback or when a shorter track finishes. These counts are local to the current browser profile.
- Online streaming is **not connected yet**. A real catalog requires a provider whose terms authorize streaming in your app, plus the required API integration and usually a backend. Do not scrape or redistribute copyrighted music without permission.
- The UI is an original design inspired by clean music-app patterns; it does not use Spotify or Apple Music branding.

## Requirements

- Node.js 20 or newer recommended
- npm
- Windows for building/testing the Windows installer

## Run as a web app

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

Create a production web build:

```bash
npm run build
npm run preview
```

## Run the desktop wrapper during development

```bash
npm install
npm run desktop
```

## Build the Windows installer

On Windows:

```bash
npm install
npm run desktop:build
```

The NSIS installer output is written to `release/`.

Packaging has not been run as part of creating this starter. The first run of `npm install` downloads dependencies.

## Recommended next steps

1. Add user-created playlists and persisted playlist editing.
2. Extract embedded audio metadata and artwork where browser support permits.
3. Add a licensed streaming provider adapter and backend service; keep provider secrets on the server.
4. Add authentication, cloud sync, migrations, tests, accessibility checks, and error/empty states.
5. Add signing, update delivery, and release automation before distribution.
