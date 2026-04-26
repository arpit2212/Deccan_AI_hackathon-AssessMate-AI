import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, Circle, Send, ArrowLeft, Video, ExternalLink, RefreshCw } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import toast from 'react-hot-toast'

const API_URL = 'http://localhost:8080/api'

type PlanData = {
  tasks?: string[]
  youtube_suggestions?: Array<{ title: string; url: string; skill: string; duration?: string }>
  youtube_resources?: Array<{ title: string; url: string; skill: string; duration?: string }>
  learning_progress?: {
    completed_task_indexes?: number[]
    completion_percent?: number
  }
  chat_history?: Array<{ role: 'user' | 'assistant'; message: string; at?: string }>
}

export const StartLearningPage = () => {
  const { journeyId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [plan, setPlan] = useState<PlanData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const easeOutCurve = [0, 0, 0.2, 1] as const

  const tasks = plan.tasks ?? []
  const completed = plan.learning_progress?.completed_task_indexes ?? []
  const progress = useMemo(() => {
    if (tasks.length === 0) return 0
    return Math.round((completed.length / tasks.length) * 100)
  }, [tasks.length, completed.length])

  const load = async () => {
    if (!journeyId || !session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/learning-plan/${journeyId}?time=4 weeks, 15 hours/week`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(body.error || 'Failed to load plan')
      setPlan(body.plan_data || {})
    } catch (e) {
      console.error(e)
      toast.error((e as any)?.message || 'Failed to load learning plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId, session?.access_token])

  const fetchYouTubeSuggestions = async (refresh = false) => {
    if (!journeyId || !session?.access_token) return
    setResourcesLoading(true)
    try {
      const res = await fetch(`${API_URL}/learning-plan/${journeyId}/youtube-suggestions${refresh ? '?refresh=1' : ''}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(body.error || 'Failed to fetch YouTube suggestions')
      const resources = Array.isArray(body.youtube_resources) ? body.youtube_resources : []
      setPlan((prev) => ({ ...prev, youtube_suggestions: resources }))
    } catch (e) {
      console.error(e)
      toast.error((e as any)?.message || 'Failed to load YouTube suggestions')
    } finally {
      setResourcesLoading(false)
    }
  }

  useEffect(() => {
    if (!journeyId || !session?.access_token) return
    fetchYouTubeSuggestions(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId, session?.access_token])

  const toggleTask = async (idx: number) => {
    if (!journeyId || !session?.access_token) return
    const next = completed.includes(idx) ? completed.filter((x) => x !== idx) : [...completed, idx]
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/learning-plan/${journeyId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ completed_task_indexes: next })
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(body.error || 'Failed to update progress')
      setPlan((prev) => ({
        ...prev,
        learning_progress: {
          completed_task_indexes: next,
          completion_percent: body.completion_percent
        }
      }))
    } catch (e) {
      console.error(e)
      toast.error((e as any)?.message || 'Failed to update progress')
    } finally {
      setSaving(false)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !journeyId || !session?.access_token) return
    const currentMsg = message.trim()
    setMessage('')
    setChatLoading(true)
    try {
      const res = await fetch(`${API_URL}/learning-plan/${journeyId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ message: currentMsg })
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(body.error || 'Failed to chat with mentor')
      setPlan((prev) => ({
        ...prev,
        chat_history: Array.isArray(body.chat_history) ? body.chat_history : prev.chat_history
      }))
    } catch (e) {
      console.error(e)
      toast.error((e as any)?.message || 'Failed to send message')
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto py-8 text-text-secondary">Loading learning workspace…</div>
  }

  const youtubeSuggestions = plan.youtube_suggestions ?? plan.youtube_resources ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutCurve }}
      className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-0 space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: easeOutCurve }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/learning-plan/${journeyId}`)}
            className="h-10 w-10 p-0 transition-all duration-200 hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Start Learning</h1>
            <p className="text-text-secondary">Manage your progress and ask your mentor assistant anytime.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: easeOutCurve }}
          className="lg:col-span-2"
        >
          <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-text-primary">Task Tracker</h2>
            <span className="text-sm font-semibold text-primary">{progress}% complete</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="space-y-2">
            {tasks.map((task, idx) => {
              const done = completed.includes(idx)
              return (
                <motion.button
                  key={idx}
                  onClick={() => toggleTask(idx)}
                  disabled={saving}
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 + idx * 0.03, ease: easeOutCurve }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    done
                      ? 'border-green-300 bg-green-50 hover:shadow-sm'
                      : 'border-gray-100 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm'
                  }`}
                >
                  {done ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> : <Circle className="h-5 w-5 text-gray-400 mt-0.5" />}
                  <p className={`text-sm text-left ${done ? 'text-green-800 line-through' : 'text-text-secondary'}`}>{task}</p>
                </motion.button>
              )
            })}
          </div>
          </Card>

          <Card className="mt-4 p-5 sm:p-6 rounded-2xl border border-red-100 bg-red-50/30 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-text-primary flex items-center gap-2">
                <Video className="h-4 w-4 text-red-600" />
                YouTube Course Suggestions
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchYouTubeSuggestions(true)}
                disabled={resourcesLoading}
                className="transition-all duration-200 hover:-translate-y-0.5"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${resourcesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Personalized learning videos generated from your required skills.
            </p>

            <div className="mt-4 space-y-2">
              {youtubeSuggestions.map((resource, idx) => (
                <a
                  key={`${resource.url}-${idx}`}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-red-100 bg-white hover:border-red-300 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{resource.title}</p>
                    <p className="text-xs text-text-secondary">
                      {resource.skill}{resource.duration ? ` • ${resource.duration}` : ''}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-red-500 mt-1 shrink-0" />
                </a>
              ))}
              {!resourcesLoading && youtubeSuggestions.length === 0 && (
                <p className="text-xs text-text-secondary">No suggestions yet. Click refresh to generate recommendations.</p>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14, ease: easeOutCurve }}
        >
          <Card className="p-4 sm:p-5 flex flex-col h-[560px] sm:h-[640px] rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <h2 className="font-bold text-text-primary mb-3">Learning Mentor</h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {(plan.chat_history ?? []).map((m, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: easeOutCurve }}
                className={`p-3 rounded-lg text-sm ${
                  m.role === 'user' ? 'bg-primary text-white ml-6' : 'bg-gray-100 text-text-primary mr-6'
                }`}
              >
                {m.message}
              </motion.div>
            ))}
            {(plan.chat_history ?? []).length === 0 && (
              <p className="text-xs text-text-secondary">Ask: "What should I do this week?" or "Explain task 2 in simple steps".</p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about your learning plan..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
            />
            <Button
              onClick={sendMessage}
              disabled={chatLoading || !message.trim()}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

