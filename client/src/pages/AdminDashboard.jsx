import React, { useState, useEffect } from 'react';
import TherapistCard from '../components/TherapistCard';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('reports');
  const [analytics, setAnalytics] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [paymentStats, setPaymentStats] = useState({ pending: 0, verified: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(false);
  const [showAddTherapist, setShowAddTherapist] = useState(false);
  const [newTherapist, setNewTherapist] = useState({ name: '', email: '', password: '', bio: '' });
  const [manageOpen, setManageOpen] = useState(true);
  const [monitorOpen, setMonitorOpen] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    // If a therapist accesses this route, redirect them to their therapist dashboard
    if (user?.role && user.role !== 'admin') {
      if (user.role === 'therapist') {
        navigate('/app/dashboard');
        return;
      }
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [token, user]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, therapistsRes, bookingsRes, auditRes, settingsRes] = await Promise.all([
        fetch(`${API}/admin/analytics/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/therapists`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/audit-logs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (therapistsRes.ok) setTherapists(await therapistsRes.json());
      if (bookingsRes.ok) {
        const bookingData = await bookingsRes.json();
        setBookings(bookingData);
        const stats = bookingData.reduce((acc, booking) => {
          if (booking.status) {
            acc[booking.status] = (acc[booking.status] || 0) + 1;
          }
          return acc;
        }, {});
        setPaymentStats({
          pending: stats.pending || 0,
          verified: stats.verified || 0,
          completed: stats.completed || 0,
          cancelled: stats.cancelled || 0
        });
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
      if (settingsRes && settingsRes.ok) setSettings(await settingsRes.json());
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTherapist = async () => {
    if (!newTherapist.name || !newTherapist.email || !newTherapist.password) {
      alert('Please fill required fields');
      return;
    }
    try {
      const res = await fetch(`${API}/admin/therapists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTherapist)
      });
      if (res.ok) {
        await loadAdminData();
        setShowAddTherapist(false);
        setNewTherapist({ name: '', email: '', password: '', bio: '' });
        alert('Therapist added successfully');
      } else {
        alert('Failed to add therapist');
      }
    } catch (err) {
      console.error('Error adding therapist', err);
    }
  };

  const handleDeleteTherapist = async (id) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/admin/therapists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await loadAdminData();
        alert('Therapist removed');
      }
    } catch (err) {
      console.error('Error deleting therapist', err);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark font-display text-white p-4">
      <div className="max-w-7xl mx-auto flex gap-6">
        {/* Sidebar for admin navigation */}
          <aside className="w-64 shrink-0 bg-black/20 border border-white/5 rounded-xl p-4 sticky top-6 self-start">
            <h3 className="text-lg font-bold mb-4">Admin</h3>
            <nav className="flex flex-col gap-2">
              {/* Management group: Therapists & Bookings */}
              <div>
                <button
                  onClick={() => setManageOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5"
                  aria-expanded={manageOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined">manage_accounts</span>
                    <span className="font-semibold">Management</span>
                  </div>
                  <span className="material-symbols-outlined">{manageOpen ? 'expand_less' : 'expand_more'}</span>
                </button>

                {manageOpen && (
                  <div className="mt-2 ml-1 flex flex-col gap-1">
                    <button
                      onClick={() => setActiveTab('therapists')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === 'therapists' ? 'bg-primary text-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="material-symbols-outlined align-middle mr-2 text-sm">people</span>
                      Therapists
                    </button>

                    <button
                      onClick={() => setActiveTab('bookings')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === 'bookings' ? 'bg-primary text-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="material-symbols-outlined align-middle mr-2 text-sm">calendar_month</span>
                      Bookings
                    </button>
                  </div>
                )}
              </div>

              {/* Monitoring group: Overview & Audit */}
              <div>
                <button
                  onClick={() => setMonitorOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5"
                  aria-expanded={monitorOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined">insights</span>
                    <span className="font-semibold">Monitoring</span>
                  </div>
                  <span className="material-symbols-outlined">{monitorOpen ? 'expand_less' : 'expand_more'}</span>
                </button>

                {monitorOpen && (
                  <div className="mt-2 ml-1 flex flex-col gap-1">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-primary text-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="material-symbols-outlined align-middle mr-2 text-sm">analytics</span>
                      Overview
                    </button>

                    <button
                      onClick={() => setActiveTab('audit')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === 'audit' ? 'bg-primary text-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="material-symbols-outlined align-middle mr-2 text-sm">history</span>
                      Audit Logs
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-white/5 pt-3 flex flex-col gap-2">
                <a href="/app/dashboard" className="block px-3 py-2 rounded-lg hover:bg-white/5 flex items-center gap-2"><span className="material-symbols-outlined">dashboard</span>Therapist Dashboard</a>
                <a href="/" className="block px-3 py-2 rounded-lg hover:bg-white/5 flex items-center gap-2"><span className="material-symbols-outlined">public</span>Public Site</a>
              </div>
            </nav>
          </aside>
        <main className="flex-1">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl font-black mb-2">Admin Dashboard</h1>
            <p className="text-secondary-text">Full platform oversight and management</p>
          </div>

          {/* Tabs (kept for quick switching, but primary nav is the sidebar) */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['reports', 'therapists', 'bookings', 'audit', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-primary text-black'
                    : 'bg-white/10 border border-white/20 hover:bg-white/20'
                }`}
              >
                {tab === 'reports' ? 'Reports & Analytics' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {loading && <p>Loading...</p>}

        {/* Reports & Analytics Tab */}
        {activeTab === 'reports' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                <p className="text-secondary-text text-sm">Total Bookings</p>
                <p className="text-3xl font-bold text-primary">{analytics.totalBookings}</p>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                <p className="text-secondary-text text-sm">Conversion (pending → confirmed)</p>
                <p className="text-3xl font-bold text-green-400">
                  {analytics.conversionRate ? `${(analytics.conversionRate * 100).toFixed(1)}%` : (
                    analytics.confirmedBookings && analytics.pendingBookings
                      ? `${((analytics.confirmedBookings / Math.max(1, analytics.pendingBookings + analytics.confirmedBookings)) * 100).toFixed(1)}%`
                      : '—'
                  )}
                </p>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                <p className="text-secondary-text text-sm">Active Therapists</p>
                <p className="text-3xl font-bold text-purple-400">{analytics.totalTherapists}</p>
              </div>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">Client Demographics</h3>
              {analytics.clientDemographics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(analytics.clientDemographics).map(([key, val]) => (
                    <div key={key} className="p-3 bg-white/5 rounded">
                      <p className="text-sm text-secondary-text">{key}</p>
                      <p className="font-bold text-lg">{val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-secondary-text">No demographics data available.</p>
              )}
            </div>
          </div>
        )}

        {/* Therapists Tab */}
        {activeTab === 'therapists' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowAddTherapist(!showAddTherapist)}
              className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-500"
            >
              {showAddTherapist ? 'Cancel' : 'Add New Therapist'}
            </button>

            {showAddTherapist && (
              <div className="bg-black/30 border border-white/10 rounded-xl p-6 space-y-3">
                <label className="flex flex-col">
                  <span className="text-sm font-semibold mb-1">Name</span>
                  <input
                    type="text"
                    value={newTherapist.name}
                    onChange={(e) => setNewTherapist({ ...newTherapist, name: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-sm font-semibold mb-1">Email</span>
                  <input
                    type="email"
                    value={newTherapist.email}
                    onChange={(e) => setNewTherapist({ ...newTherapist, email: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-sm font-semibold mb-1">Password</span>
                  <input
                    type="password"
                    value={newTherapist.password}
                    onChange={(e) => setNewTherapist({ ...newTherapist, password: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-sm font-semibold mb-1">Bio (optional)</span>
                  <textarea
                    value={newTherapist.bio}
                    onChange={(e) => setNewTherapist({ ...newTherapist, bio: e.target.value })}
                    rows="3"
                    className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white resize-none"
                  />
                </label>
                <button
                  onClick={handleAddTherapist}
                  className="w-full bg-primary text-black font-bold py-2 rounded hover:bg-blue-500"
                >
                  Create Therapist
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {therapists.map((therapist) => (
                <TherapistCard
                  key={therapist._id}
                  therapist={therapist}
                  onDelete={() => handleDeleteTherapist(therapist._id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-black/30 border border-white/10 rounded-xl overflow-x-auto">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-lg font-bold mb-2">Master Calendar & Payment Monitor</h3>
              <p className="text-sm text-secondary-text mb-4">Track every booking, monitor payment status, and drill into therapist schedules.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-secondary-text uppercase">Pending</p>
                  <p className="text-2xl font-bold text-amber-400">{paymentStats.pending}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-secondary-text uppercase">Verified</p>
                  <p className="text-2xl font-bold text-blue-400">{paymentStats.verified}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-secondary-text uppercase">Completed</p>
                  <p className="text-2xl font-bold text-green-400">{paymentStats.completed}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-secondary-text uppercase">Cancelled</p>
                  <p className="text-2xl font-bold text-red-400">{paymentStats.cancelled}</p>
                </div>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-black/50 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Therapist</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-white/10 hover:bg-white/5">
                    <td className="px-4 py-3">{booking.client?.name || 'N/A'}</td>
                    <td className="px-4 py-3">{booking.therapist?.name || 'N/A'}</td>
                    <td className="px-4 py-3">{new Date(booking.scheduledAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        booking.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        booking.status === 'verified' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">${booking.externalPayment?.amount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-black/20 border border-white/5 rounded p-4">
              <p className="font-semibold">Audit Logs</p>
              <p className="text-sm text-secondary-text mt-1">Use Audit Logs to monitor user activity, data access, and system changes — important for security and compliance reviews.</p>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {auditLogs.map((log) => (
                <div key={log._id} className="bg-black/30 border border-white/10 rounded p-3 text-sm">
                  <p className="font-semibold">{log.action}</p>
                  <p className="text-xs text-secondary-text">
                    By: {log.actor?.name} | {new Date(log.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-white/60 mt-1">{log.resourceType}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">System Settings</h3>
              <p className="text-sm text-secondary-text mb-4">Configure manual payment instructions and in-system audio call settings.</p>

              <label className="flex flex-col mb-3">
                <span className="text-sm font-semibold mb-1">Manual Payment Instructions (displayed to clients)</span>
                <textarea value={settings?.manualPaymentInstructions || ''} onChange={(e) => setSettings(s => ({ ...(s || {}), manualPaymentInstructions: e.target.value }))} rows={4} className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white" />
              </label>

              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings?.audioCall?.enabled ?? true} onChange={(e) => setSettings(s => ({ ...(s || {}), audioCall: { ...(s?.audioCall || {}), enabled: e.target.checked } }))} />
                  <span className="text-sm">Enable In-System Audio Calls</span>
                </label>

                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings?.audioCall?.requireSecureLink ?? true} onChange={(e) => setSettings(s => ({ ...(s || {}), audioCall: { ...(s?.audioCall || {}), requireSecureLink: e.target.checked } }))} />
                  <span className="text-sm">Require secure call links (recommended)</span>
                </label>

                <label className="flex flex-col">
                  <span className="text-sm font-semibold mb-1">Call link activation (minutes before session)</span>
                  <input
                    type="number"
                    min="1"
                    value={settings?.audioCall?.reminderMinutes ?? 5}
                    onChange={(e) => setSettings(s => ({ ...(s || {}), audioCall: { ...(s?.audioCall || {}), reminderMinutes: Number(e.target.value) } }))}
                    className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                  />
                </label>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={async () => {
                  try {
                    const res = await fetch(`${API}/admin/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(settings || {}) });
                    if (res.ok) { alert('Settings saved'); setSettings(await res.json()); } else alert('Failed to save settings');
                  } catch (err) { console.error('save settings', err); alert('Save failed'); }
                }} className="px-4 py-2 bg-primary text-black rounded">Save Settings</button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

