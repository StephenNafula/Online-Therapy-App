import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

export default function AuthLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const timeoutMs = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS || 10 * 60 * 1000)
    if (!timeoutMs) return
    let timer
    const handleLogout = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/login', { replace: true, state: { reason: 'idle' } })
    }
    const reset = () => {
      clearTimeout(timer)
      const token = localStorage.getItem('token')
      if (!token) return
      timer = window.setTimeout(handleLogout, timeoutMs)
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(evt => window.addEventListener(evt, reset))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach(evt => window.removeEventListener(evt, reset))
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-background-dark">
      <Outlet />
    </div>
  )
}