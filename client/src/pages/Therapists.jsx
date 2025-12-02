import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api'

export default function Therapists(){
  const [therapists, setTherapists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    // Get all therapists for guest and logged-in users
    fetch('http://localhost:4000/api/users')
      .then(r=>r.json())
      .then(data => {
        // Ensure we have an array; some error pages return HTML or object
        const arr = Array.isArray(data) ? data : [];
        // Filter for therapists if role is available
        const therapistList = arr.filter(u => u && (u.role === 'therapist' || u.isTherapist))
        setTherapists(therapistList.length > 0 ? therapistList : arr)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching therapists:', err)
        setTherapists([])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div style={{padding: 20}}>Loading therapists...</div>
  }

  return (
    <div style={{padding: 20, maxWidth: 1000, margin: '0 auto'}}>
      <h1 style={{marginBottom: 10}}>Available Therapists</h1>
      <p style={{color: '#666', marginBottom: 20}}>
        Browse our licensed therapists. No account needed - book instantly as a guest!
      </p>
      
      {therapists.length===0 && (
        <p style={{color: '#999'}}>No therapists available at the moment. Please check back later.</p>
      )}
      
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20}}>
        {therapists.map(t=> (
          <div 
            key={t._id} 
            style={{
              padding: 20,
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 15,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              background: '#f9f9f9'
            }}
          >
            <div>
              <h3 style={{margin: '0 0 5px 0'}}>{t.name}</h3>
              {t.specialty && <p style={{color: '#666', fontSize: 14, margin: 0}}>{t.specialty}</p>}
            </div>
            
            {t.bio && (
              <p style={{color: '#555', fontSize: 14, margin: 0}}>
                {t.bio}
              </p>
            )}
            
            {t.yearsExperience && (
              <p style={{color: '#888', fontSize: 13, margin: 0}}>
                <strong>Experience:</strong> {t.yearsExperience} years
              </p>
            )}
            
            {t.hourlyRate && (
              <p style={{color: '#4A90E2', fontWeight: 'bold', margin: 0}}>
                ${t.hourlyRate}/hour
              </p>
            )}
            
            <Link 
              to={`/book/${t._id}`}
              style={{
                padding: 10,
                background: '#4A90E2',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 4,
                textAlign: 'center',
                fontWeight: 'bold',
                marginTop: 'auto',
                transition: 'background 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#357ABD'}
              onMouseLeave={(e) => e.target.style.background = '#4A90E2'}
            >
              Book Session
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
