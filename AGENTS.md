# AGENTS.md - Sassamaru Player Architecture

This file describes the architecture, tools, and coding conventions for the Sassamaru Player PWA. Jules should use this context to generate relevant code and plans.

## 🌍 Project Overview
Sassamaru Player is a Progressive Web App (PWA) for streaming audio. It combines three audio sources into a single interface:
1.  **YouTube** (via IFrame API)
2.  **Jamendo** (via Public JSON API)
3.  **Podcasts** (via RSS Feeds with Hybrid Fallback)

## 🤖 Agents & Modules

### 1. Core Player Agent (`script.js`)
**Role:** Orchestrates the application state, manages audio playback (MP3 & YouTube), handles global search, and playlist management.

* **Key Responsibilities:**
    * **State Management:** manages `currentAudio` (HTML5 Audio) and `ytPlayer` (YouTube Object).
    * **Playback Logic:** The `playTrack(source, title, isYT)` function is the single source of truth. It ensures MP3 pauses when YT plays, and vice-versa.
    * **YouTube Integration:** Initializes the IFrame API.
        * *Constraint:* Must use `origin: window.location.origin` in playerVars.
        * *Constraint:* The container `#yt-player-container` must NOT be `display: none` (causes buffering issues). It uses the opacity/absolute positioning hack in CSS.
    * **Data Sources:** Fetches from Jamendo API and YouTube Data API (Search).

### 2. Podcast Agent (`podcasts.js`)
**Role:** Specialized module for fetching, parsing, and rendering RSS feeds.

* **Strategy (Hybrid Fetching):**
    * **Primary:** Uses `api.rss2json.com` to convert XML to JSON (Fast, low latency).
    * **Fallback:** If the API fails (e.g., feed too large), it falls back to `api.allorigins.win/raw` (Proxy) + `DOMParser` to read XML manually.
* **Safety:** Uses `escapeStr()` to sanitize titles and URLs before injecting them into HTML `onclick` events to prevent syntax errors with quotes.
* **Interaction:** Exposes `renderPodcasts(container)` which `script.js` calls when the user navigates to the Podcast section.

### 3. PWA Agent (`sw.js` & `manifest.json`)
**Role:** Manages offline capabilities, caching, and installation eligibility (Android/iOS).

* **Caching Strategy:** Cache-First, falling back to Network (`Stale-While-Revalidate` logic for assets).
* **Versioning:** The `CACHE_NAME` (e.g., `sassamaru-v3`) MUST be incremented whenever critical files (`index.html`, `script.js`) are modified to force clients to update.
* **Assets:** Caches HTML, CSS, JS, and PNG icons.

### 4. UI/Layout Agent (`style.css` & `index.html`)
**Role:** Handles responsive design and visual theming ("Kawaii/Pinscher" aesthetic).

* **Desktop Layout:** CSS Grid (`280px 1fr`). Sidebar is fixed on the left.
* **Mobile Layout (<768px):** CSS Flexbox (Column). Sidebar moves to top (header), Player Bar becomes fixed at the bottom (`position: fixed; bottom: 0`).
* **DOM Structure:** `main.content` is dynamic. Its content is wiped and rebuilt by `script.js` based on navigation.

## 🛠️ Tools & APIs

| Tool | Purpose | Constraints |
| :--- | :--- | :--- |
| **YouTube IFrame API** | Video Audio Playback | Requires `enablejsapi=1`, strictly ordered script loading. |
| **Jamendo API v3.0** | Music Search/Stream | Client_ID required. Returns MP3 links. |
| **RSS2JSON** | Podcast Parsing | Used as primary fetch method to avoid CORS/Parsing overhead. |
| **AllOrigins** | CORS Proxy | Used only as fallback for heavy XML feeds. |
| **LocalStorage** | Persistence | Stores `myPlaylist` array. |

## 📝 Conventions for Jules

1.  **Sanitization:** When generating HTML strings in JS, ALWAYS use `escapeStr()` for dynamic values inside `onclick="..."`.
2.  **Async/Defer:** Scripts in `index.html` must use `defer` to ensure the DOM is ready and to prevent blocking the UI.
3.  **YouTube Visibility:** Never hide the YouTube player with `display: none` or `visibility: hidden`. Use `opacity: 0.001` and `z-index: -1`.
4.  **Error Handling:** Podcast fetching must always include `try/catch` blocks to handle CORS errors gracefully without breaking the main app loop.
5.  **Mobile First:** When modifying CSS, always check the `@media (max-width: 768px)` block to ensure mobile layout integrity.
