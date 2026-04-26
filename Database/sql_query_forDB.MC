-- ============================================================
-- ASSESSMATE: REALITY-BASED SKILL ASSESSMENT & PERSONALIZED LEARNING PLATFORM
-- PostgreSQL Schema for Supabase
-- ============================================================
-- Run this entire file in Supabase SQL Editor (once, top to bottom)
-- Supabase handles auth.users — we reference it, not recreate it
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy skill name search


-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE skill_source         AS ENUM ('resume', 'assessment', 'manual', 'learning_plan');
CREATE TYPE question_type        AS ENUM ('mcq', 'coding', 'debugging', 'short_answer', 'scenario');
CREATE TYPE difficulty_level     AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE journey_status       AS ENUM ('active', 'paused', 'completed', 'archived');
CREATE TYPE assessment_status    AS ENUM ('pending', 'in_progress', 'completed', 'abandoned');
CREATE TYPE task_status          AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');
CREATE TYPE milestone_status     AS ENUM ('locked', 'unlocked', 'in_progress', 'completed');
CREATE TYPE plan_status          AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE resume_parse_status  AS ENUM ('pending', 'processing', 'completed', 'failed');


-- ============================================================
-- 2. USER PROFILES
-- Extends Supabase auth.users with platform-specific data
-- ============================================================

CREATE TABLE user_profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT,
    avatar_url      TEXT,
    email           TEXT,                          -- denormalized for easy queries
    timezone        TEXT DEFAULT 'UTC',
    onboarded       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup (Supabase trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$ 
BEGIN 
    -- Use COALESCE to provide defaults if metadata is missing 
    INSERT INTO public.user_profiles (id, full_name, avatar_url, email) 
    VALUES ( 
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- fallback to email if name is missing 
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),      -- empty string if no avatar 
        NEW.email 
    ) 
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name, 
        avatar_url = EXCLUDED.avatar_url, 
        email = EXCLUDED.email, 
        updated_at = NOW(); 
    
    RETURN NEW; 
EXCEPTION WHEN OTHERS THEN 
    -- Log the error (visible in Supabase logs) but don't crash the signup 
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM; 
    RETURN NEW; 
END; 
$$; 

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 3. RESUMES
-- A user can upload multiple resumes over time
-- ============================================================

CREATE TABLE resumes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url        TEXT,                              -- Supabase Storage URL
    file_name       TEXT,
    raw_text        TEXT,                              -- extracted plain text
    parsed_data     JSONB,                             -- structured parsed output
    parse_status    resume_parse_status DEFAULT 'pending',
    is_active       BOOLEAN DEFAULT TRUE,              -- currently "default" resume
    uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
    parsed_at       TIMESTAMPTZ
);

-- JSONB structure for parsed_data:
-- {
--   "skills": [{"name": "Python", "years": 2}],
--   "experience": [...],
--   "education": [...],
--   "certifications": [...]
-- }


-- ============================================================
-- 4. JOB DESCRIPTIONS
-- Reusable JDs that can be attached to multiple journeys
-- ============================================================

CREATE TABLE job_descriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    company         TEXT,
    raw_text        TEXT NOT NULL,
    parsed_data     JSONB,       -- extracted required skills, responsibilities, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- JSONB structure for parsed_data:
-- {
--   "required_skills": ["Python", "FastAPI", "PostgreSQL"],
--   "preferred_skills": ["Docker", "Redis"],
--   "experience_years": 3,
--   "seniority": "mid",
--   "responsibilities": [...]
-- }


-- ============================================================
-- 5. PREPARATION JOURNEYS
-- Core session container — like a "chat thread" for a job goal
-- Each journey = one user pursuing one JD (optionally with a resume)
-- ============================================================

