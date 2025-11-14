import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function PublicLayout({ children }) {
  const location = useLocation()
  const isLoggedIn = localStorage.getItem('token')

  return (
    <div className="min-h-screen font-display">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-dark/80 backdrop-blur-sm">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">neurology</span>
            <span className="text-xl font-bold text-white">Happiness</span>
          </Link>
          
          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/" className={`text-sm font-medium ${location.pathname === '/' ? 'text-primary' : 'text-white/80 hover:text-white'}`}>
              Home
            </Link>
            <Link to="/about" className={`text-sm font-medium ${location.pathname === '/about' ? 'text-primary' : 'text-white/80 hover:text-white'}`}>
              About
            </Link>
            <Link to="/services" className={`text-sm font-medium ${location.pathname === '/services' ? 'text-primary' : 'text-white/80 hover:text-white'}`}>
              Services
            </Link>
            <Link to="/contact" className={`text-sm font-medium ${location.pathname === '/contact' ? 'text-primary' : 'text-white/80 hover:text-white'}`}>
              Contact
            </Link>
            <div className="flex items-center gap-3">
              {/* Prominent staff-only login (distinct color + icon) */}
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black transition-all hover:bg-amber-600"
                title="Admin and Therapist login"
                aria-label="Admin and Therapist login"
              >
                <span className="material-symbols-outlined">admin_panel_settings</span>
                <span>Staff Login</span>
                <span className="ml-1 text-[10px] rounded-full bg-black/10 px-2 py-0.5 text-black font-medium">Staff</span>
              </Link>

              {isLoggedIn && (
                <Link
                  to="/app/dashboard"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary/90"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}