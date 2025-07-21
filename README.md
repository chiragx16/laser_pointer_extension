# 🔦 Glossy Laser Pointer (Chrome Extension)

A sleek and customizable laser trail that follows your mouse across any web page. Ideal for live presentations, screen recordings, tutorials, and visually guiding attention.

![Preview](preview.gif) <!-- Optional animated GIF showing effect -->

---

## ✨ Features

- 🖱️ Laser trail that follows your cursor
- 🎨 Customizable color and trail length via popup
- ⚙️ Enable/disable without reloading the page
- ♻️ Graceful cleanup when disabled or uninstalled
- 💡 Modern popup UI with real-time controls

---

## 📦 Installation (Developer Mode)

1. Clone or download this repo.
2. Go to `chrome://extensions/` in your Chrome browser.
3. Enable **Developer Mode** (top right).
4. Click **"Load unpacked"**.
5. Select the project folder (e.g., `laser-pointer-extension`).

---

## 📁 Project Structure

```bash
laser-pointer-extension/
├── manifest.json
├── contentScript.js
├── popup.html
├── popup.js
├── popup.css
└── icons/
    └── icon16.png
    └── icon48.png
    └── icon128.png
