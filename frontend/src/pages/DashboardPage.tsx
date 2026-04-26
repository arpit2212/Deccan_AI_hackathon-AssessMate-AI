import React from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Compass, Dna, Rocket, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

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

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!</h1>
        <p className="text-text-secondary">Here's what's happening with your skill evolution today.</p>
      </header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Your Journeys */}
        <motion.div variants={item}>
          <Card className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-200 bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">Your Journeys</h3>
            <p className="text-sm text-text-secondary mb-6">You haven't started any preparation journeys yet.</p>
            <Button size="sm" className="gap-2" onClick={() => navigate('/journeys/new')}>
              <Plus className="h-4 w-4" />
              New Journey
            </Button>
          </Card>
        </motion.div>

        {/* AssessMate DNA */}
        <motion.div variants={item}>
          <Card className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-200 bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Dna className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">AssessMate DNA</h3>
            <p className="text-sm text-text-secondary mb-6">Take an assessment to generate your first skill graph.</p>
            <Button variant="secondary" size="sm">
              View Assessments
            </Button>
          </Card>
        </motion.div>

        {/* Active Learning Plan */}
        <motion.div variants={item}>
          <Card className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-200 bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">Learning Plan</h3>
            <p className="text-sm text-text-secondary mb-6">No active learning plans found. Start a journey first.</p>
            <Button variant="outline" size="sm">
              Explore Topics
            </Button>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
