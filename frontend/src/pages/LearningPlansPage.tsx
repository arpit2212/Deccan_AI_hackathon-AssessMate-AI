import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { BookOpen, ChevronRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = 'http://localhost:8080/api'

type LearningPlanItem = {
  id: string
  journey_id: string
  role_name: string
  company_name: string
  time_constraint: string
  created_at: string
}

export const LearningPlansPage = () => {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<LearningPlanItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlans = async () => {
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/learning-plans`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(body.error || 'Failed to fetch learning plans')
      setPlans(Array.isArray(body) ? body : [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load learning plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Learning Plans</h1>
          <p className="text-text-secondary">Open any plan to view your full roadmap and analytics.</p>
        </div>
        <Button variant="outline" onClick={fetchPlans} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="p-6">
        {loading ? (
          <p className="text-text-secondary">Loading learning plans…</p>
        ) : plans.length === 0 ? (
          <p className="text-text-secondary">No learning plans found yet. Complete an assignment to unlock one.</p>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/learning-plan/${p.journey_id}`)}
                className="w-full p-4 border border-gray-100 rounded-xl hover:border-primary/30 hover:bg-gray-50 transition-all text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{p.role_name}</p>
                    <p className="text-sm text-text-secondary">{p.company_name} • {p.time_constraint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/start-learning/${p.journey_id}`)
                    }}
                  >
                    Start Learning
                  </Button>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

