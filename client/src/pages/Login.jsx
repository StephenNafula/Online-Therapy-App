import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '../api'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    async function submit(e){
      e.preventDefault()
      setLoading(true)
      try {
        const res = await post('/auth/login', { email, password })
        if (res.token) {
          localStorage.setItem('token', res.token)
          localStorage.setItem('user', JSON.stringify(res.user))
          navigate('/app/dashboard', { replace: true })
        } else {
          alert(res.message || (res.errors && res.errors.map(er=>er.msg).join(', ')) || 'Login failed')
        }
      } catch (err) {
        console.error(err)
        alert('Login error')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="min-h-screen font-display bg-[linear-gradient(135deg,_#0A2E57_0%,_#041C34_100%)] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/20 backdrop-blur-lg">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-white tracking-light text-[28px] font-bold leading-tight text-center">Admin / Therapist Login</h1>
            <p className="text-gray-300 text-sm text-center max-w-sm">This login is for administrators and therapists only. Clients can book sessions without signing in via the Services page or the Book Now button.</p>
            <form onSubmit={submit} className="w-full flex flex-col gap-4">
              <label className="flex flex-col w-full">
                <p className="text-gray-200 text-sm font-medium leading-normal pb-2">Email</p>
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-400">mail</span>
                  <input
                    className="form-input w-full rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-white/20 bg-black/20 h-12 pl-12 pr-4"
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                  />
                </div>
              </label>

              <label className="flex flex-col w-full">
                <p className="text-gray-200 text-sm font-medium leading-normal pb-2">Password</p>
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-400">lock</span>
                  <input
                    className="form-input w-full rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-white/20 bg-black/20 h-12 pl-12 pr-12"
                    placeholder="Enter your password"
                    type="password"
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                  />
                  <button type="button" aria-label="Toggle password visibility" className="absolute right-4 text-gray-400" onClick={()=>{}}>
                    <span className="material-symbols-outlined">visibility_off</span>
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between">
                <a className="text-gray-400 hover:text-white text-sm underline" href="#">Forgot Password?</a>
                <button type="submit" className="ml-2 rounded-lg bg-primary px-5 py-2 text-white font-bold" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
              </div>

              {/* Registration disabled - clients book without signing up */}
            </form>
          </div>
        </div>
      </div>
    )
}
