import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'

export default function Meeting(){
  const { roomId } = useParams()
  const localStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const pcRef = useRef(null)
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [isTherapist, setIsTherapist] = useState(false)

  useEffect(()=>{
    // Determine role from stored user
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    setIsTherapist(user && user.role === 'therapist')

    async function start(){
      // get audio only
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      pcRef.current = pc

      // add local tracks
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      pc.ontrack = (ev) => {
        // attach first audio track to <audio>
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = ev.streams[0]
          remoteAudioRef.current.play().catch(()=>{})
        }
      }

      const socket = io('http://localhost:4000')
      socketRef.current = socket

      socket.on('connect', ()=>{
        socket.emit('join-room', roomId)
      })

      socket.on('peer-joined', async ({ socketId }) => {
        // create offer to the new peer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('signal', { room: roomId, data: { type: 'offer', sdp: offer.sdp } })
      })

      socket.on('signal', async ({ from, data }) => {
        if (data.type === 'offer'){
          await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('signal', { room: roomId, data: { type: 'answer', sdp: answer.sdp } })
        } else if (data.type === 'answer'){
          await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
        } else if (data.type === 'ice'){
          try { await pc.addIceCandidate(data.candidate) } catch(err){ console.warn(err) }
        }
      })

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { room: roomId, data: { type: 'ice', candidate: e.candidate } })
      }

      setConnected(true)
    }

    start().catch(err=>{ console.error(err); alert('Could not start audio: '+err.message) })

    return ()=>{
      if (socketRef.current) {
        socketRef.current.emit('leave-room', roomId)
        try { socketRef.current.disconnect() } catch(e){}
      }
      if (pcRef.current) pcRef.current.close()
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t=>t.stop())
    }
  }, [roomId])

  // Therapist admin controls
  function endCall(){
    // therapists can emit a room-wide event to ask clients to leave
    if (!isTherapist) return
    socketRef.current && socketRef.current.emit('signal', { room: roomId, data: { type: 'end-call' } })
    if (pcRef.current) pcRef.current.close()
  }

  useEffect(()=>{
    const socket = socketRef.current
    if (!socket) return
    const handler = ({ data }) => {
      if (!data) return
      if (data.type === 'end-call'){
        alert('Therapist ended the call')
        if (pcRef.current) pcRef.current.close()
      } else if (data.type === 'mute'){
        // therapists send mute events; clients should apply
        if (!isTherapist && remoteAudioRef.current) {
          remoteAudioRef.current.muted = !!data.muted
        }
      }
    }
    socket.on('signal', handler)
    return () => {
      socket.off('signal', handler)
    }
  }, [socketRef.current])

  return (
    <div>
      <h2>Meeting room: {roomId}</h2>
      <p>Audio-only session. No recording. Therapist has control options.</p>
      <audio ref={remoteAudioRef} autoPlay />
      <div style={{marginTop:10}}>
        {isTherapist && <button onClick={endCall}>End Call (therapist)</button>}
      </div>
    </div>
  )
}
