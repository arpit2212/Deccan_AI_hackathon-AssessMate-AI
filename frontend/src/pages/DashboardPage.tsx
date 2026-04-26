import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Compass, Rocket, Plus, ChevronRight, Clock, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner'

interface Journey {
  id: string
  role_name: string
  company_name: string
  created_at: string
  analysis_result: any
}

export const DashboardPage: React.FC = () => {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/journeys', {
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

  const latestJourney = journeys[0]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!</h1>
          <p className="text-text-secondary">Here's what's happening with your skill evolution today.</p>
        </div>
        <Button onClick={() => navigate('/journeys/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Journey
        </Button>
      </header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12"
      >
        {/* Latest Journey Card */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="p-6 h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Compass className="w-32 h-32" />
            </div>
            
            {latestJourney ? (
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                    Latest Activity
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-1">{latestJourney.role_name}</h3>
                <p className="text-text-secondary mb-6 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  at {latestJourney.company_name}
                </p>
                
                <div className="mt-auto flex gap-4">
                  <Button size="sm" onClick={() => navigate(`/assignment/${latestJourney.id}`)}>
                    Continue Assessment
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/learning-plan/${latestJourney.id}`)}>
                    View Roadmap
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-4">
                  <Compass className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-text-primary">No Active Journey</h3>
                <p className="text-sm text-text-secondary mb-6 max-w-xs">
                  Analyze your first job description to start your personalized preparation path.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate('/journeys/new')}>
                  Start Now
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Stats Card */}
        <motion.div variants={item}>
          <Card className="p-6 h-full bg-primary text-white">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Rocket className="h-5 w-5" /> Your Progress
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2 opacity-80">
                  <span>Total Journeys</span>
                  <span>{journeys.length}</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(journeys.length * 20, 100)}%` }} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-2xl font-bold">{journeys.length}</p>
                  <p className="text-xs opacity-70">Roles Analyzed</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-2xl font-bold">{journeys.filter(j => j.analysis_result?.fit_score > 70).length}</p>
                  <p className="text-xs opacity-70">High Fit Roles</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent Journeys Table */}
      <motion.div variants={item}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-text-primary">Recent Activity</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/journeys')} className="text-primary hover:text-primary-hover">
            View All Journeys
          </Button>
        </div>
        
        <Card className="overflow-hidden">
          {journeys.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {journeys.slice(0, 5).map((journey) => (
                <div 
                  key={journey.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between group"
                  onClick={() => navigate(`/assignment/${journey.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary group-hover:text-primary transition-colors">
                        {journey.role_name}
                      </h4>
                      <p className="text-sm text-text-secondary">{journey.company_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-medium text-text-primary">
                        {new Date(journey.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-text-secondary">Analyzed</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-text-secondary mb-4">No recent activity to show.</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/journeys/new')}>
                Start your first journey
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
