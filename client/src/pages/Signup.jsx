import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '../api'

export default function Signup(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('client')
  const navigate = useNavigate()

  async function submit(e){
    e.preventDefault()
    const res = await post('/auth/signup', { name, email, password, role })
    if (res.token) {
      alert('Account created successfully! Please log in.')
      navigate('/login')
    } else {
      alert(res.message || 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen font-display bg-[linear-gradient(135deg,_#0A2E57_0%,_#041C34_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/20 backdrop-blur-lg">
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-white tracking-light text-[32px] font-bold leading-tight text-center">Create Account</h1>
          <form onSubmit={submit} className="w-full flex flex-col gap-4">
            <label className="flex flex-col w-full">
              <p className="text-gray-200 text-sm font-medium leading-normal pb-2">Name</p>
              <div className="relative flex w-full items-center">
                <span className="material-symbols-outlined absolute left-4 text-gray-400">person</span>
                <input
                  className="form-input w-full rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-white/20 bg-black/20 h-12 pl-12 pr-4"
                  placeholder="Your full name"
                  type="text"
                  value={name}
                  onChange={e=>setName(e.target.value)}
                  required
                />
              </div>
            </label>

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
                  required
                />
              </div>
            </label>

            <label className="flex flex-col w-full">
              <p className="text-gray-200 text-sm font-medium leading-normal pb-2">Password</p>
              <div className="relative flex w-full items-center">
                <span className="material-symbols-outlined absolute left-4 text-gray-400">lock</span>
                <input
                  className="form-input w-full rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-white/20 bg-black/20 h-12 pl-12 pr-12"
                  placeholder="Create a strong password"
                  type="password"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  required
                />
                <button type="button" aria-label="Toggle password visibility" className="absolute right-4 text-gray-400" onClick={()=>{}}>
                  <span className="material-symbols-outlined">visibility_off</span>
                </button>
              </div>
            </label>

            <label className="flex flex-col w-full">
              <p className="text-gray-200 text-sm font-medium leading-normal pb-2">Role</p>
              <div className="relative flex w-full items-center">
                <span className="material-symbols-outlined absolute left-4 text-gray-400">badge</span>
                <select
                  className="form-select w-full rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 border border-white/20 bg-black/20 h-12 pl-12 pr-4 appearance-none"
                  value={role}
                  onChange={e=>setRole(e.target.value)}
                >
                  <option value="client" className="bg-gray-900">Client</option>
                  <option value="therapist" className="bg-gray-900">Therapist</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 text-gray-400 pointer-events-none">expand_more</span>
              </div>
            </label>

            <div className="flex w-full gap-4 pt-4">
              <button type="submit" className="flex-1 rounded-lg bg-primary px-5 py-3 text-white font-bold transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                Sign Up
              </button>
              <button type="button" onClick={()=>navigate('/login')} className="flex-1 rounded-lg border border-white/30 bg-transparent px-5 py-3 text-white font-bold transition-all hover:bg-white/10">
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
