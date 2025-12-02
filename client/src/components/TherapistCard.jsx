import React, { useState } from 'react'

export default function TherapistCard({ therapist, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{(therapist.name || '?').charAt(0)}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-lg">{therapist.name}</h4>
              <p className="text-sm text-secondary-text">{therapist.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setExpanded(e => !e)} className="text-sm px-2 py-1 rounded hover:bg-white/5">{expanded ? 'Hide' : 'View'}</button>
              <button onClick={onDelete} className="text-sm px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">Remove</button>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 space-y-2">
              <p className="text-sm">{therapist.bio || 'No bio provided.'}</p>
              {therapist.profile && (
                <div className="text-sm text-secondary-text">
                  <p>Location: {therapist.profile.location || '—'}</p>
                  <p>Specialties: {therapist.profile.specialties?.join(', ') || '—'}</p>
                  <p>Languages: {therapist.profile.languages?.join(', ') || '—'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
