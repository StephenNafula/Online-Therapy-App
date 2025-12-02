import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AudioCallComponent({ booking, token, userRole }) {
  const navigate = useNavigate();
  const [callActive, setCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  const startCall = async () => {
    try {
      // Generate secure call link
      const callLink = `${window.location.origin}/secure-call/${booking._id}/${Math.random().toString(36).substr(2, 12)}`;

      // For therapist: start the call
      if (userRole === 'therapist') {
        setCallActive(true);
        setCallStartTime(new Date());

        // Optionally: Update booking with call start info
        // Optionally: Update booking with call start info
        await fetch(`${API}/bookings/${booking._id}/start-call`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({})
        });

        // Join the room
        navigate(`/meeting/${booking.roomId}`);
      }
    } catch (err) {
      console.error('Error starting call', err);
      alert('Failed to start call');
    }
  };

  const endCall = async () => {
    try {
      const duration = callStartTime ? Math.round((new Date() - callStartTime) / 1000) : 0;
      setCallActive(false);
      setCallDuration(duration);

      // Update booking with call end info
      await fetch(`${API}/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          callEndedAt: new Date(),
          callDuration: duration
        })
      });

      alert(`Call ended. Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    } catch (err) {
      console.error('Error ending call', err);
    }
  };

  if (callActive) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-red-400">Call in Progress</p>
            <p className="text-sm text-secondary-text">Started: {callStartTime?.toLocaleTimeString()}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/meeting/${booking.roomId}`)}
              className="px-4 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20"
            >
              Join Room
            </button>
            <button
              onClick={endCall}
              className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600"
            >
              End Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-primary">Secure Audio Call</p>
          <p className="text-sm text-secondary-text">Ready to connect with client</p>
        </div>
        <button
          onClick={startCall}
          className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-500"
        >
          Start Secure Call
        </button>
      </div>
    </div>
  );
}
