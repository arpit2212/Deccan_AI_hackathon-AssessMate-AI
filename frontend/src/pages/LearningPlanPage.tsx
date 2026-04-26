import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlow, Background, Controls, MiniMap, Panel, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Loader2, ArrowLeft, Target, Calendar, CheckCircle2, Video, Clock3, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

interface PlanData {
  title?: string
  summary?: string
  estimated_weeks?: number
  focus_skills?: string[]
  nodes: Node[]
  edges: Edge[]
  tasks: string[]
  analytics?: {
    total_hours?: number
    difficulty_mix?: Record<string, number>
    skill_coverage?: Array<{ skill: string; hours: number; target_level?: number }>
    weekly_milestones?: string[]
  }
  youtube_resources?: Array<{
    title: string
    url: string
    skill: string
    duration?: string
  }>
}

export const LearningPlanPage = () => {
  const { journeyId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const prefersReducedMotion = useReducedMotion()
  const easeOutCurve = [0, 0, 0.2, 1] as const

  const phaseColor = (phase?: string) => {
    switch ((phase || '').toLowerCase()) {
      case 'foundation':
        return '#3b82f6'
      case 'applied':
        return '#22c55e'
      case 'advanced':
        return '#f59e0b'
      case 'simulation':
        return '#a855f7'
      default:
        return '#64748b'
    }
  }

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/learning-plan/${journeyId}?time=4 weeks, 15 hours/week`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({} as any))
          throw new Error(errData.error || 'Failed to fetch plan')
        }
        const data = await response.json()
        const rawPlan: PlanData = data.plan_data
        const coloredNodes: Node[] = (rawPlan?.nodes ?? []).map((n: any) => {
          const phase = n?.data?.phase
          const color = phaseColor(phase)
          return {
            ...n,
            style: {
              ...(n.style || {}),
              border: `2px solid ${color}`,
              borderRadius: 14,
              background: `${color}12`,
              color: '#0f172a',
              padding: 6,
              width: 240
            }
          }
        })
        setPlan({ ...rawPlan, nodes: coloredNodes })
      } catch (error) {
        console.error(error)
        toast.error((error as any)?.message || 'Failed to load learning plan')
      } finally {
        setLoading(false)
      }
    }

    if (journeyId && session) {
      fetchPlan()
    }
  }, [journeyId, session])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-text-secondary font-medium animate-pulse">Designing your personalized learning roadmap...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutCurve }}
      className="max-w-6xl mx-auto py-6 sm:py-8 space-y-6 sm:space-y-8 px-4 sm:px-0"
    >
      <motion.div
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: easeOutCurve }}
        className="flex flex-col gap-4 sm:gap-5 sm:flex-row sm:justify-between sm:items-center"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/journeys')}
            className="h-10 w-10 p-0 transition-all duration-200 hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{plan?.title || 'Personalized Learning Plan'}</h1>
            <p className="text-text-secondary flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {plan?.estimated_weeks || 4} Week Intensive Roadmap
            </p>
          </div>
        </div>
        <Button
          className="bg-primary text-white w-full sm:w-auto transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => navigate(`/start-learning/${journeyId}`)}
        >
          <Target className="h-4 w-4 mr-2" /> Start Learning
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: easeOutCurve }}
          className="lg:col-span-2 space-y-4"
        >
          <h3 className="font-bold text-text-primary px-2">Learning Roadmap</h3>
          <Card className="h-[520px] sm:h-[600px] overflow-hidden border border-primary/15 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            {plan && (
              <ReactFlow
                nodes={plan.nodes}
                edges={plan.edges}
                fitView
                colorMode="light"
              >
                <Background />
                <Controls />
                <MiniMap />
                <Panel position="top-right">
                  <div className="bg-white/90 backdrop-blur p-2 rounded-lg border text-xs space-y-1">
                    <p className="font-semibold">Phase Colors</p>
                    <p><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" /> Foundation</p>
                    <p><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" /> Applied</p>
                    <p><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" /> Advanced</p>
                    <p><span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1" /> Simulation</p>
                  </div>
                </Panel>
              </ReactFlow>
            )}
          </Card>
          {plan?.summary && (
            <Card className="p-4 sm:p-5 text-sm text-text-secondary rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md">
              <p>{plan.summary}</p>
            </Card>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: easeOutCurve }}
          className="space-y-5 sm:space-y-6"
        >
          <Card className="p-5 space-y-3 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md">
            <h4 className="font-bold text-text-primary flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Plan Analytics
            </h4>
            <div className="text-sm text-text-secondary space-y-1">
              <p>Total tasks: {plan?.tasks?.length ?? 0}</p>
              <p>Total hours: {plan?.analytics?.total_hours ?? 'N/A'}</p>
              <p>Focus skills: {(plan?.focus_skills ?? []).join(', ') || 'N/A'}</p>
            </div>
          </Card>

          <h3 className="font-bold text-text-primary px-2">Actionable Tasks</h3>
          <div className="space-y-3">
            {plan?.tasks.map((task, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + i * 0.04, duration: 0.35, ease: easeOutCurve }}
                className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-primary/50 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                  </div>
                  <p className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                    {task}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {(plan?.youtube_resources?.length ?? 0) > 0 && (
            <Card className="p-5 sm:p-6 border border-red-100 bg-red-50/40 rounded-2xl space-y-3 shadow-sm transition-all duration-300 hover:shadow-md">
              <h4 className="font-bold text-red-700 flex items-center gap-2 text-sm">
                <Video className="h-4 w-4" /> YouTube Upskill Resources
              </h4>
              <div className="space-y-2">
                {plan?.youtube_resources?.map((r, idx) => (
                  <a
                    key={idx}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-3 rounded-xl border border-red-100 bg-white hover:border-red-300 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <p className="text-sm font-semibold text-text-primary">{r.title}</p>
                    <p className="text-xs text-text-secondary">{r.skill} {r.duration ? `• ${r.duration}` : ''}</p>
                  </a>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5 sm:p-6 bg-primary/5 border-none rounded-2xl space-y-4 shadow-sm transition-all duration-300 hover:shadow-md">
            <h4 className="font-bold text-primary flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4" /> Mastery Tips
            </h4>
            <ul className="text-xs text-text-secondary space-y-2">
              <li>• Focus on hands-on implementation</li>
              <li>• Review weak areas from your assessment</li>
              <li>• Complete all scenario-based tasks</li>
              <li className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> Track hours weekly against milestones</li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
