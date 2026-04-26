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

export interface SkillMatch {
  name: string
  required_level: number
  estimated_level: number
  gap: number
  importance: string
  evidence: string
  depth: Record<string, string>
}

export interface FinalAnalysis {
  skill_analysis: SkillMatch[]
  critical_gaps: string[]
  fit_score: number
  comprehensive?: any
}

export interface CompanyContext {
  difficulty: string
  interview_focus: string[]
  role_expectations: string[]
  role_analysis: string
  company_context: string
  interview_process: string[]
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
  analysis: FinalAnalysis
  company: CompanyContext
  message: string
}
