# AssessMate - Project Status & Technical Documentation

This document provides a comprehensive overview of the current state of the AssessMate project, its architecture, database schema, and recent technical implementations.

## 🚀 Project Overview
AssessMate is an AI-powered platform designed to bridge the gap between job descriptions and a candidate's current skills. It uses a multi-agent AI workflow to analyze resumes against JDs, generate dynamic assessments, and provide personalized learning paths.

## 🏗️ 5-Agent Workflow Architecture
The system follows a sequential intelligence pipeline:
1.  **JD Analysis Agent**: Extracts core requirements, tech stack, and soft skills from a Job Description.
2.  **Company Context Agent**: Researches the company/industry to provide tailored interview expectations.
3.  **Intelligence Layer**: Compares the Resume against the JD to identify skill gaps and calculate a "Fit Score".
4.  **Dynamic Assessment Agent**: Generates 20 unique technical questions based specifically on the user's identified skill gaps.
5.  **Learning Plan Agent**: Creates a structured, time-bound roadmap (visualized via ReactFlow) to bridge the identified gaps.

## 🗄️ Database Schema (Supabase/PostgreSQL)
The database is designed for multi-user scalability with strict Row-Level Security (RLS).

### Core Tables:
- **`profiles`**: Synced with Supabase Auth (Google Auth). Stores user metadata (`full_name`, `avatar_url`, `email`).
- **`journeys`**: The central entity for an analysis session. Stores JD/Resume text, AI analysis, and company context.
- **`assignments`**: Stores the 20 dynamic questions and the user's performance score.
- **`learning_plans`**: Stores the ReactFlow-compatible roadmap data.
- **`user_skills`**: Tracks skill mastery levels (1-10) for each user across different journeys.

### Key DB Features:
- **Auto-Sync Trigger**: `handle_new_user()` function automatically creates a profile when a user signs in via Google for the first time.
- **Scalable RLS**: Granular policies for `INSERT`, `SELECT`, `UPDATE`, and `DELETE` ensure users only access their own data.
- **Cascading Deletes**: `ON DELETE CASCADE` ensures data integrity when a user or journey is deleted.
- **Performance Indexes**: B-tree indexes on `user_id`, `journey_id`, and `email` for fast lookups.

## ⚙️ Backend Implementation (Go/Gin)
The backend is a high-performance Go service built with the Gin framework.

### Key Components:
- **Middleware**: `AuthMiddleware` extracts and validates Supabase JWTs, injecting `userId` into the request context.
- **Supabase Integration**: Uses the `supabase-go` community client with **Service Role Key** support to bypass RLS safely for backend operations.
- **AI Services**: Integrates with Google's Gemini-1.5-Flash for analysis and content generation.

### API Endpoints:
- `GET /api/me`: Fetches the current user's profile from the `profiles` table.
- `POST /api/analyze`: Triggers the 3-agent analysis pipeline and saves the `journey`.
- `GET /api/assignment/:journeyId`: Fetches or generates a 20-question dynamic assessment.
- `POST /api/assignment/submit`: Processes assessment results and updates `user_skills`.
- `GET /api/learning-plan/:journeyId`: Fetches or generates a ReactFlow-based learning roadmap.

## 💻 Frontend Implementation (React/Vite)
A modern, responsive UI built with TypeScript and Tailwind CSS.

### Key Features:
- **Auth System**: `AuthContext` manages Supabase sessions and Google Auth flow.
- **State Management**: Uses custom hooks (`useAuth`) and React state for managing analysis workflows.
- **UI Components**: Built with Framer Motion for smooth transitions and custom UI components (Button, Card, Spinner).

## 🛠️ Recent Critical Fixes
- **UUID Empty String Error**: Fixed `22P02` errors by adding `omitempty` to Go struct ID fields, allowing Supabase to auto-generate UUIDs.
- **RLS Policy Violation**: Resolved `42501` errors by implementing explicit `WITH CHECK` clauses in SQL and switching the backend to use the `Service Role Key`.
- **JSON Unmarshaling Fix**: Fixed 500 errors in the backend by adding `.Single()` to Supabase insert operations, ensuring the API returns a single object instead of an array.
- **Import Alias Fix**: Resolved a compilation error in `analyze.go` caused by a stray character in the import block.

## 📋 Current Standing & Next Steps
- [x] Full Google Auth integration with auto-profile creation.
- [x] Scalable database schema with robust RLS.
- [x] 3/5 AI Agents implemented and saving to DB.
- [ ] Implement full frontend visualization for the Learning Plan (ReactFlow).
- [ ] Implement UI for the Dynamic Assessment (20-question quiz).
- [ ] Add dashboard analytics to track skill growth over time.
