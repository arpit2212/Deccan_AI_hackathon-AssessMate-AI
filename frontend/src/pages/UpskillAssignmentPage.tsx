import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = 'http://localhost:8080/api'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

type Skill = { name: string; gap: number }

const parseAnalysisResult = (raw: any): any => {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw
}

export const UpskillAssignmentPage = () => {
  const prefersReducedMotion = useReducedMotion()
  const q = useQuery()
  const navigate = useNavigate()
  const { session } = useAuth()
  const journeyIdFromQuery = q.get('journey') || ''
  const [activeJourneyId, setActiveJourneyId] = useState<string>(journeyIdFromQuery)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!session?.access_token) return

      let resolvedJourneyId = journeyIdFromQuery
      if (!resolvedJourneyId) {
        const listRes = await fetch(`${API_URL}/assignments`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        const listBody = await listRes.json().catch(() => ({} as any))
        if (listRes.ok) {
          const completed = Array.isArray(listBody?.completed) ? listBody.completed : []
          const pending = Array.isArray(listBody?.pending) ? listBody.pending : []
          resolvedJourneyId = String(completed[0]?.journey_id || pending[0]?.journey_id || '').trim()
        }
      }
      if (!resolvedJourneyId) {
        setSkills([])
        return
      }
      setActiveJourneyId(resolvedJourneyId)

      try {
        const res = await fetch(`${API_URL}/journeys/${resolvedJourneyId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const body = await res.json().catch(() => ({} as any))
          const analysis = parseAnalysisResult(body?.analysis_result)
          const sa = analysis?.skill_analysis ?? []
          const gaps: Skill[] = sa
            .map((x: any) => {
              const required = Number(x?.required_level ?? x?.requiredLevel ?? 0)
              const estimated = Number(x?.estimated_level ?? x?.estimatedLevel ?? x?.current_level ?? x?.currentLevel ?? 0)
              const inferredGap = Math.max(0, required - estimated)
              const gapValue = Number(x?.gap ?? inferredGap)
              const name = String(x?.name ?? x?.skill ?? '').trim()
              return { name, gap: Math.max(0, gapValue) }
            })
            .filter((x: Skill) => x.gap > 0)
            .filter((x: Skill) => x.name)
          if (gaps.length > 0) {
            setSkills(gaps)
            return
          }
        }

        // Fallback: derive weak skills from assignment performance/history if journey gaps are unavailable
        const aRes = await fetch(`${API_URL}/assignment/${resolvedJourneyId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        const aBody = await aRes.json().catch(() => ({} as any))
        if (!aRes.ok) throw new Error(aBody.error || 'Failed to load assignment')

        const questions = aBody?.questions ?? []
        const latestAttempt = Array.isArray(aBody?.attempts) && aBody.attempts.length > 0
          ? aBody.attempts[aBody.attempts.length - 1]
          : null
        const answers = latestAttempt?.answers ?? {}

        const bySkill: Record<string, { total: number; correct: number }> = {}
        questions.forEach((q: any, idx: number) => {
          const name = String(q?.skill_name ?? '').trim()
          if (!name) return
          if (!bySkill[name]) bySkill[name] = { total: 0, correct: 0 }
          bySkill[name].total += 1
          const userAns = String(answers?.[String(idx)] ?? '')
          if (userAns && userAns === String(q?.correct_answer ?? '')) {
            bySkill[name].correct += 1
          }
        })

        const fallbackSkills: Skill[] = Object.entries(bySkill)
          .map(([name, m]) => ({
            name,
            gap: Math.max(1, Math.round(((m.total - m.correct) / Math.max(1, m.total)) * 10))
          }))
          .sort((a, b) => b.gap - a.gap)

        // Last fallback: unique skill names from question set
        if (fallbackSkills.length > 0) {
          setSkills(fallbackSkills)
        } else {
          const unique: string[] = [...new Set(questions.map((q: any) => String(q?.skill_name ?? '').trim()).filter(Boolean))] as string[]
          setSkills(unique.map((name) => ({ name, gap: 1 })))
        }
      } catch (e) {
        console.error(e)
        toast.error('Failed to load skill gaps')
      }
    }
    load()
  }, [journeyIdFromQuery, session?.access_token])

  const startUpskill = async () => {
    if (!selected) {
      toast.error('Select one skill to focus on')
      return
    }
    if (!activeJourneyId) {
      toast.error('No journey found for upskill')
      return
    }
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/assignment/${activeJourneyId}/reattempt?skill=${encodeURIComponent(selected)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(body.error || 'Failed to start upskill attempt')
      toast.success('New upskill attempt created')
      navigate(`/assignment/${activeJourneyId}`)
    } catch (e) {
      console.error(e)
      toast.error((e as any)?.message || 'Failed to start upskill attempt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
      className="max-w-3xl mx-auto py-6 sm:py-8 space-y-6"
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.05 }}>
        <h1 className="text-2xl font-bold text-text-primary">Upskill Assignment</h1>
        <p className="text-text-secondary">
          Pick one weak skill. We’ll generate a focused re-attempt and update your learning plan after completion.
        </p>
      </motion.div>

      <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
        <h2 className="font-bold text-text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Choose a focus skill
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skills.length === 0 ? (
            <p className="text-sm text-text-secondary">No gaps found for this journey.</p>
          ) : (
            skills.map((s) => (
              <motion.button
                key={s.name}
                onClick={() => setSelected(s.name)}
                whileHover={prefersReducedMotion ? {} : { y: -2 }}
                transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selected === s.name ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-100 hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <p className="font-bold text-text-primary">{s.name}</p>
                <p className="text-xs text-text-secondary">Gap: {s.gap}</p>
              </motion.button>
            ))
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/assignments')}>
            Back
          </Button>
          <Button className="w-full sm:w-auto hover:-translate-y-px hover:shadow-sm transition-all duration-200" onClick={startUpskill} isLoading={loading} disabled={!activeJourneyId}>
            Start upskill attempt
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