CREATE TABLE journeys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    jd_id           UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE RESTRICT,
    resume_id       UUID REFERENCES resumes(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,                     -- user-defined name e.g. "Google SWE Jan 2025"
    status          journey_status DEFAULT 'active',
    target_date     DATE,                              -- when user wants to be ready
    ai_summary      TEXT,                              -- AI-generated journey briefing
    metadata        JSONB DEFAULT '{}',                -- extensible extra config
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 6. ASSESSMATE DNA (HIERARCHICAL SKILL GRAPH)
-- Global taxonomy of skills — NOT per user
-- Design choice: Relational (not JSONB) because:
--   • We query by parent/child frequently
--   • We need FK integrity for user_skills references
--   • JSONB would make tree traversal expensive
-- ============================================================

CREATE TABLE skill_taxonomy (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,              -- e.g. "python-async"
    parent_id       UUID REFERENCES skill_taxonomy(id) ON DELETE SET NULL,
    category        TEXT,                              -- e.g. "backend", "frontend", "data"
    description     TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Self-referencing tree: parent_id NULL = root skill (e.g. "Python")
-- Children = sub-skills (e.g. "Python > Async", "Python > OOP")


-- ============================================================
-- 7. GLOBAL USER SKILLS (ASSESSMATE DNA per User)
-- THE most important table — the persistent intelligence layer
-- Updated from: resume uploads, assessment completions, learning plan tasks
-- ============================================================

CREATE TABLE user_skills (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skill_taxonomy(id) ON DELETE CASCADE,

    -- Denormalized for fast reads (avoids join on every skill card render)
    skill_name          TEXT NOT NULL,
    sub_skill           TEXT,                          -- leaf-level label

    level               SMALLINT NOT NULL DEFAULT 1    -- 1–10 mastery level
                            CHECK (level BETWEEN 1 AND 10),
    confidence_score    NUMERIC(5,2) DEFAULT 0.0       -- 0.00–100.00
                            CHECK (confidence_score BETWEEN 0 AND 100),

    last_source         skill_source,                  -- what most recently updated this
    last_assessed_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (user_id, skill_id)                         -- one row per user per skill
);


-- ============================================================
-- 8. SKILL UPDATE LOGS
-- Immutable audit trail of every skill change
-- Enables: skill trend graphs, before/after comparisons
-- ============================================================

CREATE TABLE skill_update_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_skill_id       UUID NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skill_taxonomy(id),

    previous_level      SMALLINT CHECK (previous_level BETWEEN 1 AND 10),
    new_level           SMALLINT NOT NULL CHECK (new_level BETWEEN 1 AND 10),
    previous_confidence NUMERIC(5,2),
    new_confidence      NUMERIC(5,2) NOT NULL,

    source              skill_source NOT NULL,
    source_ref_id       UUID,                          -- FK to resume_id / assessment_id / task_id
    source_ref_type     TEXT,                          -- 'resume' | 'assessment' | 'task'
    delta               SMALLINT GENERATED ALWAYS AS (new_level - COALESCE(previous_level, 0)) STORED,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 9. ASSESSMENTS
-- Each journey can have many assessments
-- Adaptive: difficulty adjusts based on performance
-- ============================================================

CREATE TABLE assessments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id          UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    title               TEXT NOT NULL,
    status              assessment_status DEFAULT 'pending',
    difficulty          difficulty_level DEFAULT 'intermediate',
    focus_skills        UUID[],                        -- skill_taxonomy IDs this assessment targets
    adaptive            BOOLEAN DEFAULT TRUE,

    total_questions     SMALLINT DEFAULT 0,
    answered_questions  SMALLINT DEFAULT 0,
    total_score         NUMERIC(6,2),                  -- out of 100
    time_limit_secs     INTEGER,                       -- NULL = unlimited
    time_taken_secs     INTEGER,

    ai_config           JSONB DEFAULT '{}',            -- AI generation params used
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 10. QUESTIONS
-- Question bank — questions belong to an assessment
-- Design choice: correct_answer as JSONB for flexibility:
--   MCQ   → {"option": "B"}
--   Coding → {"expected_output": "...", "test_cases": [...]}
--   Debug  → {"fixed_code": "...", "explanation": "..."}
-- ============================================================

CREATE TABLE questions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id       UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    skill_id            UUID REFERENCES skill_taxonomy(id) ON DELETE SET NULL,

    question_type       question_type NOT NULL,
    difficulty          difficulty_level NOT NULL DEFAULT 'intermediate',
    question_text       TEXT NOT NULL,
    options             JSONB,                         -- for MCQ: [{"key":"A","text":"..."}]
    correct_answer      JSONB NOT NULL,
    explanation         TEXT,                          -- shown post-submission
    points              SMALLINT DEFAULT 10,
    order_index         SMALLINT DEFAULT 0,            -- display order in assessment
    metadata            JSONB DEFAULT '{}',            -- tags, hints, etc.
    created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 11. USER RESPONSES
-- One row per question per attempt
-- ============================================================

CREATE TABLE user_responses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id       UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    response            JSONB NOT NULL,                -- mirrors correct_answer structure
    is_correct          BOOLEAN,
    partial_score       NUMERIC(5,2) DEFAULT 0,        -- for partial credit (coding tasks)
    time_taken_secs     INTEGER,
    attempt_number      SMALLINT DEFAULT 1,
    ai_feedback         TEXT,                          -- AI-generated feedback on response
    created_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (question_id, user_id, attempt_number)
);


-- ============================================================
-- 12. SKILL EVALUATION RESULTS
-- Generated after assessment completion
-- Per-skill breakdown: how did the user perform on each skill?
-- ============================================================

CREATE TABLE skill_evaluations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id       UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skill_taxonomy(id) ON DELETE CASCADE,

    skill_name          TEXT NOT NULL,                 -- denormalized
    sub_skill           TEXT,

    score               NUMERIC(5,2) NOT NULL          -- 0–100
                            CHECK (score BETWEEN 0 AND 100),
    level_assessed      SMALLINT NOT NULL              -- inferred level from score
                            CHECK (level_assessed BETWEEN 1 AND 10),
    gap_score           NUMERIC(5,2),                  -- JD required level minus assessed level
    questions_attempted SMALLINT DEFAULT 0,
    questions_correct   SMALLINT DEFAULT 0,

    recommendation      TEXT,                          -- AI-generated improvement tip
    created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 13. LEARNING PLANS
-- One plan per journey (can be regenerated)
-- ============================================================

CREATE TABLE learning_plans (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id          UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    title               TEXT NOT NULL,
    status              plan_status DEFAULT 'draft',
    estimated_hours     NUMERIC(6,2),
    target_completion   DATE,
    ai_rationale        TEXT,                          -- why this plan was generated
    version             SMALLINT DEFAULT 1,            -- bump on regeneration
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 14. MILESTONES
-- Ordered checkpoints inside a learning plan
-- ============================================================

CREATE TABLE milestones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id             UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id            UUID REFERENCES skill_taxonomy(id) ON DELETE SET NULL,

    title               TEXT NOT NULL,
    description         TEXT,
    status              milestone_status DEFAULT 'locked',
    order_index         SMALLINT NOT NULL DEFAULT 0,
    estimated_hours     NUMERIC(5,2),
    target_level        SMALLINT CHECK (target_level BETWEEN 1 AND 10),  -- skill level goal
    unlocks_after       UUID REFERENCES milestones(id) ON DELETE SET NULL, -- dependency chain
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 15. LEARNING TASKS
-- Atomic units of work inside a milestone
-- ============================================================

CREATE TABLE learning_tasks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_id        UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    title               TEXT NOT NULL,
    description         TEXT,
    task_type           TEXT,                          -- 'watch', 'read', 'practice', 'build', 'quiz'
    resource_url        TEXT,
    estimated_mins      INTEGER,
    status              task_status DEFAULT 'not_started',
    order_index         SMALLINT NOT NULL DEFAULT 0,
    completed_at        TIMESTAMPTZ,
    notes               TEXT,                          -- user notes on completion
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 16. JOURNEY SKILL SNAPSHOTS
-- Point-in-time global skill state captured when an assessment completes
-- Used for "before vs after this journey" comparisons
-- ============================================================

CREATE TABLE journey_skill_snapshots (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id          UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_type       TEXT NOT NULL,                 -- 'start' | 'post_assessment' | 'end'
    skills_snapshot     JSONB NOT NULL,                -- full copy of user_skills at that moment
    created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 17. INDEXES
-- ============================================================

-- user_profiles
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- resumes
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_is_active ON resumes(user_id, is_active);

-- job_descriptions
CREATE INDEX idx_jd_user_id ON job_descriptions(user_id);

-- journeys
CREATE INDEX idx_journeys_user_id ON journeys(user_id);
CREATE INDEX idx_journeys_jd_id ON journeys(jd_id);
CREATE INDEX idx_journeys_status ON journeys(user_id, status);

-- skill_taxonomy
CREATE INDEX idx_skill_taxonomy_parent ON skill_taxonomy(parent_id);
CREATE INDEX idx_skill_taxonomy_slug ON skill_taxonomy(slug);
CREATE INDEX idx_skill_taxonomy_name_trgm ON skill_taxonomy USING gin(name gin_trgm_ops);

-- user_skills (hot path — queried constantly)
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_level ON user_skills(user_id, level DESC);
CREATE INDEX idx_user_skills_updated ON user_skills(user_id, updated_at DESC);

-- skill_update_logs
CREATE INDEX idx_skill_logs_user_id ON skill_update_logs(user_id);
CREATE INDEX idx_skill_logs_user_skill ON skill_update_logs(user_skill_id);
CREATE INDEX idx_skill_logs_created ON skill_update_logs(user_id, created_at DESC);
CREATE INDEX idx_skill_logs_source ON skill_update_logs(source);

-- assessments
CREATE INDEX idx_assessments_journey_id ON assessments(journey_id);
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_status ON assessments(user_id, status);

-- questions
CREATE INDEX idx_questions_assessment_id ON questions(assessment_id);
CREATE INDEX idx_questions_skill_id ON questions(skill_id);

-- user_responses
CREATE INDEX idx_responses_assessment_id ON user_responses(assessment_id);
CREATE INDEX idx_responses_user_id ON user_responses(user_id);
CREATE INDEX idx_responses_question_id ON user_responses(question_id);

-- skill_evaluations
CREATE INDEX idx_skill_eval_assessment ON skill_evaluations(assessment_id);
CREATE INDEX idx_skill_eval_user ON skill_evaluations(user_id);
CREATE INDEX idx_skill_eval_skill ON skill_evaluations(user_id, skill_id);

-- learning_plans
CREATE INDEX idx_plans_journey_id ON learning_plans(journey_id);
CREATE INDEX idx_plans_user_id ON learning_plans(user_id);

-- milestones
CREATE INDEX idx_milestones_plan_id ON milestones(plan_id);
CREATE INDEX idx_milestones_status ON milestones(plan_id, status);

-- learning_tasks
CREATE INDEX idx_tasks_milestone_id ON learning_tasks(milestone_id);
CREATE INDEX idx_tasks_status ON learning_tasks(milestone_id, status);

-- journey_skill_snapshots
CREATE INDEX idx_snapshots_journey ON journey_skill_snapshots(journey_id);
CREATE INDEX idx_snapshots_user ON journey_skill_snapshots(user_id);


-- ============================================================
-- 18. UPDATED_AT AUTO-UPDATE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_profiles_updated_at    BEFORE UPDATE ON user_profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_journeys_updated_at         BEFORE UPDATE ON journeys         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_learning_plans_updated_at   BEFORE UPDATE ON learning_plans   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_milestones_updated_at       BEFORE UPDATE ON milestones       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_learning_tasks_updated_at   BEFORE UPDATE ON learning_tasks   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_user_skills_updated_at      BEFORE UPDATE ON user_skills      FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 19. ROW LEVEL SECURITY (RLS)
-- Every table is locked to auth.uid()
-- ============================================================

ALTER TABLE user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys               ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_evaluations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills            ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_update_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_skill_snapshots ENABLE ROW LEVEL SECURITY;

-- skill_taxonomy is a shared global table — readable by all authenticated users
ALTER TABLE skill_taxonomy         ENABLE ROW LEVEL SECURITY;

-- ---- user_profiles ----
CREATE POLICY "Users manage own profile"
    ON user_profiles FOR ALL
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---- resumes ----
CREATE POLICY "Users manage own resumes"
    ON resumes FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- job_descriptions ----
CREATE POLICY "Users manage own JDs"
    ON job_descriptions FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- journeys ----
CREATE POLICY "Users manage own journeys"
    ON journeys FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- assessments ----
CREATE POLICY "Users manage own assessments"
    ON assessments FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- questions (scoped via assessment ownership) ----
CREATE POLICY "Users access questions in their assessments"
    ON questions FOR ALL
    USING (
        assessment_id IN (
            SELECT id FROM assessments WHERE user_id = auth.uid()
        )
    );

-- ---- user_responses ----
CREATE POLICY "Users manage own responses"
    ON user_responses FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- skill_evaluations ----
CREATE POLICY "Users view own evaluations"
    ON skill_evaluations FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- user_skills ----
CREATE POLICY "Users manage own skill DNA"
    ON user_skills FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- skill_update_logs ----
CREATE POLICY "Users view own skill history"
    ON skill_update_logs FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- learning_plans ----
CREATE POLICY "Users manage own learning plans"
    ON learning_plans FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- milestones ----
CREATE POLICY "Users manage own milestones"
    ON milestones FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- learning_tasks ----
CREATE POLICY "Users manage own tasks"
    ON learning_tasks FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- journey_skill_snapshots ----
CREATE POLICY "Users view own snapshots"
    ON journey_skill_snapshots FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- skill_taxonomy (read-only for all authenticated users) ----
CREATE POLICY "Authenticated users read skill taxonomy"
    ON skill_taxonomy FOR SELECT
    USING (auth.role() = 'authenticated');


-- ============================================================
-- 20. HELPER FUNCTIONS
-- ============================================================

-- Called after assessment: upserts user_skills and writes to skill_update_logs
CREATE OR REPLACE FUNCTION upsert_user_skill(
    p_user_id         UUID,
    p_skill_id        UUID,
    p_skill_name      TEXT,
    p_sub_skill       TEXT,
    p_new_level       SMALLINT,
    p_new_confidence  NUMERIC,
    p_source          skill_source,
    p_source_ref_id   UUID DEFAULT NULL,
    p_source_ref_type TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_existing        user_skills%ROWTYPE;
    v_skill_row_id    UUID;
BEGIN
    -- Get existing record if any
    SELECT * INTO v_existing
    FROM user_skills
    WHERE user_id = p_user_id AND skill_id = p_skill_id;

    IF NOT FOUND THEN
        -- Insert new skill
        INSERT INTO user_skills (
            user_id, skill_id, skill_name, sub_skill,
            level, confidence_score, last_source, last_assessed_at
        )
        VALUES (
            p_user_id, p_skill_id, p_skill_name, p_sub_skill,
            p_new_level, p_new_confidence, p_source,
            CASE WHEN p_source = 'assessment' THEN NOW() ELSE NULL END
        )
        RETURNING id INTO v_skill_row_id;

        -- Log the creation
        INSERT INTO skill_update_logs (
            user_id, user_skill_id, skill_id,
            previous_level, new_level,
            previous_confidence, new_confidence,
            source, source_ref_id, source_ref_type
        )
        VALUES (
            p_user_id, v_skill_row_id, p_skill_id,
            NULL, p_new_level,
            NULL, p_new_confidence,
            p_source, p_source_ref_id, p_source_ref_type
        );
    ELSE
        -- Only update if new data is more confident or higher level
        UPDATE user_skills SET
            level            = p_new_level,
            confidence_score = p_new_confidence,
            last_source      = p_source,
            last_assessed_at = CASE WHEN p_source = 'assessment' THEN NOW() ELSE last_assessed_at END,
            updated_at       = NOW()
        WHERE id = v_existing.id;

        -- Log only if something actually changed
        IF v_existing.level <> p_new_level OR v_existing.confidence_score <> p_new_confidence THEN
            INSERT INTO skill_update_logs (
                user_id, user_skill_id, skill_id,
                previous_level, new_level,
                previous_confidence, new_confidence,
                source, source_ref_id, source_ref_type
            )
            VALUES (
                p_user_id, v_existing.id, p_skill_id,
                v_existing.level, p_new_level,
                v_existing.confidence_score, p_new_confidence,
                p_source, p_source_ref_id, p_source_ref_type
            );
        END IF;
    END IF;
END;
$$;


-- ============================================================
-- 21. SEED: SKILL TAXONOMY (starter data)
-- ============================================================

INSERT INTO skill_taxonomy (id, name, slug, parent_id, category) VALUES
-- Root skills
('00000000-0000-0000-0001-000000000001', 'Python',            'python',            NULL, 'backend'),
('00000000-0000-0000-0001-000000000002', 'JavaScript',        'javascript',        NULL, 'frontend'),
('00000000-0000-0000-0001-000000000003', 'SQL',               'sql',               NULL, 'data'),
('00000000-0000-0000-0001-000000000004', 'System Design',     'system-design',     NULL, 'architecture'),
('00000000-0000-0000-0001-000000000005', 'Data Structures',   'data-structures',   NULL, 'cs-fundamentals'),
('00000000-0000-0000-0001-000000000006', 'Machine Learning',  'machine-learning',  NULL, 'ai'),
-- Python sub-skills
('00000000-0000-0000-0002-000000000001', 'Python OOP',        'python-oop',        '00000000-0000-0000-0001-000000000001', 'backend'),
('00000000-0000-0000-0002-000000000002', 'Python Async',      'python-async',      '00000000-0000-0000-0001-000000000001', 'backend'),
('00000000-0000-0000-0002-000000000003', 'FastAPI',           'fastapi',           '00000000-0000-0000-0001-000000000001', 'backend'),
-- JavaScript sub-skills
('00000000-0000-0000-0002-000000000004', 'React',             'react',             '00000000-0000-0000-0001-000000000002', 'frontend'),
('00000000-0000-0000-0002-000000000005', 'TypeScript',        'typescript',        '00000000-0000-0000-0001-000000000002', 'frontend'),
-- SQL sub-skills
('00000000-0000-0000-0002-000000000006', 'Query Optimization','sql-query-opt',     '00000000-0000-0000-0001-000000000003', 'data'),
('00000000-0000-0000-0002-000000000007', 'PostgreSQL',        'postgresql',        '00000000-0000-0000-0001-000000000003', 'data'),
-- System Design sub-skills
('00000000-0000-0000-0002-000000000008', 'Scalability',       'scalability',       '00000000-0000-0000-0001-000000000004', 'architecture'),
('00000000-0000-0000-0002-000000000009', 'Microservices',     'microservices',     '00000000-0000-0000-0001-000000000004', 'architecture'),
-- Data Structures sub-skills
('00000000-0000-0000-0002-000000000010', 'Arrays & Strings',  'arrays-strings',    '00000000-0000-0000-0001-000000000005', 'cs-fundamentals'),
('00000000-0000-0000-0002-000000000011', 'Graphs & Trees',    'graphs-trees',      '00000000-0000-0000-0001-000000000005', 'cs-fundamentals'),
('00000000-0000-0000-0002-000000000012', 'Dynamic Programming','dynamic-programming','00000000-0000-0000-0001-000000000005', 'cs-fundamentals')
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- SCHEMA COMPLETE
-- ============================================================
-- Tables:  16
-- Indexes: 25+
-- RLS:     All user-facing tables protected
-- Enums:   8 typed enumerations
-- Triggers: auto updated_at + auto profile creation
-- Functions: upsert_user_skill (core intelligence updater)
-- ============================================================