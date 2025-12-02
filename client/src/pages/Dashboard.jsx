import React, { useEffect, useState, useRef, useCallback } from 'react'
import { io as ioClient } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { get, patch, post } from '../api'
import AvailabilityManagement from '../components/AvailabilityManagement'
import SecureMessaging from '../components/SecureMessaging'
import SessionNotesEditor from '../components/SessionNotesEditor'
import AudioCallComponent from '../components/AudioCallComponent'

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
  const [activeTab, setActiveTab] = useState('bookings')
  const [messagePrefill, setMessagePrefill] = useState('')
  const [messageSubjectPrefill, setMessageSubjectPrefill] = useState('')
  const [clientDirectory, setClientDirectory] = useState([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, bookingId: null, date: '', time: '' })
  const [resendLoadingId, setResendLoadingId] = useState(null)
  const lastPollRef = useRef(new Date())
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const token = localStorage.getItem('token')

  const loadClients = useCallback(async () => {
    if (user?.role !== 'therapist') return
    const authToken = localStorage.getItem('token')
    if (!authToken) return
    setClientsLoading(true)
    try {
      const data = await get('/users/me/clients', authToken)
      if (Array.isArray(data)) {
        setClientDirectory(data)
      }
    } catch (err) {
      console.error('Failed to load clients', err)
    } finally {
      setClientsLoading(false)
    }
  }, [user?.role])

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
          const s = await get('/bookings/reports/summary', token)
          if (s && !s.success && s.status === 401) {
            // handled globally in api.js
          } else if (s) {
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

  useEffect(() => {
    if (activeTab === 'clients' && user?.role === 'therapist') {
      loadClients()
    }
  }, [activeTab, user?.role, loadClients])

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
      const payload = { provider: pmProvider, reference: pmReference, amount: pmAmount ? parseFloat(pmAmount) : 0 }
      const data = await post(`/bookings/${id}/verify-payment`, payload, token)
      if (data && data._id) {
        setBookings(b => b.map(x => (x._id === data._id ? data : x)))
        alert('Payment verified')
        setPaymentModalOpen(false)
      } else if (data && data.status === 409) {
        alert(data.message || 'Booking already verified.')
      }
    } catch (err) {
      if (err?.status === 409 && user?.role === 'admin') {
        const override = window.confirm('This booking is already verified. Override and resend confirmation?')
        if (override) {
          try {
            const data = await post(`/bookings/${id}/verify-payment`, { provider: pmProvider, reference: pmReference, amount: pmAmount ? parseFloat(pmAmount) : 0, override: true }, token)
            if (data && data._id) {
              setBookings(b => b.map(x => (x._id === data._id ? data : x)))
              alert('Booking re-confirmed and link resent.')
              setPaymentModalOpen(false)
            }
            return
          } catch (overrideErr) {
            console.error('override verify error', overrideErr)
            alert('Override failed')
          }
        }
      } else {
        console.error('verify error', err)
        alert(err?.message || 'Verification failed')
      }
    }
  }

  async function handleResendLink(id) {
    if (user?.role !== 'admin') {
      alert('Only admins can resend confirmed links.')
      return
    }
    const confirmed = window.confirm('Resend the secure call link to the client?')
    if (!confirmed) return
    const token = localStorage.getItem('token')
    if (!token) return
    setResendLoadingId(id)
    try {
      const data = await post(`/bookings/${id}/verify-payment`, { override: true }, token)
      if (data && data._id) {
        setBookings(b => b.map(x => (x._id === data._id ? data : x)))
        alert('Secure link resent to client.')
      } else if (data && data.message) {
        alert(data.message)
      }
    } catch (err) {
      console.error('resend link error', err)
      alert(err?.message || 'Failed to resend link')
    } finally {
      setResendLoadingId(null)
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



  const handleStart = roomId => navigate(`/app/meeting/${roomId}`)

  const openRescheduleModal = booking => {
    const iso = new Date(booking.scheduledAt).toISOString()
    setRescheduleModal({
      open: true,
      bookingId: booking._id,
      date: iso.slice(0, 10),
      time: iso.slice(11, 16)
    })
  }

  const closeRescheduleModal = () => setRescheduleModal({ open: false, bookingId: null, date: '', time: '' })

  const handleRescheduleSave = async () => {
    if (!rescheduleModal.bookingId || !rescheduleModal.date || !rescheduleModal.time) {
      alert('Select a new date and time')
      return
    }
    const authToken = localStorage.getItem('token')
    if (!authToken) return
    try {
      const newIso = `${rescheduleModal.date}T${rescheduleModal.time}`
      const res = await patch(`/bookings/${rescheduleModal.bookingId}/reschedule`, { scheduledAt: newIso }, authToken)
      if (res && res._id) {
        setBookings(b => b.map(x => (x._id === res._id ? res : x)))
        closeRescheduleModal()
        alert('Booking rescheduled')
      } else if (res && res.message) {
        alert(res.message)
      }
    } catch (err) {
      console.error('reschedule error', err)
      alert('Failed to reschedule booking')
    }
  }

  return (
    <div className="relative flex min-h-screen bg-background-dark text-white">
      {/* Sidebar */}
      <aside
        className={`fixed z-20 h-full w-64 transform bg-background-dark p-4 transition-transform duration-300 md:relative md:translate-x-0 md:border-r md:border-white/10 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
              className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${activeTab === 'bookings'
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
                  className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${activeTab === 'availability'
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
                  className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${activeTab === 'messages'
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
                  onClick={() => { setActiveTab('clients'); setIsSidebarOpen(false) }}
                  className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${activeTab === 'clients'
                    ? 'bg-primary/20 text-primary'
                    : 'text-white hover:bg-white/10'
                    }`}
                >
                  <span className="material-symbols-outlined">group</span>
                  <p className="text-base font-semibold">Clients</p>
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveTab('notes'); setIsSidebarOpen(false) }}
                  className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors ${activeTab === 'notes'
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
          {user?.role === 'admin' && (
            <>
              <li>
                <button
                  onClick={() => { window.location.href = '/app/admin'; setIsSidebarOpen(false) }}
                  className={`w-full flex h-12 items-center gap-4 rounded-lg px-4 transition-colors text-white hover:bg-white/10`}
                >
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  <p className="text-base font-semibold">Admin Panel</p>
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
                                            Approve
                                          </button>
                                          {user?.role === 'therapist' && (
                                            <button onClick={() => openRescheduleModal(b)} className="rounded border px-3 py-1 text-xs">
                                              Reschedule
                                            </button>
                                          )}
                                          <button onClick={() => handleUpdateStatus(b._id, 'completed')} className="rounded bg-green-600 px-3 py-1 text-white text-xs">
                                            Complete
                                          </button>

                                          {user?.role === 'admin' && b.status === 'verified' && (
                                            <button
                                              onClick={() => handleResendLink(b._id)}
                                              disabled={resendLoadingId === b._id}
                                              className="rounded bg-blue-600 px-3 py-1 text-white text-xs"
                                            >
                                              {resendLoadingId === b._id ? 'Sending...' : 'Resend Link'}
                                            </button>
                                          )}
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
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${b.status === 'completed'
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
                              {(b.status === 'scheduled' || b.status === 'verified') && (
                                <div className="w-full sm:w-auto">
                                  <AudioCallComponent booking={b} token={token} userRole={user?.role} />
                                </div>
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
                                    Approve &amp; Send Link
                                  </button>

                                  <button
                                    onClick={() => openRescheduleModal(b)}
                                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-white font-bold transition-all hover:bg-white/5 text-sm"
                                  >
                                    <span className="material-symbols-outlined">calendar_today</span>
                                    Reschedule
                                  </button>

                                  {user?.role === 'admin' && b.status === 'verified' && (
                                    <button
                                      onClick={() => handleResendLink(b._id)}
                                      disabled={resendLoadingId === b._id}
                                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-bold transition-all hover:bg-blue-700 text-sm disabled:opacity-60"
                                    >
                                      <span className="material-symbols-outlined">send</span>
                                      {resendLoadingId === b._id ? 'Sending...' : 'Resend Link'}
                                    </button>
                                  )}

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
                                      // open messages tab and prefill recipient with client email
                                      setMessagePrefill(b.client?._id || b.client || '')
                                      setMessageSubjectPrefill(b.scheduledAt ? `Regarding your session on ${new Date(b.scheduledAt).toLocaleString()}` : `Regarding your session`)
                                      setActiveTab('messages')
                                      setIsSidebarOpen(false)
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-white font-bold transition-all hover:bg-white/5 text-sm"
                                  >
                                    <span className="material-symbols-outlined">chat</span>
                                    Message Client
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
            <SecureMessaging
              token={token}
              userId={user._id}
              prefillRecipient={messagePrefill}
              prefillSubject={messageSubjectPrefill}
            />
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
                      <SessionNotesEditor key={b._id} booking={b} token={token} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'clients' && user?.role === 'therapist' && (
            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Client Directory</h2>
                  <p className="text-sm text-gray-400">View clients who have booked sessions with you.</p>
                </div>
                <button
                  onClick={loadClients}
                  className="px-4 py-2 rounded-lg border border-white/20 text-sm text-white hover:bg-white/10"
                >
                  Refresh
                </button>
              </div>
              {clientsLoading ? (
                <p className="text-gray-300">Loading clients...</p>
              ) : clientDirectory.length === 0 ? (
                <p className="text-gray-400">No clients found.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-300">
                        <th className="p-2">Client</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Last Session</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientDirectory.map(client => (
                        <tr key={client.id} className="border-t border-white/10">
                          <td className="p-2">{client.name || 'Client'}</td>
                          <td className="p-2">{client.email || '—'}</td>
                          <td className="p-2">{client.lastSession ? new Date(client.lastSession).toLocaleString() : '—'}</td>
                          <td className="p-2 capitalize">{client.status || 'pending'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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



          {/* Reschedule Modal */}
          {rescheduleModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="w-full max-w-md rounded-lg bg-background-dark p-6 text-white border border-white/10">
                <h3 className="text-lg font-bold mb-4">Reschedule Session</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col text-sm text-gray-300">
                    New Date
                    <input
                      type="date"
                      value={rescheduleModal.date}
                      onChange={e => setRescheduleModal(modal => ({ ...modal, date: e.target.value }))}
                      className="mt-1 rounded-md bg-white/5 p-2 text-white"
                    />
                  </label>
                  <label className="flex flex-col text-sm text-gray-300">
                    New Time
                    <input
                      type="time"
                      value={rescheduleModal.time}
                      onChange={e => setRescheduleModal(modal => ({ ...modal, time: e.target.value }))}
                      className="mt-1 rounded-md bg-white/5 p-2 text-white"
                    />
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={closeRescheduleModal} className="rounded-lg bg-white/10 px-4 py-2">
                    Cancel
                  </button>
                  <button onClick={handleRescheduleSave} className="rounded-lg bg-primary px-4 py-2 text-black font-semibold">
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
