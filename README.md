# Redora AI — Personal AI Executive Assistant & Productivity Operating System

Redora AI is an all-in-one personal AI executive assistant and productivity platform designed to manage daily workflows, automate task execution, track long-term goals, monitor habits, store intelligent memories, and provide developer tools.

---

## Project Overview & How It Works

Redora AI combines a multi-agent AI architecture with dedicated productivity modules and utility tools. When a user interacts with Redora AI, requests are routed through an intelligent orchestrator agent to specialized sub-agents (Productivity Agent, Study Agent, Career Agent, Coding Agent, Memory Agent). The system automatically converts conversational intents into actionable goals, task schedules, habit tracking logs, and analytical insights.

The platform provides a responsive user interface with light and dark theme adaptation, real-time activity logging, and secure local authentication.

---

## Core Features & Modules Built

### 1. Multi-Agent AI Executive Assistant
- Interactive AI chat interface connected to specialized agents.
- Automated creation of goals and structured tasks directly from natural language conversations.
- Intelligent memory storage that retains context across chat sessions.

### 2. Primary Productivity Modules
- **Dashboard**: Centralized executive digest displaying live state of your life, workload completion rates, habit streaks, upcoming tasks, active goals, and recent agent actions.
- **Tasks Management**: Interactive task board supporting priority filtering (Today, This Week, All) and completion tracking.
- **Goals Tracking**: Long-term objective management with roadmap milestones.
- **Habits Analytics**: Daily habit tracker with automated streak counters.
- **Memory Store**: Searchable knowledge memory base managed by AI agents.
- **Full Activity Log**: Real-time audit log tracking all automated actions performed by AI agents.

---

## Integrated Tools Suite

### 1. PDF Toolkit
- Upload, inspect, analyze, and extract insights or text from PDF documents.

### 2. GPA Calculator
- Grade point average calculator for academic planning and course record keeping.

### 3. Multi-Language Code Sandbox
- Cloud-isolated code execution container supporting **Python**, **C**, **C++**, and **Java**.
- Instant compilation, execution error tracebacks, stdin support, and live stdout output.

### 4. Resume ATS Checker
- Comprehensive resume evaluation tool for Applicant Tracking Systems.
- Analyzes word count, section layout, rule-based formatting, job description keyword matching, and AI recommendations.

### 5. Kaggle Hub
- Direct integration with Kaggle API for exploring public machine learning datasets and competitive data science challenges.
- Search datasets and competitions by topic, view download counts, upvote statistics, size, and creator details.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router.
- **Backend**: FastAPI, Python 3.13, SQLite, SQLAlchemy ORM, Alembic migrations.
- **AI & Execution Engines**: Judge0 Online Code Engine, Open API integrations, Supabase Auth.
- **Security**: JWT Authentication, CORS protection, local environment secret masking (`.env`).

---

## How to Setup & Run Locally

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables (.env)
Create a `.env` file inside the `backend` directory (do not commit this file to Git):
```env
DATABASE_URL=sqlite:///./lifeos.db
JWT_SECRET_KEY=your_secret_jwt_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_api_key
OPENAI_API_KEY=your_openai_api_key
```
