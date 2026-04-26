import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, Circle, ChevronRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = 'http://localhost:8080/api'

type AssignmentListItem = {
  journey_id: string
  role_name: string
  company_name: string
  status: string
  attempts: number
  score: number
}

type AssignmentsResponse = {
  completed: AssignmentListItem[]
  pending: AssignmentListItem[]
}

export const AssignmentsPage = () => {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<AssignmentsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAssignments = async () => {
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/assignments`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(body.error || 'Failed to load assignments')
      setData(body)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) fetchAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <Card className="p-8">
          <p className="text-text-secondary font-medium">Loading assignments…</p>
        </Card>
      </div>
    )
  }

  const completed = data?.completed ?? []
  const pending = data?.pending ?? []

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assignments</h1>
          <p className="text-text-secondary">Complete pending assignments to unlock learning plans.</p>
        </div>
        <Button variant="outline" onClick={fetchAssignments} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <Circle className="h-4 w-4 text-yellow-500" /> Not completed
          </h2>
          <div className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-sm text-text-secondary">No pending assignments.</p>
            ) : (
              pending.map((a, idx) => (
                <motion.button
                  key={`${a.journey_id}-${idx}`}
                  onClick={() => navigate(`/assignment/${a.journey_id}`)}
                  className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-gray-50 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-text-primary">{a.role_name}</p>
                    <p className="text-sm text-text-secondary">{a.company_name}</p>
                    <p className="text-xs text-text-secondary mt-1">Attempts: {a.attempts}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </motion.button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Completed
          </h2>
          <div className="space-y-3">
            {completed.length === 0 ? (
              <p className="text-sm text-text-secondary">No completed assignments yet.</p>
            ) : (
              completed.map((a, idx) => (
                <motion.div
                  key={`${a.journey_id}-${idx}`}
                  className="p-4 rounded-xl border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-text-primary">{a.role_name}</p>
                    <p className="text-sm text-text-secondary">{a.company_name}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Attempts: {a.attempts} • Last score: {a.score}%
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/assignment/${a.journey_id}`)}>
                      Review
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/upskill-assignment?journey=${a.journey_id}`)}>
                      Upskill
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

