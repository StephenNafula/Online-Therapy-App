import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Therapists from './pages/Therapists'
import Booking from './pages/Booking'
import Meeting from './pages/Meeting'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Services from './pages/Services'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import PublicLayout from './components/PublicLayout'
import './styles.css'

const PublicRoutes = () => (
  <PublicLayout>
    <Outlet />
  </PublicLayout>
)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoutes />}>
          <Route path="/" element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="therapists" element={<Therapists />} />
          <Route path="booking" element={<Booking />} />
          <Route path="book/:therapistId" element={<Booking />} />
        </Route>
        <Route path="app/*" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
        <Route path="meeting/:roomId" element={<Meeting />} />
        {/* Support legacy or secure links (e.g., /secure-call/:bookingId/:token) */}
        <Route path="secure-call/:bookingId/:token?" element={<Meeting />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
