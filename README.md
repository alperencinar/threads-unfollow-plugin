# Threads Unfollower Tracker

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Framework](https://img.shields.io/badge/Framework-WXT-purple.svg)](https://wxt.dev/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Local-First](https://img.shields.io/badge/Storage-IndexedDB%20(Local)-brightgreen.svg)](#privacy--security)

A local-first Chrome extension for Threads (`threads.com` and `threads.net`) to detect unfollowers, non-followers, fans, and mutuals through client-side GraphQL interception.

---

## Why This Project?

Most follower trackers require account passwords, send session cookies to remote servers, or make aggressive automated requests that trigger Instagram/Threads action blocks.

This extension runs completely in the browser:
- **Zero Remote Servers:** All parsing, storage, and diffing happen locally in IndexedDB (`Dexie.js`).
- **Passive Interception:** Captures follower data from network responses while you browse normally. It does not send bulk automated scraping requests.
- **Rate-Limited Queue:** Unfollow automation includes 12 to 25-second randomized intervals and a circuit breaker that halts immediately if an HTTP 429 or rate limit occurs.
- **Avatar Loading:** Uses Chrome's Declarative Net Request rules to handle Meta CDN headers without broken image placeholders.

---

## Features

### Tabs
- **Not Following Back:** Accounts you follow who do not follow you back.
- **Fans:** Accounts following you that you do not follow.
- **Mutuals:** Accounts where both parties follow each other.

### Unfollow Controls
- **Single Unfollow:** Remove individual accounts directly from the Side Panel.
- **Batch Queue (Unfollow All):** Processes up to 25 accounts per session with randomized delays (12–25 seconds) and a live countdown timer.
- **Circuit Breaker:** Automatically trips and stops the queue if an action block or HTTP 429 response is received.

### Side Panel UI
- Built with React 19 and a dark layout.
- Runs inside Chrome's native Side Panel without obscuring the page.
- Single-click language toggle between English and Türkçe.

---

## Architecture & Codebase

The project follows a layered architecture with separated domain, infrastructure, and presentation modules:

```
threads-unfollow-plugin/
├── entrypoints/
│   ├── background.ts             # Service Worker (DNR rules & message routing)
│   ├── content.ts                # Isolated Content Script (Bridge broker)
│   ├── interceptor.content.ts    # Main World Script (Fetch listener & CSRF dispatcher)
│   └── sidepanel/                # React 19 Side Panel UI
│       ├── App.tsx
│       ├── components/           # UI Components (UserCard, TabNavigation, AutoUnfollowControl)
│       └── style.css
├── src/
│   ├── domain/                   # Business logic (No external dependencies)
│   │   ├── entities/             # SocialUser, FollowerSnapshot, DiffResult
│   │   └── services/             # SnapshotDiffEngine, SafetyCircuitBreaker, UnfollowQueueManager
│   ├── infrastructure/           # Storage & network parsing
│   │   ├── parser/               # ThreadsGraphQLParser (Relay / GraphQL decoder)
│   │   └── storage/              # LocalDatabase (IndexedDB via Dexie.js)
│   └── presentation/             # Store & i18n
│       ├── store/                # Zustand state management
│       └── i18n.ts               # Turkish & English translations
└── tests/                        # 30 Vitest unit and integration tests
```

---

## Installation & Setup / Chrome Kurulumu

### Option 1: Install from Release Zip (Recommended for General Users)

1. Download the latest `threads-unfollower-extension-x.x.x-chrome.zip` from [Releases](https://github.com/alperencinar/threads-unfollow-plugin/releases).
2. Extract the zip file into a local folder.
3. In Chrome, open `chrome://extensions/`.
4. Turn on **Developer mode** in the top-right corner.
5. Click **Load unpacked** in the top-left corner and select the extracted folder.
6. Pin the extension from Chrome's extension menu (puzzle icon).

---

### Seçenek 2: Kaynak Koddan Derleyerek Kurulum (Geliştiriciler)

1. Depoyu klonlayın:
   ```bash
   git clone https://github.com/alperencinar/threads-unfollow-plugin.git
   cd threads-unfollow-plugin
   ```

2. Bağımlılıkları yükleyin ve derleyin:
   ```bash
   npm install
   npm run build
   ```
   *Bu işlem sonucunda `dist/` dizini içinde üretime hazır eklenti dosyaları oluşur.*

3. Chrome'a yükleyin:
   - `chrome://extensions/` sayfasını açın.
   - Sağ üstteki **Geliştirici modu**nu açın.
   - **Paketlenmemiş öğe yükle** butonuna tıklayıp projedeki `dist/` klasörünü seçin.

---

## How to Use / Kullanım

1. **Open Threads:** Open [threads.com](https://www.threads.com) in your browser.  
   *(No login form or password input required. The extension uses your existing active tab session).*
2. **Open Side Panel:** Click the extension icon in Chrome's toolbar to open the Side Panel.
3. **Capture Follower Data:** Go to your Threads profile, open your **Followers** or **Following** modal, and scroll down. The extension detects the incoming network responses and updates your lists.
4. **View Lists:** Review your **Not Following Back**, **Fans**, or **Mutuals** tabs.
5. **Unfollow:** Click **Unfollow** next to any user for instant removal, or use **Safe Unfollow All** to run the queue with 12–25 second intervals.

---

## Development & Tests

```bash
# Start WXT development server with hot-reload
npm run dev

# Run TypeScript type check
npm run type-check

# Run test suite
npm test

# Build production package
npm run build

# Build extension zip
npm run zip
```

---

## Privacy & Security

- **No Remote Telemetry:** No analytics, tracker scripts, or external API endpoints.
- **Local Storage:** All snapshot data stays in the browser's IndexedDB.
- **No Password Access:** The extension cannot read passwords or sensitive credentials.

---

## Disclaimer

This extension is an independent open-source tool for personal use and is not affiliated with, maintained, or endorsed by Meta Platforms, Inc. or Threads. Use automated actions responsibly and in compliance with Meta's terms of service.

---

## License

[MIT](LICENSE)
