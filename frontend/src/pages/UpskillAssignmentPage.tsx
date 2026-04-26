import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const API_URL = 'http://localhost:8080/api'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

type Skill = { name: string; gap: number }

export const UpskillAssignmentPage = () => {
  const q = useQuery()
  const navigate = useNavigate()
  const { session } = useAuth()
  const journeyId = q.get('journey') || ''
  const [skills, setSkills] = useState<Skill[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!journeyId || !session?.access_token) return
      try {
        const res = await fetch(`${API_URL}/journeys/${journeyId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const body = await res.json().catch(() => ({} as any))
          const sa = body?.analysis_result?.skill_analysis ?? []
          const gaps: Skill[] = sa
            .filter((x: any) => (x?.gap ?? 0) > 0)
            .map((x: any) => ({ name: x?.name ?? '', gap: x?.gap ?? 0 }))
            .filter((x: Skill) => x.name)
          if (gaps.length > 0) {
            setSkills(gaps)
            return
          }
        }

        // Fallback: derive weak skills from assignment performance/history if journey gaps are unavailable
        const aRes = await fetch(`${API_URL}/assignment/${journeyId}`, {
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
  }, [journeyId, session?.access_token])

  const startUpskill = async () => {
    if (!selected) {
      toast.error('Select one skill to focus on')
      return
    }
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/assignment/${journeyId}/reattempt?skill=${encodeURIComponent(selected)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(body.error || 'Failed to start upskill attempt')
      toast.success('New upskill attempt created')
      navigate(`/assignment/${journeyId}`)
    } catch (e) {
      console.error(e)
      toast.error((e as any)?.message || 'Failed to start upskill attempt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Upskill Assignment</h1>
        <p className="text-text-secondary">
          Pick one weak skill. We’ll generate a focused re-attempt and update your learning plan after completion.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-text-primary">Choose a focus skill</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skills.length === 0 ? (
            <p className="text-sm text-text-secondary">No gaps found for this journey.</p>
          ) : (
            skills.map((s) => (
              <button
                key={s.name}
                onClick={() => setSelected(s.name)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selected === s.name ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-primary/30'
                }`}
              >
                <p className="font-bold text-text-primary">{s.name}</p>
                <p className="text-xs text-text-secondary">Gap: {s.gap}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate('/assignments')}>
            Back
          </Button>
          <Button onClick={startUpskill} isLoading={loading} disabled={!journeyId}>
            Start upskill attempt
          </Button>
        </div>
      </Card>
    </div>
  )
}

