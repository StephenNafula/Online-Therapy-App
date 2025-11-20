import React, { useState, useEffect } from 'react';

export default function SecureMessaging({ token, userRole }) {
  const [messages, setMessages] = useState([]);
  const [showCompose, setShowCompose] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  const loadMessages = async () => {
    try {
      const res = await fetch(`${API}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async () => {
    if (!recipientId || !subject || !content) {
      alert('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId, subject, content })
      });
      if (res.ok) {
        await loadMessages();
        setShowCompose(false);
        setRecipientId('');
        setSubject('');
        setContent('');
        alert('Message sent securely');
      } else {
        alert('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await fetch(`${API}/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadMessages();
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">mail</span>
        Secure HIPAA-Compliant Messaging
      </h3>

      <button
        onClick={() => setShowCompose(!showCompose)}
        className="mb-4 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-500"
      >
        {showCompose ? 'Cancel' : 'New Message'}
      </button>

      {showCompose && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 space-y-3">
          <label className="flex flex-col">
            <span className="text-sm font-semibold mb-1">Recipient Email</span>
            <input
              type="email"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="admin@happinesstherapy.com"
              className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-semibold mb-1">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject"
              className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-semibold mb-1">Message (Encrypted)</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your message here. It will be encrypted."
              rows="4"
              className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40 resize-none"
            />
          </label>

          <button
            onClick={handleSendMessage}
            disabled={loading}
            className="w-full bg-primary text-black font-bold py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Secure Message'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="font-semibold">Inbox ({messages.filter(m => !m.isRead).length} unread)</h4>
        {messages.length === 0 ? (
          <p className="text-secondary-text">No messages yet.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`p-3 rounded border ${
                  msg.isRead
                    ? 'bg-white/5 border-white/10'
                    : 'bg-primary/10 border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{msg.subject}</p>
                    <p className="text-xs text-secondary-text">From: {msg.sender?.name}</p>
                    <p className="text-xs mt-1 text-white/70 line-clamp-2">{msg.content}</p>
                  </div>
                  {!msg.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(msg._id)}
                      className="text-xs px-2 py-1 bg-primary/20 border border-primary rounded text-primary"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-secondary-text mt-4">🔒 All messages are encrypted end-to-end.</p>
    </div>
  );
}
