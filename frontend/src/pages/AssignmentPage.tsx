import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { CheckCircle2, AlertCircle, Loader2, Timer, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Question {
  question_text: string
  type: string
  difficulty: string
  options?: string[]
  correct_answer: string
  explanation: string
  skill_name: string
}

interface Assignment {
  id: string
  questions: Question[]
  status: string
}

export const AssignmentPage = () => {
  const { journeyId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/assignment/${journeyId}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({} as any))
          throw new Error(errData.error || 'Failed to fetch assignment')
        }
        const data = await response.json()
        setAssignment(data)
      } catch (error) {
        console.error(error)
        toast.error('Failed to load assignment')
      } finally {
        setLoading(false)
      }
    }

    if (journeyId && session) {
      fetchAssignment()
    }
  }, [journeyId, session])

  const handleAnswerSelect = (answer: string) => {
    setAnswers({ ...answers, [currentQuestionIndex]: answer })
  }

  const handleNext = () => {
    if (currentQuestionIndex < (assignment?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const calculateScore = () => {
    if (!assignment) return 0
    let correctCount = 0
    let scorable = 0
    assignment.questions.forEach((q, index) => {
      const isMcq = (q.type || '').toLowerCase() === 'mcq'
      if (!isMcq) return
      scorable++
      if (answers[index] === q.correct_answer) {
        correctCount++
      }
    })
    if (scorable === 0) return 0
    return Math.round((correctCount / scorable) * 100)
  }

  const handleSubmit = async () => {
    if (!assignment) return
    if (!journeyId) {
      toast.error('Journey ID missing. Please go back and open the assignment again.')
      return
    }
    setIsSubmitting(true)
    const finalScore = calculateScore()
    setScore(finalScore)

    try {
      // Map skills for the backend
      const skillLevels = assignment.questions.reduce((acc: any, q, index) => {
        const isCorrect = answers[index] === q.correct_answer
        const skillName = q.skill_name
        if (!acc[skillName]) acc[skillName] = { correct: 0, total: 0 }
        acc[skillName].total++
        if (isCorrect) acc[skillName].correct++
        return acc
      }, {})

      const skillsToUpdate = Object.entries(skillLevels).map(([name, data]: [string, any]) => ({
        name,
        level: Math.round((data.correct / data.total) * 10)
      }))

      const response = await fetch('http://localhost:8080/api/assignment/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          journey_id: journeyId,
          score: finalScore,
          skills: skillsToUpdate
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({} as any))
        throw new Error(errData.error || 'Failed to submit assignment')
      }
      
      setShowResults(true)
      toast.success('Assignment submitted!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to submit assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-text-secondary font-medium animate-pulse">Generating your 20-question dynamic assessment...</p>
      </div>
    )
  }

  if (!assignment || assignment.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">No Assignment Found</h2>
        <Button onClick={() => navigate('/journeys')}>Back to Journeys</Button>
      </div>
    )
  }

  if (showResults) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto py-12"
      >
        <Card className="p-8 text-center space-y-6">
          <div className="relative inline-block">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-100"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * score) / 100}
                className="text-primary transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-text-primary">{score}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-text-primary">Assessment Complete!</h2>
            <p className="text-text-secondary">
              Great job! We've updated your skill profile based on your performance.
            </p>
          </div>

          <div className="bg-primary/5 p-6 rounded-2xl space-y-4 text-left">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> What's next?
            </h3>
            <p className="text-sm text-text-secondary">
              Now that we have a clear picture of your actual skills, we've generated a personalized learning plan to bridge your remaining gaps.
            </p>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/journeys')}>
              My Journeys
            </Button>
            <Button className="flex-1" onClick={() => navigate(`/learning-plan/${journeyId}`)}>
              View Learning Plan
            </Button>
          </div>
        </Card>
      </motion.div>
    )
  }

  const currentQuestion = assignment.questions[currentQuestionIndex]

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-end mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">Skill Assessment</h1>
          <p className="text-text-secondary">Question {currentQuestionIndex + 1} of {assignment.questions.length}</p>
        </div>
        <div className="flex items-center gap-2 text-primary font-medium bg-primary/5 px-4 py-2 rounded-full">
          <Timer className="h-4 w-4" />
          <span>Dynamic Test</span>
        </div>
      </div>

      <div className="mb-8 bg-gray-100 h-2 rounded-full overflow-hidden">
        <motion.div 
          className="bg-primary h-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQuestionIndex + 1) / assignment.questions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-primary px-2 py-0.5 bg-primary/5 rounded">
                  {currentQuestion.skill_name}
                </span>
                <span className="text-[10px] uppercase font-bold text-text-secondary px-2 py-0.5 bg-gray-100 rounded">
                  {currentQuestion.difficulty}
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary leading-tight">
                {currentQuestion.question_text}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(currentQuestion.type || '').toLowerCase() === 'mcq' && currentQuestion.options ? (
                currentQuestion.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswerSelect(option)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      answers[currentQuestionIndex] === option
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-100 hover:border-primary/30 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        answers[currentQuestionIndex] === option
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-text-secondary'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="font-medium text-text-primary">{option}</span>
                    </div>
                  </button>
                ))
              ) : (
                <textarea
                  value={answers[currentQuestionIndex] || ''}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  placeholder="Type your answer or approach here..."
                  className="w-full h-40 p-4 rounded-xl border-2 border-gray-100 focus:border-primary outline-none resize-none font-medium"
                />
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              
              {currentQuestionIndex === assignment.questions.length - 1 ? (
                <Button 
                  onClick={handleSubmit} 
                  isLoading={isSubmitting}
                  disabled={!answers[currentQuestionIndex]}
                >
                  Submit Assessment
                </Button>
              ) : (
                <Button 
                  onClick={handleNext}
                  disabled={!answers[currentQuestionIndex]}
                >
                  Next Question <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-wrap gap-2 justify-center">
        {assignment.questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQuestionIndex(i)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
              currentQuestionIndex === i
                ? 'bg-primary text-white ring-4 ring-primary/20'
                : answers[i]
                ? 'bg-primary/20 text-primary'
                : 'bg-white text-text-secondary border border-gray-100'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
