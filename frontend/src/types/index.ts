export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export interface AuthState {
  user: User | null
  session: any | null
  loading: boolean
}

export interface SkillAnalysis {
  skill: string
  required_level: number
  current_level: number
  gap: number
  status: 'missing' | 'partial' | 'strong'
  weak_areas: string[]
}

export interface AnalysisResult {
  fit_score: number
  skill_analysis: SkillAnalysis[]
  critical_gaps: string[]
  overestimated_skills: string[]
  test_strategy: string[]
  learning_strategy: string[]
}

export interface CompanyContext {
  company_context: string
  interview_process: string[]
  role_expectations: string[]
  recommended_focus: string[]
}

export interface AssessmentQuestion {
  question_text: string
  type: string
  difficulty: string
  options?: string[]
  correct_answer: string
  explanation: string
  skill_name: string
}

export interface AssessmentOutput {
  questions: AssessmentQuestion[]
}

export interface AnalyzeResponse {
  journey_id: string
  analysis: AnalysisResult
  company: CompanyContext
  message: string
}
