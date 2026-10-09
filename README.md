# 🚀 OmniPost

> **Say it once. We shape it for everywhere.**  
> An autonomous multi-agent AI content engine that adapts your core message across LinkedIn, Twitter, Instagram, and more while learning and preserving your unique brand voice.

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f?style=for-the-badge&logo=github)](https://buragaddavishnupriya-coder.github.io/OmniPost/)
[![Backend Status](https://img.shields.io/badge/API_Status-Live_on_Render-46E3B7?style=for-the-badge&logo=render)](https://omnipost-backend-jl5a.onrender.com/health)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)

---

## 🌐 Live Links

- **Web Application:** [https://buragaddavishnupriya-coder.github.io/OmniPost/](https://buragaddavishnupriya-coder.github.io/OmniPost/)
- **API Health Check:** [https://omnipost-backend-jl5a.onrender.com/health](https://omnipost-backend-jl5a.onrender.com/health)
- **Interactive API Docs (Swagger):** [https://omnipost-backend-jl5a.onrender.com/docs](https://omnipost-backend-jl5a.onrender.com/docs)

---

## ✨ Features

- **Multi-Agent Orchestration Pipeline:**
  - **Strategy Agent:** Analyzes raw ideas and determines optimal target platforms.
  - **Drafter Agent:** Creates customized content formatted natively for LinkedIn, Twitter, Instagram, etc.
  - **Critic Agent:** Iteratively critiques, refines, and scores draft quality before publication.
  - **Analytics Agent:** Predicts reach, engagement, and click-through rates.
- **Brand Voice Learning Loop:** Automatically updates your brand voice profile whenever you make approved edits to drafts.
- **Unified Social Dashboard:** Single-pane-of-glass workspace for post drafting, scheduled calendars, analytics, and automated growth agents.
- **Flexible AI Integration:** Powered by Google Gemini and Anthropic Claude.

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS + Google Material Symbols
- **Hosting:** GitHub Pages via GitHub Actions CI/CD

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL (with SQLite fallback) via SQLAlchemy
- **Authentication:** JWT (JSON Web Tokens) with bcrypt password hashing
- **AI Engine:** Google Gemini API (`google-genai`) & Anthropic Claude API (`anthropic`)
- **Hosting:** Render.com Web Service

---

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/buragaddavishnupriya-coder/OmniPost.git
cd OmniPost
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📄 License

This project is licensed under the MIT License.
