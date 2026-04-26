-- Create journeys table
CREATE TABLE IF NOT EXISTS journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_name TEXT NOT NULL,
    company_name TEXT,
    jd_text TEXT NOT NULL,
    resume_text TEXT NOT NULL,
    analysis_result JSONB,
    company_context JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    questions JSONB NOT NULL,
    score INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_name TEXT NOT NULL,
    mastery_level INTEGER NOT NULL CHECK (mastery_level >= 0 AND mastery_level <= 10),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, skill_name)
);

-- Create learning_plans table
CREATE TABLE IF NOT EXISTS learning_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    plan_data JSONB NOT NULL,
    time_constraint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;

-- Create policies (Simplified for now, assuming user_id matches)
CREATE POLICY "Users can manage their own journeys" ON journeys
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own assignments" ON assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM journeys 
            WHERE journeys.id = assignments.journey_id 
            AND journeys.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own skills" ON user_skills
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning plans" ON learning_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM journeys 
            WHERE journeys.id = learning_plans.journey_id 
            AND journeys.user_id = auth.uid()
        )
    );
