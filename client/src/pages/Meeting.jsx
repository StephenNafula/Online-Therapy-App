import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'

// Simple Audio Visualizer Component
const AudioVisualizer = ({ stream, isLocal, muted }) => {
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const [volume, setVolume] = useState(0)
  const requestRef = useRef(null)

  useEffect(() => {
    if (!stream || muted) {
      setVolume(0)
      return
    }

    const initAudio = async () => {
      try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }

        const ctx = audioContextRef.current
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }

        analyserRef.current = ctx.createAnalyser()
        analyserRef.current.fftSize = 256

        // Create source from stream
        try {
          sourceRef.current = ctx.createMediaStreamSource(stream)
          sourceRef.current.connect(analyserRef.current)
        } catch (e) {
          console.warn("Error creating media stream source", e)
          return
        }

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const updateVolume = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)

          // Calculate average volume
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
          }
          const avg = sum / bufferLength

          // Normalize to 0-1 range roughly
          const normalized = Math.min(avg / 50, 1.5)
          setVolume(normalized)

          requestRef.current = requestAnimationFrame(updateVolume)
        }

        updateVolume()
      } catch (err) {
        console.error('Audio context error:', err)
      }
    }

    initAudio()

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      // Do not close the context immediately on unmount to prevent "closed" errors if rapid re-mounts happen
      // Instead, just disconnect nodes.
      if (sourceRef.current) {
        try { sourceRef.current.disconnect() } catch (e) { }
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect() } catch (e) { }
      }
    }
  }, [stream, muted])

  // Dynamic styles based on volume
  const scale = 1 + (volume * 0.5)
  const opacity = 0.3 + (volume * 0.7)

  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple Effects */}
      <div
        className="absolute rounded-full bg-primary/30 transition-all duration-75 ease-out"
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${1 + volume})`,
          opacity: volume * 0.5
        }}
      />
      <div
        className="absolute rounded-full bg-primary/20 transition-all duration-100 ease-out delay-75"
        style={{
          width: '120%',
          height: '120%',
          transform: `scale(${1 + volume * 1.5})`,
          opacity: volume * 0.3
        }}
      />

      {/* Avatar Circle */}
      <div
        className={`relative z-10 rounded-full bg-gray-800 border-4 ${isLocal ? 'border-gray-600 w-16 h-16 sm:w-24 sm:h-24' : 'border-primary w-36 h-36 sm:w-48 sm:h-48'} flex items-center justify-center shadow-2xl transition-transform duration-100`}
        style={{ transform: `scale(${scale})` }}
      >
        <span className={`material-symbols-outlined ${isLocal ? 'text-4xl' : 'text-7xl'} ${muted ? 'text-red-400' : 'text-white'}`}>
          {muted ? 'mic_off' : 'person'}
        </span>
      </div>
    </div>
  )
}

export default function Meeting() {
  const params = useParams()
  // Support multiple param names so links that use `bookingId` or `roomId` both work
  const roomId = params.roomId || params.bookingId || params.room || params.id
  const navigate = useNavigate()

  // Refs
  const localStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const pcRef = useRef(null)
  const socketRef = useRef(null)
  const candidatesQueue = useRef([])
  const makingOffer = useRef(false)

  // State
  const [connected, setConnected] = useState(false)
  const [isTherapist, setIsTherapist] = useState(false)
  const [error, setError] = useState('')
  const [micEnabled, setMicEnabled] = useState(true)
  const [remoteMuted, setRemoteMuted] = useState(false)
  const [status, setStatus] = useState('Connecting...')
  const [participantName, setParticipantName] = useState('Waiting for peer...')

  // Advanced Mute State
  const [forceMuted, setForceMuted] = useState(false) // Client side: am I force muted?
  const [remoteForcedMuted, setRemoteForcedMuted] = useState(false) // Therapist side: did I force mute client?

  // Stream State for Visualizers
  const [localStreamForViz, setLocalStreamForViz] = useState(null)
  const [remoteStreamForViz, setRemoteStreamForViz] = useState(null)
  const [joinedViaLink, setJoinedViaLink] = useState(false)

  const socketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:4000')

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
    setIsTherapist(storedUser && storedUser.role === 'therapist')

    // Support tokens in the query parameter (secure link) — useful for guest links opened on other devices
    const queryToken = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('token') : null
    const SESSION_TOKEN_KEY = 'stitch_session_token'
    // Prefer: query token -> session token -> local storage token
    const token = queryToken || sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem('token')

    // If queryToken exists, persist it temporarily in sessionStorage so it is available for handshake but not kept across devices/browsers
    if (queryToken) {
      try { sessionStorage.setItem(SESSION_TOKEN_KEY, queryToken) } catch (e) { console.warn('Could not set token in sessionStorage', e) }
      // if the user didn't have a local token already, show that they joined via link
      if (!localStorage.getItem('token')) setJoinedViaLink(true)
    }

    // Allow guest access - do not enforce token check

    async function start() {
      try {
        setStatus('Accessing microphone...')
        let stream = null
        try {
          // Audio only, with echo cancellation
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          })
        } catch (err) {
          console.warn('Failed to get audio', err)
          setError('Microphone access denied or not found. You can listen only.')
        }

        if (stream) {
          localStreamRef.current = stream
          setLocalStreamForViz(stream) // Trigger local visualizer
        }

        setStatus('Connecting to server...')
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
        pcRef.current = pc

        if (stream) {
          stream.getTracks().forEach(t => pc.addTrack(t, stream))
        }

        pc.ontrack = ev => {
          if (ev.streams && ev.streams[0]) {
            // Play remote audio
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = ev.streams[0]
            }
            // Set for visualizer
            setRemoteStreamForViz(ev.streams[0])
            setParticipantName(isTherapist ? 'Client' : 'Therapist')
          }
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setStatus('Connected')
            setConnected(true)
          } else if (pc.connectionState === 'disconnected') {
            setStatus('Disconnected')
            setConnected(false)
            setParticipantName('Peer disconnected')
            setRemoteStreamForViz(null)
          }
        }

        const socket = io(socketUrl, { auth: { token } })
        socketRef.current = socket

        socket.on('connect', () => {
          setStatus('Waiting for peer to join...')
          socket.emit('join-room', roomId)
        })

        socket.on('peer-joined', async () => {
          setStatus('Peer joined, establishing connection...')
          makingOffer.current = true
          try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            socket.emit('signal', { room: roomId, data: { type: 'offer', sdp: offer.sdp } })
          } catch (err) {
            console.error('Error creating offer:', err)
          } finally {
            makingOffer.current = false
          }
        })

        socket.on('peer-left', () => {
          setConnected(false)
          setStatus('Peer left the room')
          setParticipantName('Waiting for peer...')
          setRemoteStreamForViz(null)
        })

        socket.on('signal', async ({ data }) => {
          if (!data) return
          try {
            if (data.type === 'offer') {
              if (makingOffer.current || pc.signalingState !== 'stable') {
                if (pc.signalingState !== 'stable') {
                  console.warn('Glare detected. Ignoring offer for now or handling collision.')
                  return
                }
              }

              await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              socket.emit('signal', { room: roomId, data: { type: 'answer', sdp: answer.sdp } })

              // Process queued candidates
              while (candidatesQueue.current.length) {
                const candidate = candidatesQueue.current.shift()
                try {
                  await pc.addIceCandidate(candidate)
                } catch (e) {
                  console.error('Error adding queued candidate', e)
                }
              }

            } else if (data.type === 'answer') {
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })

                // Process queued candidates
                while (candidatesQueue.current.length) {
                  const candidate = candidatesQueue.current.shift()
                  try {
                    await pc.addIceCandidate(candidate)
                  } catch (e) {
                    console.error('Error adding queued candidate', e)
                  }
                }
              }
            } else if (data.type === 'ice') {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(data.candidate)
                } catch (err) {
                  console.warn('Error adding ICE candidate', err)
                }
              } else {
                // Queue candidate
                candidatesQueue.current.push(data.candidate)
              }
            } else if (data.type === 'end-call') {
              alert('The call has been ended.')
              pc.close()
              navigate('/app/dashboard')
            } else if (data.type === 'mute') {
              setRemoteMuted(!!data.muted)
            } else if (data.type === 'force-mute') {
              // Received force mute command
              setForceMuted(true)
              setMicEnabled(false)
              if (localStreamRef.current) {
                const audioTrack = localStreamRef.current.getAudioTracks()[0]
                if (audioTrack) audioTrack.enabled = false
              }
              // Notify peer that I am muted
              socket.emit('signal', { room: roomId, data: { type: 'mute', muted: true } })
              alert('You have been muted by the therapist.')
            } else if (data.type === 'force-unmute') {
              // Received force unmute command (permission to speak)
              setForceMuted(false)
              // We don't auto-unmute, just allow them to unmute
              alert('You have been unmuted by the therapist. You can now speak.')
            }
          } catch (err) {
            console.error('Signaling error:', err)
          }
        })

        pc.onicecandidate = e => {
          if (e.candidate) socket.emit('signal', { room: roomId, data: { type: 'ice', candidate: e.candidate } })
        }

      } catch (err) {
        console.error(err)
        setError(err.message || 'Could not start audio')
        setStatus('Error')
      }
    }

    start()

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-room', roomId)
        socketRef.current.disconnect()
      }
      if (pcRef.current) pcRef.current.close()
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop())
      setLocalStreamForViz(null)
      setRemoteStreamForViz(null)
      // remove any transient session token created from a secure link to avoid leaving credentials on shared devices
      try {
        const SESSION_TOKEN_KEY = 'stitch_session_token'
        const currentQueryToken = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('token') : null
        if (currentQueryToken && sessionStorage.getItem(SESSION_TOKEN_KEY) === currentQueryToken) {
          sessionStorage.removeItem(SESSION_TOKEN_KEY)
        }
      } catch (e) { /* noop */ }
    }
  }, [roomId, isTherapist, navigate])

  const toggleMic = () => {
    if (forceMuted) {
      alert('You cannot unmute yourself while muted by the therapist.')
      return
    }
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setMicEnabled(audioTrack.enabled)
        // Signal mute state to peer
        if (socketRef.current) {
          socketRef.current.emit('signal', { room: roomId, data: { type: 'mute', muted: !audioTrack.enabled } })
        }
      }
    }
  }

  const toggleForceMute = () => {
    if (!isTherapist || !socketRef.current) return

    const newForceMutedState = !remoteForcedMuted
    setRemoteForcedMuted(newForceMutedState)

    socketRef.current.emit('signal', {
      room: roomId,
      data: { type: newForceMutedState ? 'force-mute' : 'force-unmute' }
    })
  }

  const endCall = () => {
    if (socketRef.current) {
      if (isTherapist) {
        // Therapist ends for everyone
        socketRef.current.emit('signal', { room: roomId, data: { type: 'end-call' } })
      } else {
        // Client just leaves
        socketRef.current.emit('leave-room', roomId)
      }
      navigate('/app/dashboard')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gray-800/50 backdrop-blur border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h1 className="text-lg font-semibold tracking-wide">Secure Audio Session</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const link = `${window.location.origin}/meeting/${roomId}`
              navigator.clipboard.writeText(link)
              alert('Meeting link copied to clipboard!')
            }}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">link</span>
            Copy Link
          </button>
          <div className="text-sm text-gray-400 bg-black/20 px-3 py-1 rounded-full border border-white/5">
            {status}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 gap-12">
        {error && !status.includes('Connected') && !status.includes('Waiting') ? (
          <div className="text-center max-w-md p-8 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-4">error</span>
            <p className="text-red-200">{error}</p>
            <button onClick={() => navigate('/app/dashboard')} className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors">
              Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            {joinedViaLink && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-sm text-yellow-300">
                <p className="text-sm">You joined via a secure link. Your session token is temporary.</p>
              </div>
            )}
            {/* Remote Participant (Main) */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <AudioVisualizer stream={remoteStreamForViz} isLocal={false} muted={remoteMuted} />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white/90">{participantName}</h2>
                <div className="flex flex-col items-center gap-2 mt-2">
                  {remoteMuted && (
                    <span className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                      <span className="material-symbols-outlined text-sm">mic_off</span>
                      Muted
                    </span>
                  )}
                  {isTherapist && connected && (
                    <button
                      onClick={toggleForceMute}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${remoteForcedMuted
                          ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                          : 'bg-transparent text-gray-400 border-gray-600 hover:border-white hover:text-white'
                        }`}
                    >
                      {remoteForcedMuted ? 'Unmute Client' : 'Force Mute Client'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Local Participant (Small Indicator) */}
            <div className="absolute bottom-8 right-8 flex flex-col items-center gap-2">
              <AudioVisualizer stream={localStreamForViz} isLocal={true} muted={!micEnabled} />
              <span className="text-xs font-medium text-gray-400">You {micEnabled ? '' : '(Muted)'}</span>
              {forceMuted && (
                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded">Force Muted</span>
              )}
            </div>
          </>
        )}
      </main>

      {/* Control Bar */}
      <footer className="h-20 sm:h-24 bg-gray-800/50 backdrop-blur border-t border-white/10 flex items-center justify-center gap-4 sm:gap-6 z-10">
        <button
          onClick={toggleMic}
          disabled={forceMuted}
          className={`p-6 rounded-full transition-all duration-200 flex items-center justify-center ${micEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : forceMuted
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
            }`}
          title={forceMuted ? 'Muted by Therapist' : (micEnabled ? 'Mute Microphone' : 'Unmute Microphone')}
        >
          <span className="material-symbols-outlined text-3xl">{micEnabled ? 'mic' : 'mic_off'}</span>
        </button>

        <button
          onClick={endCall}
          className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg shadow-red-600/20 transition-all duration-200 flex items-center gap-3"
        >
          <span className="material-symbols-outlined text-2xl">call_end</span>
          <span className="text-lg">{isTherapist ? 'End Session' : 'Leave'}</span>
        </button>
      </footer>

      {/* Hidden Audio Element for Remote Stream ONLY */}
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  )
}
