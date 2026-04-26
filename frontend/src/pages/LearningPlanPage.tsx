import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Loader2, ArrowLeft, Target, Calendar, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface PlanData {
  nodes: Node[]
  edges: Edge[]
  tasks: string[]
}

export const LearningPlanPage = () => {
  const { journeyId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/learning-plan/${journeyId}?time=4 weeks, 15 hours/week`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        if (!response.ok) throw new Error('Failed to fetch plan')
        const data = await response.json()
        setPlan(data.plan_data)
      } catch (error) {
        console.error(error)
        toast.error('Failed to load learning plan')
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
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/journeys')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Personalized Learning Plan</h1>
            <p className="text-text-secondary flex items-center gap-2">
              <Calendar className="h-4 w-4" /> 4 Week Intensive Roadmap
            </p>
          </div>
        </div>
        <Button className="bg-primary text-white">
          <Target className="h-4 w-4 mr-2" /> Start Learning
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-text-primary px-2">Learning Roadmap</h3>
          <Card className="h-[600px] overflow-hidden border-2 border-primary/10">
            {plan && (
              <ReactFlow
                nodes={plan.nodes}
                edges={plan.edges}
                fitView
                colorMode="light"
              >
                <Background />
                <Controls />
              </ReactFlow>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-text-primary px-2">Actionable Tasks</h3>
          <div className="space-y-3">
            {plan?.tasks.map((task, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-primary/30 transition-all cursor-pointer"
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

          <Card className="p-6 bg-primary/5 border-none space-y-4">
            <h4 className="font-bold text-primary flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4" /> Mastery Tips
            </h4>
            <ul className="text-xs text-text-secondary space-y-2">
              <li>• Focus on hands-on implementation</li>
              <li>• Review weak areas from your assessment</li>
              <li>• Complete all scenario-based tasks</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
