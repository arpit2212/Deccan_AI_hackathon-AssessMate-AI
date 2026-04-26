import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export const LoginPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const easeOutCurve = [0, 0, 0.2, 1] as const

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, ease: easeOutCurve, duration: 0.4 }
    }
  }

  const fadeUp = (delay = 0) => ({
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay, ease: easeOutCurve }
    }
  })

  const fadeScale = (delay = 0) => ({
    hidden: { opacity: 0, scale: prefersReducedMotion ? 1 : 0.97 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, delay, ease: easeOutCurve }
    }
  })

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6 py-8 relative overflow-hidden overflow-x-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden animated-login-bg">
        <motion.div
          variants={fadeUp(0)}
          className="absolute -top-24 -left-24 w-80 sm:w-96 h-80 sm:h-96 bg-primary/5 rounded-full blur-3xl float-orb"
        />
        <motion.div
          variants={fadeUp(0.05)}
          className="absolute top-1/3 -right-16 sm:-right-24 w-72 sm:w-80 h-72 sm:h-80 bg-primary/6 rounded-full blur-3xl float-orb float-orb-delayed"
        />
        <motion.div
          variants={fadeUp(0.1)}
          className="absolute -bottom-24 -left-10 sm:-left-20 w-72 sm:w-80 h-72 sm:h-80 bg-primary/8 rounded-full blur-3xl float-orb float-orb-slow"
        />
      </div>

      <motion.div
        variants={fadeUp(0.15)}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            variants={fadeUp(0.2)}
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            transition={{ duration: 0.2, ease: easeOutCurve }}
            className="inline-block p-2.5 sm:p-3 bg-primary-light rounded-2xl mb-4"
          >
            <img
              src="/logo.png"
              alt="AssessMate logo"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover"
            />
          </motion.div>
          <motion.h1 variants={fadeUp(0.25)} className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-primary">
            AssessMate
          </motion.h1>
          <motion.p variants={fadeUp(0.3)} className="text-text-secondary text-base sm:text-lg">
            From Resume to Reality.
          </motion.p>
        </div>

        <motion.div variants={fadeUp(0.35)}>
          <Card className="border border-gray-100 border-t-primary/25 border-t-2 p-6 sm:p-8 rounded-[14px] sm:rounded-[20px] bg-white/85 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <motion.h2 variants={fadeUp(0.3)} className="text-2xl font-bold text-center mb-2 tracking-[0.01em]">Welcome Back</motion.h2>
          <motion.p variants={fadeUp(0.35)} className="text-text-secondary text-center mb-8 text-sm sm:text-base">
            Assess your real skills and build your personalized learning path.
          </motion.p>

          <motion.div variants={fadeScale(0.4)} whileTap={prefersReducedMotion ? {} : { scale: 0.98 }} transition={{ duration: 0.1, ease: easeOutCurve }}>
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full min-h-12 flex items-center gap-3 py-3 sm:py-4 border-2 hover:border-primary hover:bg-primary/5 hover:-translate-y-px active:scale-[0.98] transition-all duration-200"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-bold">Continue with Google</span>
            </Button>
          </motion.div>

          <motion.div variants={fadeUp(0.45)} className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-sm text-text-secondary leading-relaxed">
              By continuing, you agree to AssessMate's <br />
              <a href="#" className="underline underline-offset-2 transition-colors duration-150 hover:text-primary">Terms of Service</a> and <a href="#" className="underline underline-offset-2 transition-colors duration-150 hover:text-primary">Privacy Policy</a>.
            </p>
          </motion.div>
        </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
