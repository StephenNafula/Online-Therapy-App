import React, { useState, useEffect } from 'react'
import { io as ioClient } from 'socket.io-client'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { post } from '../api'
import ConsentModal from '../components/ConsentModal'

export default function Booking(){
  const { therapistId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const selectedService = location.state?.selectedService

  // Client Information
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredContact, setPreferredContact] = useState('email')

  // Session Details
  const [therapyType, setTherapyType] = useState(selectedService?.name || '')
  const [sessionDuration, setSessionDuration] = useState(selectedService?.duration || '')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlotsTz, setAvailableSlotsTz] = useState('UTC')
  const [therapistName, setTherapistName] = useState('')
  const [therapistEmail, setTherapistEmail] = useState('')
  const [therapistFetchedId, setTherapistFetchedId] = useState('')
  const [therapistOptions, setTherapistOptions] = useState([])
  const [therapistTimezone, setTherapistTimezone] = useState('')
  const [therapistLoading, setTherapistLoading] = useState(false)
  const [scheduledAtISO, setScheduledAtISO] = useState('')
  const [sessionMode, setSessionMode] = useState('online')
  const [bookingNote, setBookingNote] = useState('')
  const [allowManualTime, setAllowManualTime] = useState(false)

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [amountPaid, setAmountPaid] = useState(selectedService?.price || '')

  // Consent
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [agreeToTherapy, setAgreeToTherapy] = useState(false)
  const [subscribeUpdates, setSubscribeUpdates] = useState(false)

  // modal state for privacy & informed consent
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)

  // Form State
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [bookingId, setBookingId] = useState('')
  const [errors, setErrors] = useState({})

  const timezones = [
    'UTC', 'GMT', 'EST', 'CST', 'MST', 'PST', 
    'IST', 'GST', 'JST', 'AEST', 'SAST', 'EAT'
  ]

  const therapyTypes = [
    'Individual Therapy - 30 mins',
    'Individual Therapy - 60 mins',
    'Individual Therapy - 90 mins',
    'Couples Therapy - 60 mins',
    'Couples Therapy - 90 mins',
    'Pre-Marital Counseling Package',
    'Family Therapy - 60 mins',
    'Teen & Adolescent Therapy - 45 mins',
    'Parent Coaching - 60 mins',
    'Trauma Recovery Therapy - 60 mins',
    'Anxiety & Stress Management - 45 mins',
    'Depression Support - 60 mins',
    'Grief & Loss Counseling - 60 mins',
    'Addiction Recovery Therapy - 60 mins',
    'Career & Life Coaching - 45 mins',
    'Employee Wellness Session',
    'Mindfulness Coaching - 45 mins',
    'Group Therapy - 60 mins'
  ]

  const validateForm = () => {
    const newErrors = {}
    
    if (!fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = 'Valid email is required'
    if (!phone.trim()) newErrors.phone = 'Phone number is required'
    if (!therapyType) newErrors.therapyType = 'Therapy type is required'
    if (!preferredDate) newErrors.preferredDate = 'Preferred date is required'
    if (!preferredTime) newErrors.preferredTime = 'Preferred time is required'
    if (!paymentMethod) newErrors.paymentMethod = 'Payment method is required'
    if (!amountPaid) newErrors.amountPaid = 'Amount paid is required'
    if (!agreeToTerms) newErrors.agreeToTerms = 'You must agree to terms and conditions'
    if (!agreeToTherapy) newErrors.agreeToTherapy = 'You must consent to therapy'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Prevent past dates and fetch available slots when a date is selected
  const handleDateChange = async (val) => {
    // disallow past dates by comparing YYYY-MM-DD strings (avoids timezone drift)
    const todayStr = new Date().toISOString().slice(0,10)
    if (val < todayStr) {
      setErrors(e => ({ ...e, preferredDate: 'Cannot select a past date' }))
      setPreferredDate('')
      return
    }
    setPreferredDate(val)
    setErrors(e => ({ ...e, preferredDate: null }))

    // fetch available slots for therapistId if present
    const idToUse = therapistId || therapistFetchedId
    if (idToUse) {
      setLoadingSlots(true)
      try {
        // normalize API base so it always includes /api
        let api = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
        if (!api.endsWith('/api')) api = api.replace(/\/+$/, '') + '/api'
        const duration = sessionDuration || 60
        const res = await fetch(`${api}/availability/public/${idToUse}?date=${val}&duration=${duration}`)
        if (res.ok) {
          const data = await res.json()
          // normalize slots: support both array of strings and array of objects {label, start, end}
          const raw = data.slots || []
          const normalized = raw.map(s => {
            if (typeof s === 'string') return { label: s, start: null, end: null }
            return { label: s.label || s.time || '', start: s.start || null, end: s.end || null }
          })
          setAvailableSlots(normalized)
          // if there's exactly one slot, auto-select it for convenience
          if (normalized.length === 1) {
            const only = normalized[0]
            setPreferredTime(only.label || '')
            setScheduledAtISO(only.start || '')
          }
          setAvailableSlotsTz(data.timezone || 'UTC')
        } else {
          setAvailableSlots([])
          setAvailableSlotsTz('UTC')
        }
      } catch (err) {
        console.error('Failed to load slots', err)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
  }

  // If we fetched a therapist id after the user already selected a date, fetch slots for that therapist
  useEffect(() => {
    if (!preferredDate) return
    // if therapistFetchedId just became available and there's no route therapistId, refresh slots
    if (!therapistId && therapistFetchedId) {
      handleDateChange(preferredDate)
    }
  }, [therapistFetchedId, therapistId, preferredDate])

  // Load therapist info for display and for single-therapist fallback
  useEffect(() => {
    async function loadTherapist() {
      setTherapistLoading(true)
      try {
        const api = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
        if (therapistId) {
          const res = await fetch(`${api}/users/${therapistId}`)
          if (res.ok) {
            const t = await res.json()
            setTherapistName(t.name || '')
            setTherapistEmail(t.email || '')
            setTherapistTimezone(t.timezone || '')
            setTherapistFetchedId(t._id || therapistId)
          }
        } else {
          const res = await fetch(`${api}/users?role=therapist`)
          if (res.ok) {
            const data = await res.json()
            const therapists = Array.isArray(data) ? data.filter(Boolean) : []
            setTherapistOptions(therapists)
            if (therapists.length > 0) {
              const first = therapists[0]
              setTherapistName(first.name || '')
              setTherapistEmail(first.email || '')
              setTherapistTimezone(first.timezone || '')
              setTherapistFetchedId(first._id || '')
            }
          }
        }
      } catch (err) {
        console.error('Failed to load therapist info', err)
      }
      setTherapistLoading(false)
    }
    loadTherapist()
  }, [therapistId])

  const handleTherapistChange = (id) => {
    if (!id) return
    const selected = therapistOptions.find(t => t._id === id)
    if (selected) {
      setTherapistFetchedId(selected._id)
      setTherapistName(selected.name || '')
      setTherapistEmail(selected.email || '')
      setTherapistTimezone(selected.timezone || '')
    } else {
      setTherapistFetchedId(id)
    }
  }

  // Listen for availability updates via socket and refresh slots when changed
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:4000')
    const socket = ioClient(socketUrl)
    socket.on('connect', () => {})
    socket.on('availability:updated', (payload) => {
      try {
        if (!payload) return
        const idToWatch = therapistId || therapistFetchedId
        if (payload.therapistId && idToWatch && payload.therapistId === idToWatch) {
          if (preferredDate) handleDateChange(preferredDate)
        }
      } catch (err) {
        console.error('availability socket handler error', err)
      }
    })
    return () => socket.disconnect()
  }, [therapistId, therapistFetchedId, preferredDate])

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!validateForm()) {
      alert('Please fill in all required fields correctly')
      return
    }

    setLoading(true)
    try {
      // Generate booking ID
      const generatedBookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      setBookingId(generatedBookingId)

      const bookingData = {
        bookingId: generatedBookingId,
        client: {
          fullName,
          email,
          phone,
          preferredContact
        },
        session: {
          therapyType,
          sessionDuration,
          preferredDate,
          preferredTime,
          // if we have an ISO start from the availability API, include it for precise scheduling
          scheduledAt: scheduledAtISO || undefined,
          timezone,
          mode: sessionMode,
          note: bookingNote
        },
        payment: {
          method: paymentMethod,
          amountPaid: parseFloat(amountPaid)
        },
        // server expects a boolean consent flag; ensure both required consents are true
        consent: Boolean(agreeToTerms && agreeToTherapy),
        subscribeUpdates: Boolean(subscribeUpdates),
        status: 'pending',
        createdAt: new Date().toISOString()
      }

      // Submit booking to backend
      const res = await post('/bookings/guest-booking', bookingData)

      if (res && (res.success || res._id || res.bookingId)) {
        setSubmitted(true)
        // Auto-scroll to confirmation
        setTimeout(() => window.scrollTo(0, 0), 100)
      } else {
        // Defensive: server may return HTML (error page). Strip HTML tags for user-friendly alert and log raw response.
        console.error('Booking submission failed, server response:', res)
        let userMessage = 'Booking submission failed. Please try again later.'
        if (res && typeof res.message === 'string') {
          // remove HTML tags if present
          const stripped = res.message.replace(/<[^>]*>/g, '').trim()
          if (stripped) userMessage = stripped.slice(0, 800)
        }
        alert(userMessage)
      }
    } catch (err) {
      console.error('Booking error:', err)
      alert('Error submitting booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background-dark font-display text-white p-4">
        <div className="max-w-2xl mx-auto pt-20">
          {/* Success Message */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-2 border-green-500/50 rounded-2xl p-8 mb-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4 text-white">Booking Request Submitted!</h1>
            <p className="text-lg text-secondary-text mb-6">
              Thank you for your booking! Our admin team will verify your payment and confirm your session shortly.
            </p>
            
            {/* Booking ID */}
            <div className="bg-black/30 rounded-lg p-6 mb-8 border border-white/10">
              <p className="text-secondary-text text-sm mb-2">Your Booking ID</p>
              <p className="text-2xl font-bold text-highlight mb-4">{bookingId}</p>
              <p className="text-xs text-secondary-text">Keep this ID for your records and communication with admin</p>
            </div>

            {/* Contact Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <p className="text-sm font-semibold mb-2 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">mail</span>
                  Email
                </p>
                <p className="text-primary font-bold">admin@happinesstherapy.com</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <p className="text-sm font-semibold mb-2 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">whatsapp</span>
                  WhatsApp
                </p>
                <p className="text-primary font-bold">+1 (555) 123-4567</p>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">info</span>
                Payment Details
              </h3>
              
              {paymentMethod === 'mpesa' && (
                <div className="space-y-3">
                  <p className="text-secondary-text"><strong>M-Pesa:</strong> Send to Till Number</p>
                  <div className="bg-black/40 rounded p-3 border border-blue-400/30">
                    <p className="text-2xl font-bold text-highlight font-mono">897654</p>
                  </div>
                  <p className="text-sm text-secondary-text">Amount: KES {amountPaid}</p>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="space-y-3">
                  <p className="text-secondary-text"><strong>Bank Transfer:</strong></p>
                  <div className="space-y-2 text-sm">
                    <div><strong>Bank Name:</strong> Example Bank</div>
                    <div><strong>Account Number:</strong> 1234567890</div>
                    <div><strong>Account Name:</strong> Happiness Therapy Ltd</div>
                    <div><strong>Swift Code:</strong> EXBKUS33</div>
                  </div>
                  <p className="text-sm text-secondary-text mt-3">Amount: USD {amountPaid}</p>
                </div>
              )}

              {paymentMethod === 'paypal' && (
                <div className="space-y-3">
                  <p className="text-secondary-text"><strong>PayPal:</strong></p>
                  <p className="font-bold text-primary">admin@happinesstherapy.com</p>
                  <p className="text-sm text-secondary-text">Amount: USD {amountPaid}</p>
                </div>
              )}

              {paymentMethod === 'other' && (
                <p className="text-secondary-text">Please contact admin for payment instructions</p>
              )}
            </div>

            {/* Booking Summary */}
            <div className="bg-black/30 rounded-lg p-6 mb-8 text-left border border-white/10">
              <h3 className="text-lg font-bold mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-text">Therapy Type:</span>
                  <span className="font-semibold">{therapyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-text">Date:</span>
                  <span className="font-semibold">{preferredDate} @ {preferredTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-text">Timezone:</span>
                  <span className="font-semibold">{timezone}</span>
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Amount:</span>
                  <span className="text-highlight font-bold">${amountPaid}</span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-primary/20 border border-primary/50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">task_alt</span>
                What Happens Next
              </h3>
              <ol className="text-left space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="bg-primary text-black font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</span>
                  <span>Admin receives and verifies your payment</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-black font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</span>
                  <span>You'll receive a confirmation via {preferredContact.charAt(0).toUpperCase() + preferredContact.slice(1)}</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-black font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</span>
                  <span>Therapist details and session link will be sent 24 hours before your session</span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-lg bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all"
              >
                Back to Home
              </button>
              <button
                onClick={() => navigate('/services')}
                className="flex-1 py-3 rounded-lg bg-primary text-black font-bold hover:bg-blue-500 transition-all"
              >
                Browse More Sessions
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-dark font-display text-white p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-2">Book Your Therapy Session</h1>
          <p className="text-secondary-text text-lg">Complete the form below to request your booking</p>
          {(therapistLoading) ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="h-4 w-40 bg-white/10 animate-pulse rounded" />
              <div className="h-4 w-24 bg-white/8 animate-pulse rounded" />
            </div>
          ) : (therapistName || therapistId) && (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <p className="text-sm text-primary">Therapist: <span className="font-semibold text-white">{therapistName || 'Assigned Therapist'}</span>{therapistId ? (<span className="text-xs text-secondary-text"> &nbsp; (ID: {therapistId})</span>) : null}</p>
              {therapistTimezone && (
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-xs rounded-full px-3 py-1 w-max">
                  <span className="font-mono text-xs text-white">{therapistTimezone}</span>
                </div>
              )}
            </div>
          )}
          {!therapistId && therapistOptions.length > 1 && (
            <div className="mt-4 max-w-sm">
              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Choose a therapist *</span>
                <select
                  value={therapistFetchedId}
                  onChange={e => {
                    handleTherapistChange(e.target.value)
                    if (preferredDate) {
                      setTimeout(() => handleDateChange(preferredDate), 0)
                    }
                  }}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50"
                >
                  {therapistOptions.map(option => (
                    <option key={option._id} value={option._id} className="bg-background-dark text-white">
                      {option.name || option.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Client Information */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">person</span>
              Client Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Full Name *</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className={`bg-white/10 border ${errors.fullName ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50`}
                />
                {errors.fullName && <span className="text-red-400 text-xs mt-1">{errors.fullName}</span>}
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Email Address *</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`bg-white/10 border ${errors.email ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50`}
                />
                {errors.email && <span className="text-red-400 text-xs mt-1">{errors.email}</span>}
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Phone Number (WhatsApp Preferred) *</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className={`bg-white/10 border ${errors.phone ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50`}
                />
                {errors.phone && <span className="text-red-400 text-xs mt-1">{errors.phone}</span>}
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Preferred Contact Method *</span>
                <select
                  value={preferredContact}
                  onChange={e => setPreferredContact(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50"
                >
                  <option value="email" className="bg-background-dark text-white">Email</option>
                  <option value="whatsapp" className="bg-background-dark text-white">WhatsApp</option>
                  <option value="call" className="bg-background-dark text-white">Phone Call</option>
                </select>
              </label>
            </div>
          </div>

          {/* Section 2: Session Details */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">event</span>
              Session Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Therapy Type *</span>
                {selectedService ? (
                  <select
                    value={therapyType}
                    disabled
                    className={`bg-white/10 border ${errors.therapyType ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 cursor-not-allowed`}
                  >
                    <option value={therapyType}>{therapyType}</option>
                  </select>
                ) : (
                  <select
                    value={therapyType}
                    onChange={e => setTherapyType(e.target.value)}
                    className={`bg-white/10 border ${errors.therapyType ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50`}
                  >
                    <option value="">Select a therapy type</option>
                    {therapyTypes.map(type => (
                      <option key={type} value={type} className="bg-background-dark text-white">{type}</option>
                    ))}
                  </select>
                )}
                {errors.therapyType && <span className="text-red-400 text-xs mt-1">{errors.therapyType}</span>}
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Session Duration</span>
                <input
                  type="text"
                  value={sessionDuration}
                  disabled
                  placeholder="Auto-filled from therapy type"
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white/50 cursor-not-allowed"
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Preferred Session Date *</span>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={e => handleDateChange(e.target.value)}
                  min={new Date().toISOString().slice(0,10)}
                  className={`bg-white/10 border ${errors.preferredDate ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50`}
                />
                {errors.preferredDate && <span className="text-red-400 text-xs mt-1">{errors.preferredDate}</span>}
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Preferred Session Time *</span>
                {/* Show loader, timezone header, no-slots message, or the select/input */}
                <div className="mb-2">
                  {loadingSlots ? (
                    <div className="text-sm text-secondary-text flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin">hourglass_empty</span>
                      <span>Loading available slots...</span>
                    </div>
                  ) : preferredDate ? (
                    availableSlots && availableSlots.length > 0 ? (
                      <div className="text-sm text-secondary-text">Available slots (Therapist timezone: <span className="font-semibold text-white">{availableSlotsTz}</span>)</div>
                    ) : (
                      <div className="text-sm text-yellow-300">No available slots for <span className="font-semibold text-white">{therapistName || 'this therapist'}</span> on this date. Try another date or contact support.</div>
                    )
                  ) : null}
                </div>

                {availableSlots && availableSlots.length > 0 ? (
                  <select
                    value={preferredTime}
                    onChange={e => {
                      const val = e.target.value
                      // selected value will be either a label or ISO; we store label for display and scheduledAtISO for exact iso
                      const found = availableSlots.find(s => (s.start === val || s.label === val || s.start === val))
                      if (found) {
                        setPreferredTime(found.label)
                        setScheduledAtISO(found.start || '')
                      } else {
                        setPreferredTime(val)
                        setScheduledAtISO('')
                      }
                    }}
                    className={`bg-white/10 border ${errors.preferredTime ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50`}
                  >
                    <option value="">Select an available time</option>
                    {availableSlots.map(slot => (
                      <option key={slot.start || slot.label} value={slot.start || slot.label}>{slot.label} ({availableSlotsTz})</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="time"
                      value={preferredTime}
                      onChange={e => { setPreferredTime(e.target.value); setScheduledAtISO('') }}
                      disabled={!allowManualTime}
                      placeholder={allowManualTime ? 'Select a time' : 'No available slots'}
                      className={`bg-white/10 border ${errors.preferredTime ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white ${allowManualTime ? 'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50' : 'opacity-60 cursor-not-allowed'}`}
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAllowManualTime(m => !m)}
                        className={`text-sm rounded px-3 py-2 ${allowManualTime ? 'bg-red-600' : 'bg-primary'} text-white`}
                      >
                        {allowManualTime ? 'Disable manual time' : 'Request custom time'}
                      </button>
                      {!allowManualTime && (
                        <p className="text-xs text-yellow-300">No available slots for <span className="font-semibold text-white">{therapistName || 'this therapist'}</span>. You can request a custom time.</p>
                      )}
                    </div>
                  </div>
                )}
                {errors.preferredTime && <span className="text-red-400 text-xs mt-1">{errors.preferredTime}</span>}
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Timezone</span>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz} className="bg-background-dark text-white">{tz}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Session Mode *</span>
                <select
                  value={sessionMode}
                  onChange={e => setSessionMode(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50"
                >
                  <option value="online" className="bg-background-dark text-white">Online (Audio Only)</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col mt-6">
              <span className="text-sm font-semibold text-secondary-text mb-2">Reason for Booking / Short Note</span>
              <textarea
                value={bookingNote}
                onChange={e => setBookingNote(e.target.value)}
                placeholder="E.g., struggling with anxiety, need relationship counseling, etc."
                rows="4"
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </label>
          </div>

          {/* Section 3: Payment Details */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">payment</span>
              Payment Details (Manual)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Payment Method *</span>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className={`bg-white/10 border ${errors.paymentMethod ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50`}
                >
                  <option value="paypal" className="bg-background-dark text-white">PayPal</option>
                  <option value="mpesa" className="bg-background-dark text-white">M-Pesa</option>
                  <option value="bank" className="bg-background-dark text-white">Bank Transfer</option>
                  <option value="other" className="bg-background-dark text-white">Other</option>
                </select>
                {errors.paymentMethod && <span className="text-red-400 text-xs mt-1">{errors.paymentMethod}</span>}
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-semibold text-secondary-text mb-2">Amount Paid ($) *</span>
                <input
                  type="number"
                  value={amountPaid}
                  disabled
                  placeholder="0.00"
                  step="0.01"
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white/70 cursor-not-allowed"
                />
                <p className="text-xs text-secondary-text mt-2">Auto-populated from selected therapy type</p>
              </label>
            </div>

            {/* Payment Instructions Info */}
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>ℹ️ Note:</strong> Payment instructions will be displayed after you submit this form.
              </p>
            </div>
          </div>

          {/* Section 4: Confirmation & Consent */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">verified</span>
              Confirmation & Consent
            </h2>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer hover:bg-white/5 p-3 rounded-lg transition">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={e => setAgreeToTerms(e.target.checked)}
                  className="w-5 h-5 rounded mt-1 accent-primary"
                />
                <span className="text-sm">
                  I agree to the <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-primary hover:underline">Terms and Conditions</button> *
                </span>
              </label>
              {errors.agreeToTerms && <span className="text-red-400 text-xs">{errors.agreeToTerms}</span>}

              <label className="flex items-start gap-3 cursor-pointer hover:bg-white/5 p-3 rounded-lg transition">
                <input
                  type="checkbox"
                  checked={agreeToTherapy}
                  onChange={e => setAgreeToTherapy(e.target.checked)}
                  className="w-5 h-5 rounded mt-1 accent-primary"
                />
                <span className="text-sm">
                  I consent to therapy and understand this is not emergency medical care. In case of crisis, please call emergency services. <button type="button" onClick={() => setShowConsentModal(true)} className="text-primary hover:underline">Read more</button> *
                </span>
              </label>
              {errors.agreeToTherapy && <span className="text-red-400 text-xs">{errors.agreeToTherapy}</span>}

              <label className="flex items-start gap-3 cursor-pointer hover:bg-white/5 p-3 rounded-lg transition">
                <input
                  type="checkbox"
                  checked={subscribeUpdates}
                  onChange={e => setSubscribeUpdates(e.target.checked)}
                  className="w-5 h-5 rounded mt-1 accent-primary"
                />
                <span className="text-sm text-secondary-text">
                  Subscribe to updates, reminders, and wellness tips
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/services')}
              className="flex-1 py-4 rounded-lg border border-white/20 text-white font-bold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 rounded-lg bg-gradient-to-r from-primary to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">hourglass_empty</span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Submit Booking Request
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-secondary-text">
            * Required fields
          </p>
        </form>

        {/* Consent & Privacy Modals */}
        <ConsentModal
          open={showPrivacyModal}
          title="Privacy Policy"
          content={`<h4>Privacy & Data Use</h4><p>We collect your name, email and phone to process bookings and contact you about your session. We do not share your personal data with third parties except for payment processing and therapist matching. Data is stored securely in our database for service delivery and regulatory needs.</p><p>If you wish to delete your data, contact admin@happinesstherapy.com and we will respond within 30 days.</p>`}
          onClose={() => setShowPrivacyModal(false)}
          onAccept={() => setAgreeToTerms(true)}
        />

        <ConsentModal
          open={showConsentModal}
          title="Informed Consent for Therapy"
          content={`<h4>Informed Consent</h4><p>By consenting you acknowledge that therapy sessions are not emergency services. If you are in crisis, call your local emergency number immediately.</p><p>You agree to attend scheduled sessions or provide notice for rescheduling. You consent to the therapist providing clinical care and documentation of the session.</p>`}
          onClose={() => setShowConsentModal(false)}
          onAccept={() => setAgreeToTherapy(true)}
        />

      </div>
    </div>
  )
}
