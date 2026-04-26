import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, Circle, Send, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = 'http://localhost:8080/api'

type PlanData = {
  tasks?: string[]
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

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/learning-plan/${journeyId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Start Learning</h1>
            <p className="text-text-secondary">Manage your progress and ask your mentor assistant anytime.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 space-y-4">
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
                <button
                  key={idx}
                  onClick={() => toggleTask(idx)}
                  disabled={saving}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    done ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:border-primary/30'
                  }`}
                >
                  {done ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> : <Circle className="h-5 w-5 text-gray-400 mt-0.5" />}
                  <p className={`text-sm text-left ${done ? 'text-green-800 line-through' : 'text-text-secondary'}`}>{task}</p>
                </button>
              )
            })}
          </div>
        </Card>

        <Card className="p-4 flex flex-col h-[640px]">
          <h2 className="font-bold text-text-primary mb-3">Learning Mentor</h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {(plan.chat_history ?? []).map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-sm ${
                  m.role === 'user' ? 'bg-primary text-white ml-6' : 'bg-gray-100 text-text-primary mr-6'
                }`}
              >
                {m.message}
              </div>
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
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <Button onClick={sendMessage} disabled={chatLoading || !message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

