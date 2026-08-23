# 📚 Manga Reader

A modern, fast, responsive Manga Reader web application optimized for static hosting on **GitHub Pages (`github.io`)**, powered by the official **MangaDex REST API**.

The application operates as a full client-side Single Page Application (SPA) without requiring any server infrastructure. It also includes an optional Python/Flask backend for local development or traditional web server hosting.

---

## ✨ Features

- **🚀 Serverless Static Hosting**: 100% compatible with GitHub Pages (`github.io`). No backend server or paid database required.
- **🔍 Real-Time Search**: Search thousands of manga titles instantly with cover previews, publication status, and year tags.
- **📖 Chapter Navigator**: Filter chapters by keyword or sort between Ascending (1 ➔ N) and Descending (N ➔ 1) release order.
- **🖼️ Webtoon & Image Reader**: Seamless vertical scroll reading mode, page counter badge, Data Saver mode (compressed images), and automated image retries on network dropouts.
- **🔖 Reading History & Progress Tracker**: Automatically saves your last read chapter and position in browser `localStorage`.
- **🌙 Dark Mode UI**: Built with Bootstrap 5, FontAwesome icons, and custom responsive CSS.
- **🔄 Dual Architecture**: Runs both as a static frontend on GitHub Pages and as a dynamic Flask app locally.

---

## 🏗️ How It Works

### 1. Client-Side Static Mode (GitHub Pages)
When hosted on GitHub Pages, `index.html` loads `static/app.js` which directly communicates with the open **MangaDex REST API** (`api.mangadex.org`):
- **Search API**: `GET /manga?title={query}&includes[]=cover_art` fetches titles and cover image paths.
- **Chapter Feed API**: `GET /manga/{id}/feed?translatedLanguage[]=en` resolves chapter metadata and available languages.
- **Image Server API**: `GET /at-home/server/{chapter_id}` requests CDN image server URLs and page hashes.

All image traffic is fetched directly from MangaDex's global CDN network, avoiding CORS restrictions and backend latency.

### 2. Python / Flask Backend Mode (Local Server)
For local development or server deployment (e.g. Render, Vercel, Heroku):
- `scrapper.py` contains Python wrapper methods (`get_search_result`, `get_chapters`, `get_images`).
- `website/auth.py` and `website/views.py` handle Flask route routing and Jinja2 HTML template rendering.

---

## 🛠️ Usage & Local Setup

### Option A: GitHub Pages Deployment (Recommended)
1. Fork or push this repository to GitHub under your user/organization account (e.g., `username.github.io`).
2. Go to **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment > Source**, select **GitHub Actions** (or select `main` branch root `/`).
4. Pushing any changes to the `main` branch will automatically trigger `.github/workflows/deploy.yml` to publish your live site!

### Option B: Running Locally with Flask

1. **Clone the repository**:
   ```bash
   git clone https://github.com/akshat-1/akshat-1.github.io.git
   cd akshat-1.github.io
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask application**:
   ```bash
   python app.py
   ```

4. **Open in browser**:
   Navigate to `http://127.0.0.1:5000` or `http://localhost:5000`.

---

## ⚙️ Configuration & Project Structure

```
.
├── index.html                  # Main Single Page Application (GitHub Pages entry point)
├── static/
│   ├── app.js                  # Client-side API engine & state router
│   └── app.css                 # Dark theme responsive styling
├── scrapper.py                 # Python MangaDex API wrapper for Flask
├── app.py                      # Flask server entry point
├── requirements.txt            # Python dependencies
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
└── website/                    # Flask blueprints, routes, and legacy HTML templates
    ├── __init__.py
    ├── auth.py
    ├── views.py
    └── templates/
```

### Deployment Workflow (`.github/workflows/deploy.yml`)
The included GitHub Actions workflow automatically packages and deploys all static assets to GitHub Pages whenever code is pushed to the `main` branch.

---

## 📄 License & Credits

- **Data Source**: Powered by the free and open [MangaDex API](https://api.mangadex.org).
- **Icons & UI**: [FontAwesome 6](https://fontawesome.com/) & [Bootstrap 5](https://getbootstrap.com/).
