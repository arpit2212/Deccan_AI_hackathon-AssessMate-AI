import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase might need a moment to process the hash/code in the URL
        const { data, error } = await supabase.auth.getSession()
        
        if (error) throw error

        if (data.session) {
          toast.success('Successfully signed in!')
          navigate('/dashboard', { replace: true })
        } else {
          // If no session found yet, it might still be processing.
          // We can wait for onAuthStateChange to fire in the background.
          // But if we're here, we should check if there's an error in the URL.
          const urlParams = new URLSearchParams(window.location.search)
          const error_description = urlParams.get('error_description')
          if (error_description) {
            toast.error(error_description)
            navigate('/login', { replace: true })
          }
        }
      } catch (error: any) {
        console.error('Error during auth callback:', error)
        toast.error(error.message || 'Authentication failed. Please try again.')
        navigate('/login', { replace: true })
      }
    }

    handleAuthCallback()

    // Also listen for auth state changes as a backup
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Authenticating...</h2>
        <p className="text-text-secondary animate-pulse">Setting up your secure session</p>
      </div>
    </div>
  )
}
