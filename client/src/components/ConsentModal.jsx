import React from 'react'

export default function ConsentModal({ open, title, content, onClose, onAccept }){
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="max-w-3xl w-full bg-[#071226] rounded-xl p-6 border border-white/10">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-secondary-text">✕</button>
        </div>
        <div className="mt-4 text-sm text-secondary-text max-h-[60vh] overflow-auto space-y-4">
          {typeof content === 'string' ? (<div dangerouslySetInnerHTML={{ __html: content }} />) : content}
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-secondary-text">Close</button>
          <button onClick={() => { onAccept(); onClose(); }} className="px-4 py-2 rounded-lg bg-primary text-black font-bold">I Agree</button>
        </div>
      </div>
    </div>
  )
}
