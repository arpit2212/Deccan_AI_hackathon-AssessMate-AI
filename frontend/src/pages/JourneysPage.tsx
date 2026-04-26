import React from 'react'
import { Plus, Compass } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export const JourneysPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Journeys</h1>
          <p className="text-text-secondary">Track your preparation for different roles and companies.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-5 w-5" />
          New Journey
        </Button>
      </div>

      <Card className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border-dashed border-2 border-gray-200">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
          <Compass className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-text-primary">No journeys yet</h2>
        <p className="text-text-secondary max-w-sm text-center mb-8">
          Start your first journey by uploading a Job Description. We'll help you bridge the gap between your current skills and the role requirements.
        </p>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Create First Journey
        </Button>
      </Card>
    </div>
  )
}
