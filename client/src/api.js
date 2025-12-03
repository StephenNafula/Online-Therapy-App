// Use Vite env var (import.meta.env) in the browser build. Set VITE_API_URL in .env if you need to override.
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function parseResponse(res) {
  // Global unauthorized handler: if server returns 401, clear local session and redirect to login
  if (res.status === 401) {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } catch (e) {}
    // Navigate to login page to force re-authentication
    try { window.location.href = '/login' } catch (e) {}
    return { success: false, status: 401, message: 'Unauthorized' }
  }
  const contentType = res.headers.get('content-type') || ''
  // If JSON, parse safely. If not, return text wrapped in an object so callers don't try to parse HTML as JSON.
  if (contentType.includes('application/json')) {
    try {
      const data = await res.json()
      // normalize
      if (res.ok) return data
      return { ...(typeof data === 'object' ? data : { message: String(data) }), success: false, status: res.status }
    } catch (err) {
      const text = await res.text()
      return { success: false, status: res.status, message: 'Invalid JSON response', raw: text }
    }
  }

  // Not JSON (likely HTML error page) — return structured object
  const text = await res.text()
  return { success: false, status: res.status, message: text || `Server returned status ${res.status}`, raw: text }
}

async function post(path, body, token){
  const authToken = token || sessionStorage.getItem('stitch_session_token') || localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(body)
  })
  return parseResponse(res)
}

async function get(path, token){
  const authToken = token || sessionStorage.getItem('stitch_session_token') || localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  })
  return parseResponse(res)
}

async function patch(path, body, token){
  const authToken = token || sessionStorage.getItem('stitch_session_token') || localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(body || {})
  })
  return parseResponse(res)
}

export { post, get, patch, API }
