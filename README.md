# Redora AI — Personal AI Executive Assistant & Productivity Operating System

Redora AI is an all-in-one personal AI executive assistant and productivity platform designed to manage daily workflows, automate task execution, track long-term goals, monitor habits, store intelligent memories, and provide a comprehensive suite of academic, career, developer, and document productivity tools.

---

## 📑 Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Key Features & Modules](#key-features--modules)
  - [1. Executive Assistant & Multi-Agent System](#1-executive-assistant--multi-agent-system)
  - [2. Core Productivity Suite](#2-core-productivity-suite)
  - [3. Complete Integrated Tools Suite](#3-complete-integrated-tools-suite)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started & Local Setup](#getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (FastAPI)](#1-backend-setup-fastapi)
  - [Frontend Setup (React + Vite)](#2-frontend-setup-react--vite)
  - [Environment Variables Configuration](#3-environment-variables-configuration)
  - [Supabase Authentication & OTP Setup](#4-supabase-authentication--otp-setup)
- [API Documentation](#api-documentation)
- [License](#license)

---

## 🧠 Overview & Architecture

Redora AI combines a multi-agent AI architecture with dedicated productivity modules and utility tools. When you interact with Redora AI, requests are routed through an intelligent orchestrator agent to specialized sub-agents:
- **Productivity Agent**: Manages daily schedules, task priorities, and milestone planning.
- **Study & Learning Agent**: Generates study plans, flashcards, quizzes, and learning summaries.
- **Career Agent**: Optimizes resumes, generates tailored cover letters, refines LinkedIn profiles, and conducts mock interviews.
- **Coding Agent**: Analyzes code, assists in debugging, and executes code in cloud sandboxes.
- **Memory Agent**: Automatically extracts facts, preferences, and key context to remember across future sessions.

The system converts conversational intents into actionable goals, task schedules, habit tracking logs, and analytical insights.

---

## ✨ Key Features & Modules

### 1. Executive Assistant & Multi-Agent System
- **Interactive Multi-Agent Chat**: Real-time conversational interface connected to domain-specific AI agents.
- **Autonomous Action Execution**: Automatically creates tasks, roadmaps, and habits directly from natural conversation.
- **Semantic Memory Store**: Vector-based context retention that remembers personal preferences, projects, and history.
- **Floating Quick Assistant Widget**: Instant AI assistant accessible anywhere in the application.

---

### 2. Core Productivity Suite
- **Executive Dashboard**: Central command center showcasing live productivity scores, habit streaks, upcoming deadlines, active goals, and recent agent actions.
- **Task Management**: Full task board supporting priorities (Low, Medium, High), status flows (Todo, In Progress, Completed), time-based filtering (Today, This Week, All), and AI task generation.
- **Goals & Roadmaps**: Long-term objective tracking with weighted milestone roadmaps and automatic completion calculation.
- **Habits Tracker**: Daily habit tracker with automated streak counters, consistency metrics, and historical logs.
- **Full Activity Audit Log**: Real-time audit log tracking all automated actions and tool executions performed across the system.

---

### 3. Complete Integrated Tools Suite

#### 📄 Advanced PDF Toolkit
- **Merge PDFs**: Combine multiple PDF documents into a single organized file.
- **Split PDF**: Split documents by specific page ranges or extract individual pages.
- **Compress PDF**: Reduce PDF file size with adjustable compression quality levels.
- **PDF to Word (.docx)**: Convert PDF documents into editable Microsoft Word files.
- **Word (.docx) to PDF**: Convert Word documents directly into high-fidelity PDFs.
- **Extract Text & Summarize**: Extract raw text and generate structured AI summaries.
- **Rotate Pages**: Rotate all pages or specific page ranges by 90°, 180°, or 270°.
- **Add Watermark**: Apply custom text watermarks with adjustable opacity, positioning (diagonal, center, top, bottom), and styling.
- **Add Page Numbers**: Insert customizable page numbers (header/footer, "Page X of Y", custom font size/position).
- **Protect PDF**: Secure PDF documents with standard AES password encryption.
- **Unlock PDF**: Decrypt and remove passwords from protected PDFs.

#### 💼 Career & Professional Tools
- **Resume ATS Checker**: In-depth resume evaluation against Applicant Tracking Systems, analyzing formatting, word count, section layout, keyword matching against job descriptions, and actionable AI improvement suggestions.
- **Cover Letter Generator**: Generates customized, high-converting cover letters based on uploaded resumes and target job descriptions, with instant editing and PDF export.
- **LinkedIn Profile Optimizer**: AI-driven analysis and optimization for LinkedIn headlines, "About" summaries, and experience bullets with before/after comparisons.
- **Mock Interview Simulator**: Interactive AI mock interviewer supporting behavioral and technical roles with instant feedback, scoring, and follow-up questioning.

#### 🎓 Learning & Academic Tools
- **Flashcard Generator & Spaced Repetition (SM-2)**: Create flashcard decks manually or auto-generate them using AI from notes, topics, or documents. Includes an interactive flip-card study mode powered by the SuperMemo SM-2 spaced repetition algorithm.
- **AI Quiz Generator**: Generate interactive multiple-choice and conceptual quizzes from topics, raw notes, or uploaded study material with real-time answer explanations and score breakdown.
- **YouTube Video Summarizer**: Fetches YouTube transcripts to generate concise structured summaries, key takeaways, and clickable timestamped chapters.
- **Speaking Practice**: Conversational language and public speaking coach with speech recognition, pronunciation feedback, and dialogue simulations.
- **GPA Calculator**: Multi-semester academic grade point average calculator with credit weighting, grading scales, and target GPA planning.

#### 💻 Developer & Data Science Tools
- **Multi-Language Code Sandbox**: Cloud-isolated code runner supporting **Python**, **C**, **C++**, and **Java** with custom stdin inputs, live stdout execution, and compiler error tracebacks.
- **Kaggle Hub Explorer**: Search and explore public machine learning datasets and competitive data science challenges with download statistics, sizes, and metadata.

---

## 🛠 Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router v6, Canvas Confetti |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy ORM, Pydantic v2, Uvicorn |
| **Database & Auth** | SQLite / PostgreSQL, Alembic migrations, Supabase Auth (with 6-Digit Email OTP) |
| **Document & PDF Processing** | PyPDF, ReportLab, pdf2docx, python-docx |
| **AI & LLM Services** | Google Gemini API, OpenRouter / OpenAI, Sentence Transformers (Embeddings) |
| **Execution Sandbox** | Judge0 API / Containerized code runner |

---

## 📁 Project Directory Structure

```text
lifeos/
├── backend/
│   ├── app/
│   │   ├── api/v1/                # REST API route handlers
│   │   │   ├── routes_auth.py
│   │   │   ├── routes_chat.py
│   │   │   ├── routes_tasks.py
│   │   │   ├── routes_goals.py
│   │   │   ├── routes_habits.py
│   │   │   ├── routes_pdf_tools.py
│   │   │   ├── routes_cover_letter.py
│   │   │   ├── routes_linkedin.py
│   │   │   ├── routes_flashcards.py
│   │   │   ├── routes_quiz.py
│   │   │   ├── routes_youtube.py
│   │   │   └── ...
│   │   ├── core/                  # Configuration, security & database sessions
│   │   ├── db/                    # SQLAlchemy database models
│   │   ├── schemas/               # Pydantic validation schemas
│   │   └── services/              # Business logic, AI agents, PDF & tool processors
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI components & layouts
│   │   ├── pages/                 # Main page views (Dashboard, Chat, Tasks, etc.)
│   │   │   └── tools/             # Tool pages (PdfToolkit, Flashcards, Quiz, etc.)
│   │   ├── lib/                   # Supabase client & Axios API instance
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # App routing & protected routes
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** & **npm** installed
- **Supabase Account** (for authentication)
- **API Keys** (Google Gemini / OpenRouter / OpenAI, optional Kaggle credentials)

---

### 1. Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
# Windows:
python -m venv venv
venv\Scripts\activate

# Linux/macOS:
# python3 -m venv venv
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn app.main:app --reload --port 8000
```
Backend API will run at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.

---

### 2. Frontend Setup (React + Vite)

```bash
# Navigate to frontend directory
cd frontend

# Install packages
npm install

# Start the development server
npm run dev
```
Frontend application will be accessible at `http://localhost:5173`.

---

### 3. Environment Variables Configuration

#### Backend `.env` (`backend/.env`)
```env
DATABASE_URL=sqlite:///./lifeos.db
JWT_SECRET_KEY=your_secret_jwt_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# LLM & AI API Keys
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENAI_API_KEY=your_openai_api_key

# Supabase Auth Integration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Optional Integrations
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_key
RAPIDAPI_KEY=your_rapidapi_judge0_key
```

#### Frontend `.env` (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### 4. Supabase Authentication & OTP Setup

To enable 6-digit email verification codes for user registration:
1. Open your **Supabase Dashboard** -> **Authentication** -> **Email Templates**.
2. Select **Confirm Signup**.
3. Set the email template:
   - **Subject**: `Verify your Redora AI account: {{ .Token }}`
   - **Body**:
   ```html
   <h2>Welcome to Redora AI!</h2>
   <p>Your 6-digit verification code to complete your registration is:</p>
   <h1 style="font-size: 32px; letter-spacing: 4px; color: #4F46E5;">{{ .Token }}</h1>
   <p>Enter this code on the registration verification screen.</p>
   ```
4. Save the template. Supabase will send verification OTP codes directly to new users.

---

## 📖 API Documentation

Once the backend is running, explore the interactive OpenAPI documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📄 License

This project is licensed under the MIT License.
