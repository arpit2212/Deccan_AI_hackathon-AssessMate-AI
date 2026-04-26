# AssessMate

AssessMate is a **Reality-Based Skill Assessment & Personalized Learning Platform** designed to bridge the gap between your current skills and the requirements of your dream job. It analyzes your resume, compares it with target job descriptions, and generates a personalized learning journey with adaptive assessments.

## 🚀 Features

- **Google OAuth Integration**: Secure and seamless authentication via Supabase.
- **AssessMate DNA**: A hierarchical skill graph that tracks your mastery levels across different domains.
- **Personalized Journeys**: Create preparation paths tailored to specific job descriptions.
- **Adaptive Assessments**: Test your knowledge with questions that adjust difficulty based on your performance.
- **Modern UI/UX**: Built with React, Tailwind CSS v4, and Framer Motion for a premium, responsive experience.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Components**: [Radix UI](https://www.radix-ui.com/)
- **Auth**: [Supabase Auth](https://supabase.com/auth)

### Backend
- **Language**: [Go (Golang)](https://golang.org/)
- **Framework**: [Gin Gonic](https://gin-gonic.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via Supabase)

## ⚙️ Project Structure

```text
.
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/    # Reusable UI & Layout components
│   │   ├── context/       # Auth & Global state
│   │   ├── pages/         # Application pages
│   │   └── lib/           # Supabase & Utility functions
├── backend/                # Go (Golang) Gin API
│   ├── handlers/          # Request handlers
│   ├── middleware/        # JWT & Auth middleware
│   ├── routes/            # API Route definitions
│   └── config/            # Environment configuration
└── Database/               # SQL schema and DB scripts
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Go (v1.20+)
- Supabase Account

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd AssessMate
   ```

2. **Frontend Configuration**
   - Navigate to `/frontend`
   - Copy `.env.example` to `.env`
   - Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

3. **Backend Configuration**
   - Navigate to `/backend`
   - Copy `.env.example` to `.env`
   - Fill in your `SUPABASE_JWT_SECRET` (found in Supabase Project Settings -> API).

4. **Database Setup**
   - Run the SQL script found in `Database/sql_query_forDB.MC` in your Supabase SQL Editor.

### Running the App

**Start Backend:**
```bash
cd backend
go run main.go
```

**Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📄 License
This project is licensed under the MIT License.
