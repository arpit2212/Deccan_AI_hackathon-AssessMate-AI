import React, { useEffect, useState } from 'react'
import { Plus, Compass, ChevronRight, Calendar, Briefcase, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'

interface Journey {
  id: string
  role_name: string
  company_name: string
  status: string
  created_at: string
  analysis_result: {
    fit_score: number
    critical_gaps: string[]
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export const JourneysPage: React.FC = () => {
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/journeys`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setJourneys(data)
        }
      } catch (error) {
        console.error('Error fetching journeys:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchJourneys()
    }
  }, [session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Journeys</h1>
          <p className="text-text-secondary">Track your preparation for different roles and companies.</p>
        </div>
        <Button onClick={() => navigate('/journeys/new')} className="gap-2">
          <Plus className="h-5 w-5" />
          New Journey
        </Button>
      </div>

      {journeys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {journeys.map((journey) => (
            <Card key={journey.id} className="hover:shadow-md transition-shadow group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    journey.status === 'analyzed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold mb-1 text-text-primary group-hover:text-primary transition-colors">
                  {journey.role_name}
                </h3>
                
                <div className="flex items-center gap-2 text-text-secondary mb-4">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">{journey.company_name}</span>
                </div>

                {journey.analysis_result && (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary">
                      <span>Initial Fit Score</span>
                      <span className="text-primary">{Math.round(journey.analysis_result.fit_score)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${journey.analysis_result.fit_score}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-text-secondary mb-6">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">
                    {new Date(journey.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-between group/btn"
                    onClick={() => navigate(`/assignment/${journey.id}`)}
                  >
                    View Assignment
                    <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between group/btn"
                    onClick={() => navigate(`/learning-plan/${journey.id}`)}
                  >
                    Learning Plan
                    <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border-dashed border-2 border-gray-200">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
            <Compass className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-text-primary">No journeys yet</h2>
          <p className="text-text-secondary max-w-sm text-center mb-8">
            Start your first journey by uploading a Job Description. We'll help you bridge the gap between your current skills and the role requirements.
          </p>
          <Button onClick={() => navigate('/journeys/new')} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create First Journey
          </Button>
        </Card>
      )}
    </div>
  )
}
