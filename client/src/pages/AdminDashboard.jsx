import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddTherapist, setShowAddTherapist] = useState(false);
  const [newTherapist, setNewTherapist] = useState({ name: '', email: '', password: '', bio: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [token, user]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, therapistsRes, bookingsRes, auditRes] = await Promise.all([
        fetch(`${API}/admin/analytics/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/therapists`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/audit-logs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (therapistsRes.ok) setTherapists(await therapistsRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Admin Dashboard</h1>
          <p className="text-secondary-text">Full platform oversight and management</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['overview', 'therapists', 'bookings', 'audit'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === tab
                  ? 'bg-primary text-black'
                  : 'bg-white/10 border border-white/20 hover:bg-white/20'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading && <p>Loading...</p>}

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <p className="text-secondary-text text-sm">Total Bookings</p>
              <p className="text-3xl font-bold text-primary">{analytics.totalBookings}</p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <p className="text-secondary-text text-sm">Completed</p>
              <p className="text-3xl font-bold text-green-400">{analytics.completedBookings}</p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <p className="text-secondary-text text-sm">Scheduled</p>
              <p className="text-3xl font-bold text-blue-400">{analytics.scheduledBookings}</p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <p className="text-secondary-text text-sm">Therapists</p>
              <p className="text-3xl font-bold text-purple-400">{analytics.totalTherapists}</p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <p className="text-secondary-text text-sm">Revenue</p>
              <p className="text-3xl font-bold text-green-300">${analytics.revenue.toFixed(2)}</p>
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
                <div key={therapist._id} className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <h4 className="font-bold text-lg">{therapist.name}</h4>
                  <p className="text-sm text-secondary-text">{therapist.email}</p>
                  <p className="text-sm mt-2">{therapist.bio || 'No bio'}</p>
                  <button
                    onClick={() => handleDeleteTherapist(therapist._id)}
                    className="mt-3 px-3 py-1 text-sm bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-black/30 border border-white/10 rounded-xl overflow-x-auto">
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
        )}
      </div>
    </div>
  );
}
