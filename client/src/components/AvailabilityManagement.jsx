import React, { useState } from 'react';

export default function AvailabilityManagement({ token, therapistId }) {
  const [slots, setSlots] = useState([]);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isRecurring, setIsRecurring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [specificDate, setSpecificDate] = useState('');

  // normalize API base so it always points to the server's `/api` prefix
  let API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  if (!API.endsWith('/api')) API = API.replace(/\/+$/, '') + '/api';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const loadSlots = async () => {
    try {
      const res = await fetch(`${API}/availability/my-availability`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSlots(await res.json());
      }
    } catch (err) {
      console.error('Failed to load slots', err);
    }
  };

  React.useEffect(() => {
    loadSlots();
  }, []);

  const handleAddSlot = async () => {
    if (!startTime || !endTime) {
      alert('Please fill in all fields');
      return;
    }
    if (!isRecurring && !specificDate) {
      alert('Please choose a specific date for one-time availability');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/availability/my-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dayOfWeek,
          startTime,
          endTime,
          isRecurring,
          specificDate: !isRecurring ? specificDate : undefined
        })
      });
      if (res.ok) {
        await loadSlots();
        setShowAddSlot(false);
        setSpecificDate('');
        alert('Availability slot added');
      } else {
        alert('Failed to add slot');
      }
    } catch (err) {
      console.error('Error adding slot', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!confirm('Delete this availability slot?')) return;
    try {
      const res = await fetch(`${API}/availability/my-availability/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await loadSlots();
        alert('Slot deleted');
      }
    } catch (err) {
      console.error('Error deleting slot', err);
    }
  };

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">schedule</span>
        Manage Your Availability
      </h3>

      <button
        onClick={() => setShowAddSlot(!showAddSlot)}
        className="mb-4 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-500"
      >
        {showAddSlot ? 'Cancel' : 'Add Available Slot'}
      </button>

      {showAddSlot && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 space-y-3">
          <label className="flex flex-col">
            <span className="text-sm font-semibold mb-1">Day of Week</span>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
            >
              {days.map((d, i) => (
                <option key={i} value={i} className="bg-background-dark">
                  {d}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col">
              <span className="text-sm font-semibold mb-1">Start Time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-semibold mb-1">End Time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
              />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => {
                setIsRecurring(e.target.checked);
                if (e.target.checked) setSpecificDate('');
              }}
              className="accent-primary"
            />
            <span className="text-sm">Recurring (every week)</span>
          </label>

          {!isRecurring && (
            <label className="flex flex-col">
              <span className="text-sm font-semibold mb-1">Specific Date</span>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
              />
            </label>
          )}

          <button
            onClick={handleAddSlot}
            disabled={loading}
            className="w-full bg-primary text-black font-bold py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Slot'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="font-semibold text-lg">Your Current Availability</h4>
        {slots.length === 0 ? (
          <p className="text-secondary-text">No availability slots yet. Add one above!</p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot._id}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-3"
              >
                <div>
                  <p className="font-semibold">
                    {slot.isRecurring ? days[slot.dayOfWeek] : (slot.specificDate ? new Date(slot.specificDate).toLocaleDateString() : 'One-time')}{' '}
                    {slot.startTime} - {slot.endTime}
                  </p>
                  <p className="text-xs text-secondary-text">
                    {slot.isAvailable ? 'Available' : 'Not available'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSlot(slot._id)}
                  className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
