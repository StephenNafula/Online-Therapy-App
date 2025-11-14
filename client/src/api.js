// Use Vite env var (import.meta.env) in the browser build. Set VITE_API_URL in .env if you need to override.
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function parseResponse(res) {
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
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  })
  return parseResponse(res)
}

async function get(path, token){
  const res = await fetch(`${API}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  return parseResponse(res)
}

async function patch(path, body, token){
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body || {})
  })
  return parseResponse(res)
}

export { post, get, patch, API }
