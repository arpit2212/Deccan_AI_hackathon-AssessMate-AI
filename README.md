# 🚀 AssessMate AI
### Adaptive Skill Intelligence & Learning Copilot

> **Resume is a claim. Assessment is proof.**
 
A Skill Intelligence Engine that goes beyond resume matching — it measures how deeply candidates actually understand their skills, identifies hidden gaps, and generates personalized learning paths to close them.

## Tech Stack

### Frontend

- **Framework**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Routing**: React Router
- **Auth Client**: Supabase JS (session + token handling)
- **UI Icons**: Lucide React

### Backend

- **Language**: Go (Golang)
- **Framework**: Gin
- **Database Access**: Supabase Postgres (JSONB-heavy schema)
- **Auth Middleware**: JWT token validation for protected routes

### Data / Infra

- **Database**: PostgreSQL (Supabase)
- **Auth Provider**: Supabase Auth (OAuth/session)
- **Storage Strategy**: structured + semi-structured JSON (`analysis_result`, assignment payloads, learning plan payloads)

## Features

- **Journey-Centric Workflow**: create role/company-specific journeys using JD, resume, role name, and company context.
- **Multi-Agent Intelligence Pipeline**: orchestrated AI agents extract, normalize, and fuse signals into skill-level intelligence.
- **Deep Skill Gap Engine**: identifies missing/partial/strong skills, weighted gaps, and critical bottlenecks.
- **Adaptive Assignment Generation**: creates mixed-format assessments (MCQ, debugging, scenario, performance, design) with progressive difficulty.
- **Upskill Reattempt Mode**: targeted reassessment on selected weak skills with preserved attempt history.
- **Live Learning Plan Roadmap**: visual graph + tasks + milestones + analytics mapped to detected skill gaps.
- **Start Learning Workspace**: task tracking, progress persistence, and AI mentor chat in one place.
- **AI YouTube Recommender**: generates skill-mapped course/video suggestions based on journey + plan context.
- **Production-Ready UX**: responsive, animated UI with robust error handling and fallback logic for real-world data variance.

## Architecture Diagram

