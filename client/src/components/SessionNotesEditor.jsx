import React, { useState } from 'react';

export default function SessionNotesEditor({ booking, token }) {
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  const loadNotes = async () => {
    try {
      const res = await fetch(`${API}/session-notes/${booking._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.content || '');
      }
    } catch (err) {
      console.error('Failed to load notes', err);
    }
  };

  React.useEffect(() => {
    loadNotes();
  }, [booking._id]);

  const handleSaveNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/session-notes/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: notes })
      });
      if (res.ok) {
        setIsEditing(false);
        alert('Notes saved securely (encrypted)');
      } else {
        alert('Failed to save notes');
      }
    } catch (err) {
      console.error('Error saving notes', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">description</span>
        Private Session Notes (Encrypted)
      </h3>

      {!isEditing ? (
        <div>
          <div className="bg-white/5 rounded-lg p-4 min-h-[150px] text-secondary-text whitespace-pre-wrap">
            {notes || 'No notes yet. Click Edit to add notes.'}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-500"
          >
            Edit Notes
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write private session notes here. They are encrypted for HIPAA compliance."
            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary min-h-[200px] resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSaveNotes}
              disabled={loading}
              className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Notes'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-secondary-text mt-2">🔒 Notes are encrypted and stored securely.</p>
        </div>
      )}
    </div>
  );
}
