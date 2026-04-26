import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, Briefcase, Building2, Calendar, FileText, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Loader2, Compass } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import type { AnalyzeResponse, SkillMatch } from '../types'

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api`

export const NewJourneyPage: React.FC = () => {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    roleName: '',
    companyName: '',
    prepTime: '30 days',
    jdText: '',
    resumeText: ''
  })
  const [result, setResult] = useState<AnalyzeResponse | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNext = () => setStep(prev => prev + 1)
  const handleBack = () => setStep(prev => prev - 1)

  const handleSubmit = async () => {
    if (!formData.jdText || !formData.resumeText || !formData.roleName || !formData.companyName) {
      toast.error('Please fill in all fields')
      return
    }

    if (!session?.access_token) {
      toast.error('Session not found. Please log in again.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          jd_text: formData.jdText,
          resume_text: formData.resumeText,
          company_name: formData.companyName,
          role_name: formData.roleName
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      setResult(data)
      setStep(3)
      toast.success('Analysis complete!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to analyze. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Create New Journey</h1>
        <p className="text-text-secondary">Let's map out your path to success at {formData.companyName || 'your dream company'}.</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-300 ${
                step >= s ? 'bg-primary border-primary text-white' : 'bg-white border-gray-100 text-gray-400'
              }`}
            >
              {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Role Name
                  </label>
                  <input
                    type="text"
                    name="roleName"
                    value={formData.roleName}
                    onChange={handleInputChange}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="e.g. Google"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Preparation Time
                  </label>
                  <input
                    type="text"
                    name="prepTime"
                    value={formData.prepTime}
                    onChange={handleInputChange}
                    placeholder="e.g. 15 days"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleNext} className="gap-2" disabled={!formData.roleName || !formData.companyName}>
                  Next Step <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8">
              <div className="space-y-6 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Job Description
                  </label>
                  <textarea
                    name="jdText"
                    value={formData.jdText}
                    onChange={handleInputChange}
                    rows={6}
                    placeholder="Paste the full job description here..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" /> Your Resume
                  </label>
                  <textarea
                    name="resumeText"
                    value={formData.resumeText}
                    onChange={handleInputChange}
                    rows={6}
                    placeholder="Paste your resume text here..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleSubmit} className="gap-2" disabled={loading || !formData.jdText || !formData.resumeText}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <>Start Analysis <Rocket className="h-4 w-4" /></>}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && result && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">Analysis Complete!</h2>
              <p className="text-text-secondary">
                We've analyzed your profile against the job requirements.
              </p>
              <div className="mt-4 p-4 bg-white rounded-xl border border-primary/10">
                <p className="text-primary font-medium">
                  Review your analysis below, then click "Start Assessment" to begin your personalized evaluation.
                </p>
              </div>
            </div>

            {/* Overview Card */}
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64" cy="64" r="58"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      className="text-gray-100"
                    />
                    <circle
                      cx="64" cy="64" r="58"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 * (1 - result.analysis.fit_score / 100)}
                      className="text-primary transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-primary">{Math.round(result.analysis.fit_score)}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Fit Score</span>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-2">Analysis Overview</h2>
                  <p className="text-text-secondary mb-4">{result.company.company_context}</p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {(result.analysis.critical_gaps ?? []).map(gap => (
                      <span key={gap} className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Critical Gap: {gap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Skill Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" /> Skill Analysis
                </h3>
                <div className="space-y-4">
                  {(result.analysis.skill_analysis ?? []).map((skill: SkillMatch, idx) => (
                    <div key={`${skill.name || 'skill'}-${idx}`} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{skill.name || 'Unknown skill'}</span>
                        <span className="text-text-secondary">{skill.estimated_level}/{skill.required_level}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            skill.gap === 0 ? 'bg-green-500' : 
                            skill.gap <= 2 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (skill.estimated_level / Math.max(1, skill.required_level)) * 100)}%` }}
                        />
                      </div>
                      {skill.evidence && (
                        <p className="text-[10px] text-text-secondary italic">Evidence: {skill.evidence}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" /> Interview Process
                </h3>
                <div className="space-y-3">
                  {(result.company?.interview_process ?? []).map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm text-text-secondary">{step}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Manual Assignment Trigger */}
            <Card className="p-8 border-2 border-primary/20 bg-primary/5 text-center">
              <Compass className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Ready for your Assessment?</h3>
              <p className="text-text-secondary mb-6">
                We've prepared 20 dynamic questions based on your skill gaps and target company.
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={() => navigate(`/assignment/${result.journey_id}`)} 
                  className="gap-2 px-8 py-6 text-lg"
                >
                  Start Assessment Now <Rocket className="h-5 w-5" />
                </Button>
              </div>
            </Card>

            <div className="flex justify-center pt-4">
              <Button onClick={() => navigate(`/assignment/${result.journey_id}`)} variant="outline">
                Go to Assignment Now
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