- Diagram file in repo: `ARCHDIGRAM.drawio.png`
- Direct link: [Architecture Diagram](https://github.com/arpit2212/Deccan_AI_hackathon-AssessMate-AI/blob/main/ARCHDIGRAM.drawio.png)

![AssessMate AI Architecture](https://github.com/arpit2212/Deccan_AI_hackathon-AssessMate-AI/blob/main/ARCHDIGRAM.drawio.png)

## 🧠 Core Idea

AssessMate is built on a **Three-Layer Architecture**:

### 🔹 1. Extraction Layer (AI)
- JD Agent → extracts required skills & depth  
- Resume Agent → estimates actual skill levels  

---

### 🔹 2. Intelligence Layer (Backend Logic)
- Skill matching  
- Gap calculation  
- Fit score computation  
- Weak area detection  

👉 This is the **core brain of the system**

---

### 🔹 3. Validation Layer (Assessment Engine)
- Adaptive question generation  
- Real-world testing (debugging, performance, scenarios)  
- Skill validation through evaluation  

---

## 🔄 How It Works


Resume + JD
↓
AI Extraction
↓
Skill Intelligence (Gap Analysis)
↓
Adaptive Assessment
↓
Skill Validation
↓
Learning Plan

## AI Agent List and What They Do

AssessMate AI uses a specialized agent mesh where each agent contributes domain signals, and the backend intelligence layer composes them into execution-grade guidance.

- **Comprehensive Agent** (`backend/agents/comprehensive_agent.go`)
  - Master orchestrator that synthesizes JD, resume, and company context into a single aligned intelligence payload.
  - Enforces consistent structure so downstream gap analysis and planning remain deterministic.

- **JD Agent** (`backend/agents/jd_agent.go`)
  - Extracts required skills, expected depth, hidden expectations, and practical competency bands.
  - Converts unstructured JD text into a machine-actionable requirement map.

- **Resume Agent** (`backend/agents/resume_agent.go`)
  - Infers current competency levels, evidence-backed experience signals, and confidence score.
  - Builds a capability profile instead of plain keyword matching.

- **Company Agent** (`backend/agents/company_agent.go`)
  - Produces interview focus areas, process tendencies, and role-context pressure points.
  - Injects market and company-specific alignment into preparation strategy.

- **Intelligence Layer** (`backend/services/intelligence.go`)
  - Performs skill matching, weighted gap computation, fit scoring, and critical gap prioritization.
  - Acts as the decision core for assessment generation and learning prioritization.

- **Assignment Agent** (`backend/agents/assignment_agent.go`)
  - Generates adaptive assessments with calibrated difficulty progression (easy -> expert).
  - Emphasizes practical signal extraction via debugging/scenario/performance/system-thinking prompts.

- **Learning Plan Agent** (`backend/agents/learning_plan_agent.go`)
  - Converts skill deficits into phased roadmap nodes, actionable tasks, milestones, and analytics.
  - Produces a practical upskilling sequence optimized for measurable progression.

- **Learning Mentor Chat Agent** (`ChatOnLearningPlan` in `backend/agents/learning_plan_agent.go`)
  - Delivers contextual mentoring from the active plan + user chat history.
  - Provides compact, action-oriented guidance to unblock learning execution.

- **YouTube Recommendation Agent** (`RecommendYouTubeCourses` in `backend/agents/learning_plan_agent.go`)
  - Curates skill-targeted video/course resources aligned to user weaknesses.
  - Uses robust fallback skill derivation to continue recommendation generation even with sparse legacy data.

## Project File Structure

```text
.
├── backend/
│   ├── agents/                  # All AI agent definitions (JD/Resume/Company/Assignment/Plan/Chat)
│   ├── handlers/                # API handlers for journeys, assignments, learning plans, auth
│   ├── services/                # Intelligence computation + Gemini client abstractions
│   ├── middleware/              # Auth/JWT middleware
│   ├── routes/                  # Gin route registration
│   ├── db/                      # Supabase DB client setup
│   ├── models/                  # Shared backend models and payload contracts
│   ├── config/                  # Env/config utilities
│   └── main.go                  # API bootstrap + CORS + router setup
├── frontend/
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── components/          # UI primitives + layout shell
│   │   ├── context/             # Auth/session context
│   │   ├── pages/               # Dashboard, Journeys, Assignment, Upskill, Learning pages
│   │   ├── lib/                 # Utilities and client setup
│   │   ├── types/               # Frontend type contracts
│   │   └── App.tsx              # Route graph
│   └── package.json
├── Database/                    # SQL and database-related scripts
├── ARCHDIGRAM.drawio.png        # High-level architecture visualization
└── README.md
```

## End-to-End Flow (High Level)

1. User creates a journey with resume + JD + role + company.
2. Agent pipeline builds structured skill intelligence and computes gaps.
3. Adaptive assignment is generated and completed by user.
4. Assignment outcomes update user skill reality.
5. Learning plan is generated from updated gaps and rendered as roadmap.
6. Start Learning tracks task completion + mentor chat + YouTube recommendations.

## API Reference
 
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Submit resume + JD for analysis |
| `GET` | `/api/journeys` | List all assessment journeys |
| `GET` | `/api/assignment/:journeyId` | Fetch adaptive assessment |
| `POST` | `/api/assignment/submit` | Submit assessment answers |
| `POST` | `/api/assignment/:journeyId/reattempt` | Reattempt weak-skill sections |
| `GET` | `/api/learning-plan/:journeyId` | Fetch personalized learning plan |
| `POST` | `/api/learning-plan/:journeyId/progress` | Update task completion |
| `POST` | `/api/learning-plan/:journeyId/chat` | Chat with AI mentor |
| `GET` | `/api/learning-plan/:journeyId/youtube-suggestions` | Get resource recommendations |
 
---
 
## Local Setup
 
### Prerequisites
 
- Node.js 18+
- Go 1.20+
- Supabase project
- Gemini API key
### Environment Variables
 
**Backend** — `backend/.env`
 
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
GEMINI_API_KEY=
```
 
**Frontend** — `frontend/.env`
 
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
 
### Running Locally
 
```bash
# Backend
cd backend
go run main.go
 
# Frontend
cd frontend
npm install
npm run dev
```
 
---
## Why This Project Stands Out

- Combines **skill extraction, reasoning, adaptive evaluation, and learning execution** in one continuous loop.
- Supports **real-world messy data** with resilient parsing and fallback strategies.
- Moves beyond "analysis dashboards" into **actionable interview readiness operations**.

---
