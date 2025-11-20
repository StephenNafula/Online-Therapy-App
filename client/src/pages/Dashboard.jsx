import React, { useEffect, useState, useRef } from 'react'
import { io as ioClient } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { get, patch } from '../api'
import AvailabilityManagement from '../components/AvailabilityManagement'
import SecureMessaging from '../components/SecureMessaging'

export default function Dashboard() {
  const [bookings, setBookings] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [tableView, setTableView] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [summary, setSummary] = useState(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentModalBooking, setPaymentModalBooking] = useState(null)
  const [pmProvider, setPmProvider] = useState('mpesa')
  const [pmReference, setPmReference] = useState('')
  const [pmAmount, setPmAmount] = useState('')
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteBookingId, setNoteBookingId] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [activeTab, setActiveTab] = useState('bookings')
  const lastPollRef = useRef(new Date())
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const token = localStorage.getItem('token')

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    async function load() {
      setLoading(true)
      try {
        const data = await get('/bookings', token)
        if (Array.isArray(data)) setBookings(data)

        // Load summary
        try {
          const summaryRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/bookings/reports/summary`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (summaryRes.ok) {
            const s = await summaryRes.json()
            setSummary(s)
          }
        } catch (err) {
          console.error('Failed to load summary', err)
        }
      } catch (err) {
        console.error('Failed to load bookings', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate])

  // Polling
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const interval = setInterval(async () => {
      try {
        const data = await get('/bookings', token)
        if (Array.isArray(data)) {
          const last = lastPollRef.current || new Date(0)
          const newOnes = data.filter(b => new Date(b.createdAt) > new Date(last))
          if (newOnes.length > 0) {
            setNotifications(n =>
              [
                ...newOnes.map(b => ({
                  id: b._id,
                  message: `New booking from ${b.client?.name || b.client}`
                })),
                ...n
              ].slice(0, 10)
            )
          }
          setBookings(data)
        }
        lastPollRef.current = new Date()
      } catch (err) {
        console.error('Polling error', err)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:4000')
    const socket = ioClient(socketUrl, { auth: { token } })

    socket.on('connect', () => console.debug('socket connected', socket.id))
    socket.on('booking:created', b => {
      setNotifications(n => [{ id: b._id, message: `New booking from ${b.client?.name || 'Guest'}` }, ...n].slice(0, 10))
      setBookings(prev => [b, ...prev])
    })
    socket.on('booking:updated', b => {
      setBookings(prev => prev.map(x => (x._id === b._id ? b : x)))
      setNotifications(n => [{ id: b._id, message: `Booking updated: ${b.status}` }, ...n].slice(0, 10))
    })
    socket.on('disconnect', () => console.debug('socket disconnected'))

    return () => socket.disconnect()
  }, [])

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login', { replace: true })
  }

  const filteredBookings = bookings.filter(b => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'pending') return b.externalPayment && b.externalPayment.amount && b.status !== 'verified'
    return b.status === filterStatus
  })

  async function handleVerifyPayment(id) {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/bookings/${id}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ provider: pmProvider, reference: pmReference, amount: pmAmount ? parseFloat(pmAmount) : 0 })
      })
      const data = await res.json()
      if (data && data._id) {
        setBookings(b => b.map(x => (x._id === data._id ? data : x)))
        alert('Payment verified')
        setPaymentModalOpen(false)
      }
    } catch (err) {
      console.error('verify error', err)
    }
  }

  async function handleUpdateStatus(id, status) {
    const token = localStorage.getItem('token')
    try {
      const res = await patch(`/bookings/${id}/status`, { status }, token)
      if (res && res._id) {
        setBookings(b => b.map(x => (x._id === res._id ? res : x)))
        alert(`Status updated to ${status}`)
      }
    } catch (err) {
      console.error('status update error', err)
    }
  }

  async function handleSaveNotes(id) {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/bookings/${id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ notes: noteText })
      })
      const data = await res.json()
      if (data && data._id) {
        setBookings(b => b.map(x => (x._id === data._id ? data : x)))
        alert('Notes saved')
        setNoteModalOpen(false)
        setNoteBookingId(null)
        setNoteText('')
      }
    } catch (err) {
      console.error('notes error', err)
    }
  }

  const handleStart = roomId => navigate(`/meeting/${roomId}`)

  return (
    <div className="relative flex min-h-screen bg-background-dark text-white">
      {/* Sidebar */}
      <aside
        className={`fixed z-20 h-full w-64 transform bg-background-dark p-4 transition-transform duration-300 md:relative md:translate-x-0 md:border-r md:border-white/10 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="material-symbols-outlined text-primary text-3xl">neurology</span>
          <h1 className="text-xl font-bold text-white">Happiness</h1>
        </div>

        <ul className="flex flex-col gap-2 pb-24">
          <li>
            <button
              onClick={() => { setActiveTab('bookings'); setIsSidebarOpen(false) }}
              className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${
                activeTab === 'bookings'
                  ? 'bg-primary/20 text-primary'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <p className="text-base font-semibold">Dashboard</p>
            </button>
          </li>
          {user?.role === 'therapist' && (
            <>
              <li>
                <button
                  onClick={() => { setActiveTab('availability'); setIsSidebarOpen(false) }}
                  className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${
                    activeTab === 'availability'
                      ? 'bg-primary/20 text-primary'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined">schedule</span>
                  <p className="text-base font-semibold">My Availability</p>
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveTab('messages'); setIsSidebarOpen(false) }}
                  className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${
                    activeTab === 'messages'
                      ? 'bg-primary/20 text-primary'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined">chat_bubble</span>
                  <p className="text-base font-semibold">Messages</p>
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveTab('notes'); setIsSidebarOpen(false) }}
                  className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${
                    activeTab === 'notes'
                      ? 'bg-primary/20 text-primary'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined">notes</span>
                  <p className="text-base font-semibold">Session Notes</p>
                </button>
              </li>
            </>
          )}
        </ul>

        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          <button onClick={handleLogout} className="w-full flex h-12 items-center gap-4 rounded-lg px-4 hover:bg-red-600/20 hover:text-red-400 transition-colors text-white border border-red-500/20">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-base font-semibold">Logout</p>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex h-20 items-center justify-between border-b border-white/10 bg-background-dark/80 p-4 backdrop-blur-sm md:px-8">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="text-white md:hidden">
              <span className="material-symbols-outlined text-3xl">menu</span>
            </button>
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-white sm:text-2xl">Welcome back, {user?.name || 'Guest'}!</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/10">
              <span className="material-symbols-outlined">notifications</span>
              {bookings.filter(b => b.status === 'scheduled').length > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background-dark"></span>
              )}
            </button>
            <div className="relative group">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-gray-400">person</span>
              </div>
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-background-dark border border-white/10 shadow-xl hidden group-hover:block z-50">
                <div className="p-3">
                  <p className="px-3 py-2 text-sm text-gray-400 font-semibold">{user?.name}</p>
                  <p className="px-3 py-1 text-xs text-gray-500">{user?.email}</p>
                  <div className="h-px bg-white/10 my-2"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-md flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-8">
          {activeTab === 'bookings' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-white opacity-60 flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Loading...
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8">
                  {/* Stats */}
                  <section className="w-full">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white/5 backdrop-blur-lg border border-white/10">
                        <p className="text-white text-base font-medium">Total Sessions</p>
                        <p className="text-white tracking-tight text-3xl font-bold">{bookings.length}</p>
                      </div>
                      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white/5 backdrop-blur-lg border border-white/10">
                        <p className="text-white text-base font-medium">Active Sessions</p>
                        <p className="text-white tracking-tight text-3xl font-bold">{bookings.filter(b => b.status === 'scheduled').length}</p>
                      </div>
                      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white/5 backdrop-blur-lg border border-white/10">
                        <p className="text-white text-base font-medium">Completed Sessions</p>
                        <p className="text-white tracking-tight text-3xl font-bold">{bookings.filter(b => b.status === 'completed').length}</p>
                      </div>
                    </div>
                  </section>

                  {/* Upcoming Sessions */}
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                        {user?.role === 'therapist' ? 'My Assigned Sessions' : 'Upcoming Sessions'}
                      </h2>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <label>Filter:</label>
                          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-md bg-white/5 p-2 text-white">
                            <option value="all">All</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="verified">Verified</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="pending">Pending Payments</option>
                          </select>
                        </div>
                        <button onClick={() => setTableView(v => !v)} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
                          {tableView ? 'Card View' : 'Table View'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {bookings.length === 0 && (
                        <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 p-8 text-center">
                          <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">calendar_month</span>
                          <p className="text-gray-400">No upcoming sessions</p>
                          {user?.role === 'therapist' ? (
                            <button
                              onClick={() => { setActiveTab('availability'); setIsSidebarOpen(false) }}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white font-bold mt-4 transition-all hover:bg-primary/90"
                            >
                              <span className="material-symbols-outlined">schedule</span>
                              Set Your Availability
                            </button>
                          ) : user?.role === 'admin' ? (
                            <a
                              href="/app/admin"
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white font-bold mt-4 transition-all hover:bg-primary/90"
                            >
                              <span className="material-symbols-outlined">dashboard</span>
                              Go to Admin Panel
                            </a>
                          ) : (
                            <a
                              href="/services"
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white font-bold mt-4 transition-all hover:bg-primary/90"
                            >
                              Book Your First Session
                            </a>
                          )}
                        </div>
                      )}

                      {tableView ? (
                        <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 p-4 overflow-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-sm text-gray-300">
                                <th className="p-2">Client</th>
                                <th className="p-2">Therapist</th>
                                <th className="p-2">Date</th>
                                <th className="p-2">Status</th>
                                <th className="p-2">Amount</th>
                                <th className="p-2">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredBookings.map(b => (
                                <tr key={b._id} className="align-top border-t border-white/5">
                                  <td className="p-2 align-top">{b.client?.name || b.client}</td>
                                  <td className="p-2 align-top">{b.therapist?.name || b.therapist}</td>
                                  <td className="p-2 align-top">{new Date(b.scheduledAt).toLocaleString()}</td>
                                  <td className="p-2 align-top">{b.status}</td>
                                  <td className="p-2 align-top">
                                    {b.externalPayment?.amount ? (
                                      <div className="flex items-center gap-2">
                                        <span>{b.externalPayment.amount}</span>
                                        {b.status !== 'verified' && (
                                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300">
                                            Pending
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="p-2 align-top">
                                    <div className="flex flex-wrap gap-2">
                                      {(user?.role === 'admin' || user?.role === 'therapist') && (
                                        <>
                                          <button
                                            onClick={() => {
                                              setPaymentModalBooking(b._id)
                                              setPmProvider('mpesa')
                                              setPmReference('')
                                              setPmAmount('')
                                              setPaymentModalOpen(true)
                                            }}
                                            className="rounded bg-amber-500 px-3 py-1 text-black text-xs"
                                          >
                                            Verify
                                          </button>
                                          <button onClick={() => handleUpdateStatus(b._id, 'completed')} className="rounded bg-green-600 px-3 py-1 text-white text-xs">
                                            Complete
                                          </button>
                                          <button
                                            onClick={() => {
                                              setNoteBookingId(b._id)
                                              setNoteText(b.notes || '')
                                              setNoteModalOpen(true)
                                            }}
                                            className="rounded border px-3 py-1 text-xs"
                                          >
                                            Note
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        filteredBookings.map(b => (
                          <div key={b._id} className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 p-6">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-primary">psychology</span>
                                </div>
                                <div>
                                  <h3 className="text-white font-bold text-lg">{b.therapist?.name || 'Therapist'}</h3>
                                  <p className="text-gray-400">{new Date(b.scheduledAt).toLocaleString()}</p>
                                  {b.externalPayment?.amount && b.status !== 'verified' && (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-300 mt-2">
                                      <span className="material-symbols-outlined text-xs">pending</span>
                                      Pending Payment
                                    </span>
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                      b.status === 'completed'
                                        ? 'bg-green-500/20 text-green-400'
                                        : b.status === 'scheduled'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-red-500/20 text-red-400'
                                    } mt-2`}
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {b.status === 'completed' ? 'check_circle' : b.status === 'scheduled' ? 'schedule' : 'cancel'}
                                    </span>
                                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-start mt-4">
                              {b.status === 'scheduled' && (
                                <button
                                  onClick={() => handleStart(b.roomId)}
                                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white font-bold transition-all hover:bg-primary/90 text-sm"
                                >
                                  <span className="material-symbols-outlined">video_call</span>
                                  Join Call
                                </button>
                              )}

                              {(user?.role === 'therapist' || user?.role === 'admin') && (
                                <>
                                  <button
                                    onClick={() => {
                                      setPaymentModalBooking(b._id)
                                      setPmProvider('mpesa')
                                      setPmReference('')
                                      setPmAmount('')
                                      setPaymentModalOpen(true)
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white font-bold transition-all hover:bg-amber-600 text-sm"
                                  >
                                    <span className="material-symbols-outlined">paid</span>
                                    Verify Payment
                                  </button>

                                  <button
                                    onClick={() => handleUpdateStatus(b._id, 'completed')}
                                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white font-bold transition-all hover:bg-green-700 text-sm"
                                  >
                                    <span className="material-symbols-outlined">check_circle</span>
                                    Mark Completed
                                  </button>

                                  {user?.role === 'therapist' && b.status !== 'scheduled' && (
                                    <button
                                      onClick={() => handleUpdateStatus(b._id, 'scheduled')}
                                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-bold transition-all hover:bg-blue-700 text-sm"
                                    >
                                      <span className="material-symbols-outlined">calendar_today</span>
                                      Accept
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setNoteBookingId(b._id)
                                      setNoteText(b.notes || '')
                                      setNoteModalOpen(true)
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-white font-bold transition-all hover:bg-white/5 text-sm"
                                  >
                                    <span className="material-symbols-outlined">notes</span>
                                    Add Note
                                  </button>

                                  <button
                                    onClick={() => handleUpdateStatus(b._id, 'cancelled')}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-white font-bold transition-all hover:bg-red-800 text-sm"
                                  >
                                    <span className="material-symbols-outlined">cancel</span>
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}

          {activeTab === 'availability' && user?.role === 'therapist' && (
            <AvailabilityManagement token={token} therapistId={user._id} />
          )}

          {activeTab === 'messages' && user?.role === 'therapist' && (
            <SecureMessaging token={token} userId={user._id} />
          )}

          {activeTab === 'notes' && user?.role === 'therapist' && (
            <div className="grid grid-cols-1 gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-4 text-white">Session Notes</h2>
                <p className="text-gray-300 mb-6">Manage encrypted notes for your therapy sessions</p>
                {filteredBookings.length === 0 ? (
                  <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 p-8 text-center">
                    <p className="text-gray-400">No sessions available for notes</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredBookings.map(b => (
                      <div key={b._id} className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-white font-bold">{b.client?.name || 'Client'}</h3>
                            <p className="text-gray-400 text-sm">{new Date(b.scheduledAt).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => {
                              setNoteBookingId(b._id)
                              setNoteText(b.notes || '')
                              setNoteModalOpen(true)
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white font-bold transition-all hover:bg-primary/90"
                          >
                            <span className="material-symbols-outlined">edit</span>
                            Edit Notes
                          </button>
                        </div>
                        {b.notes && (
                          <div className="mt-4 p-3 rounded-lg bg-black/20 border border-white/5">
                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{b.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Modal */}
          {paymentModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="w-full max-w-md rounded-lg bg-background-dark p-6 text-white border border-white/10">
                <h3 className="text-lg font-bold mb-4">Verify Payment</h3>
                <div className="flex flex-col gap-3">
                  <label className="text-sm text-gray-300">Provider</label>
                  <select
                    value={pmProvider}
                    onChange={e => setPmProvider(e.target.value)}
                    className="rounded-md bg-white/5 p-2 text-white"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank</option>
                    <option value="paypal">PayPal</option>
                    <option value="other">Other</option>
                  </select>

                  <label className="text-sm text-gray-300">Transaction Reference</label>
                  <input value={pmReference} onChange={e => setPmReference(e.target.value)} className="rounded-md bg-white/5 p-2 text-white" />

                  <label className="text-sm text-gray-300">Amount</label>
                  <input value={pmAmount} onChange={e => setPmAmount(e.target.value)} className="rounded-md bg-white/5 p-2 text-white" />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setPaymentModalOpen(false)
                      setPaymentModalBooking(null)
                    }}
                    className="rounded-lg bg-white/10 px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleVerifyPayment(paymentModalBooking)}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-white"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes Modal */}
          {noteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="w-full max-w-md rounded-lg bg-background-dark p-6 text-white border border-white/10">
                <h3 className="text-lg font-bold mb-4">Session Notes</h3>
                <div className="flex flex-col gap-3">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={6}
                    className="rounded-md bg-white/5 p-2 text-white w-full"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setNoteModalOpen(false)
                      setNoteBookingId(null)
                      setNoteText('')
                    }}
                    className="rounded-lg bg-white/10 px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveNotes(noteBookingId)}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
