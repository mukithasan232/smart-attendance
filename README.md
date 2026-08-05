# 🎯 Smart Face Recognition Attendance System

> **A Full-Stack, Real-Time AI Face Recognition System** — Optimised for Apple Silicon (M1/M2/M3)
> 
> *Live Video Stream → InsightFace AI → FastAPI Backend → Next.js Frontend UI → Telegram Alerts*

---

## 🌟 Overview

The **Smart Face Recognition Attendance System** is an end-to-end security and attendance tracking application. It connects to an RTSP IP camera (or webcam), processes frames locally using state-of-the-art AI (InsightFace), logs recognition events to an SQLite database, and serves a beautiful, real-time dashboard built with Next.js and Tailwind CSS. 

Unrecognized individuals trigger instant Telegram alerts with actionable buttons to seamlessly onboard them into the system.

---

## ✨ Key Features

- 🎥 **Live Stream & Detection**: Supports RTSP IP cameras and built-in webcams with real-time bounding boxes and identification overlays.
- 🧠 **Advanced AI Vision**: Powered by InsightFace `buffalo_l` (512-D embeddings) for highly accurate face detection and recognition.
- 🍎 **Apple Silicon Optimised**: Leverages CoreML ONNX providers and thermal optimizations (frame skipping, FPS limiters) for cool, fanless operation on MacBooks.
- 💻 **Modern Web Dashboard**: A Next.js frontend to view the live camera feed, browse event logs, and manage registered persons.
- 📱 **Telegram Bot Integration**: Instantly sends snapshots of "Unknown" faces to an admin chat with 1-tap `[Add as Known]` or `[Ignore]` controls.
- 🛡️ **Quality & Blur Filtering**: Advanced Laplacian variance and bounding box size filtering ensures only clear, high-quality faces are logged and alerted.
- 🗄️ **Local SQLite Database**: Lightning-fast async database operations, ensuring zero blocking on the AI processing thread.

---

## 🛠️ Tech Stack

### Backend
* **Language:** Python 3.10+
* **Framework:** FastAPI
* **AI/CV:** InsightFace, OpenCV, ONNX Runtime
* **Database:** aiosqlite (SQLite)
* **Messaging:** aiogram (Telegram Bot)

### Frontend
* **Framework:** Next.js (React 19)
* **Styling:** Tailwind CSS (v4), Lucide React Icons
* **API Comms:** native `fetch` with server-side proxying

---

## 📁 Project Structure

```text
smart-attendance/
├── main.py              # FastAPI entry point & core processing loop
├── camera.py            # RTSP camera stream handling & MJPEG generation
├── vision.py            # InsightFace AI engine & embedding matching
├── database.py          # Async SQLite CRUD operations
├── bot.py               # Telegram bot logic & webhook handling
├── config.py            # Centralised configuration loader
├── package.json         # Root scripts (e.g., dev:all)
├── .env                 # Backend configuration secrets
├── models/              # Local cache for InsightFace models (~400 MB)
├── snapshots/           # Local storage for captured face images
├── security.db          # SQLite Database
│
└── frontend/            # Next.js Web Dashboard
    ├── app/             # Next.js App Router pages (Events, Persons, Settings)
    ├── components/      # Reusable UI components (Sidebar, Tables, Camera feed)
    ├── package.json     # Frontend dependencies & concurrently scripts
    └── .env.local       # Frontend environment variables
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm
- (Optional) **ngrok** for Telegram webhooks

### 2. Backend Setup
```bash
# Navigate to the project root
cd smart-attendance

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Return to root
cd ..
```

### 4. Configuration

**Backend (`.env`)**
Create or edit `.env` in the root folder. See `.env.example` for all options.
```env
RTSP_URL=0                          # 0 for webcam, or rtsp://user:pass@ip:port/stream
FACE_MATCH_THRESHOLD=0.5            # Similarity cutoff (0.0 to 1.0)
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_ADMIN_ID=your_chat_id
TELEGRAM_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app
```

**Frontend (`frontend/.env.local`)**
Create `frontend/.env.local` to point the frontend to the backend API.
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 5. Run the Full Stack
We've configured a single command that uses `concurrently` to launch both the FastAPI backend and the Next.js frontend simultaneously!

Make sure you are in the **project root** directory and run:
```bash
npm run dev:all
```
* **Frontend UI:** Open your browser to `http://localhost:3000`
* **Backend API Docs:** Available at `http://localhost:8000/docs`

> *Note: On the very first run, InsightFace will download its AI models (~400MB) into the `./models` directory. This may take a few minutes depending on your connection.*

---

## 📱 Telegram Admin Flow

The system features an interactive Telegram bot for handling unrecognized faces in real-time.

1. **Detection:** VisionEngine spots an "Unknown" face that passes quality and blur checks.
2. **Alert:** A snapshot is saved and sent to the Telegram Admin with inline buttons.
3. **Action:** Admin clicks **[✅ Add as Known]**.
4. **Registration:** The bot prompts for a name. The admin replies (e.g., "John Doe").
5. **Sync:** The database is updated, the embedding is saved, and the VisionEngine cache is hot-reloaded automatically. The system now recognizes John Doe!

---

## 🔧 Hyper-Parameter Tuning

If you experience flickering or slow detection, you can fine-tune the system in `.env`:

| Variable | Default | Description |
|---|---|---|
| `FACE_MATCH_THRESHOLD` | `0.5` | The tolerance for matching faces. Lower (e.g., 0.4) is stricter, higher (e.g., 0.6) is more forgiving to angles/lighting. |
| `FACE_DETECT_THRESHOLD` | `0.5` | Minimum confidence score for the AI to consider a shape a face. |
| `UNKNOWN_COOLDOWN_SEC` | `120` | Seconds to wait before alerting about the *same* unknown person standing in frame to prevent spam. |
| `FRAME_SKIP` | `4` | Processes every Nth frame. Higher = cooler CPU, Lower = smoother tracking. |

*(Advanced blur and bounding box size thresholds are configured directly in `main.py`).*

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| **Cannot find `package.json` error** | Ensure you are running `npm run dev:all` from the *root* directory, not inside `frontend/`. |
| **No face detected / "Unknown" spam** | Check room lighting. Ensure the face is close enough to pass the 40x40px bounding box requirement. |
| **Telegram webhook failing (404)** | Your `TELEGRAM_WEBHOOK_URL` ngrok link has likely expired. Restart ngrok, update `.env`, and restart the backend. |
| **InsightFace Installation Errors** | Ensure you have a C++ compiler installed (e.g., Xcode Command Line Tools on Mac). |
