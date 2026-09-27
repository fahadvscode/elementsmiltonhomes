const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://cfzuypbljirmibmxpabi.supabase.co').replace(/\/$/, '')
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmenV5cGJsamlybWlibXhwYWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MTgxMTYsImV4cCI6MjA3MDA5NDExNn0.U0DGF2JPzzV4NmvcgET-R8mVjV_-MhdVeeuLhZp6kes'
const TABLE = 'elements_milton_leads'
const SITE_ORIGIN = 'https://elementsmiltonhomes.com'
const THANK_YOU = `${SITE_ORIGIN}/thank-you.html`

function asString(value, max = 400) {
  if (value === undefined || value === null) return ''
  return String(value).trim().slice(0, max)
}

function isTruthy(value) {
  const v = asString(value).toLowerCase()
  return v === 'on' || v === 'true' || v === '1' || v === 'yes'
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    const raw = req.body.trim()
    if (raw.startsWith('{')) return JSON.parse(raw)
    return Object.fromEntries(new URLSearchParams(raw))
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  if (raw.startsWith('{')) return JSON.parse(raw)
  return Object.fromEntries(new URLSearchParams(raw))
}

function sourceOriginFrom(req) {
  const queryOrigin = asString(req.query && req.query.__amp_source_origin)
  if (queryOrigin.startsWith(SITE_ORIGIN)) return SITE_ORIGIN
  const headerOrigin = asString(req.headers.origin)
  if (headerOrigin.startsWith(SITE_ORIGIN) || headerOrigin.startsWith('http://localhost') || headerOrigin.startsWith('http://127.0.0.1')) {
    return headerOrigin
  }
  return SITE_ORIGIN
}

function setAmpCors(req, res) {
  const origin = asString(req.headers.origin) || SITE_ORIGIN
  const sourceOrigin = sourceOriginFrom(req)
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, AMP-Same-Origin')
  res.setHeader('AMP-Access-Control-Allow-Source-Origin', sourceOrigin)
  res.setHeader('Access-Control-Expose-Headers', 'AMP-Access-Control-Allow-Source-Origin, AMP-Redirect-To')
  res.setHeader('Vary', 'Origin')
}

function utmFromReferer(req) {
  const referer = asString(req.headers.referer || req.headers.referrer)
  try {
    const url = new URL(referer)
    return {
      utm_source: url.searchParams.get('utm_source') || '',
      utm_medium: url.searchParams.get('utm_medium') || '',
      utm_campaign: url.searchParams.get('utm_campaign') || '',
      utm_term: url.searchParams.get('utm_term') || '',
      utm_content: url.searchParams.get('utm_content') || '',
    }
  } catch {
    return { utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '' }
  }
}

module.exports = async function handler(req, res) {
  setAmpCors(req, res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed.' })
    return
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    res.status(400).json({ ok: false, error: 'Request body must be JSON or a form payload.' })
    return
  }

  if (asString(body.company) || asString(body.fax)) {
    res.setHeader('AMP-Redirect-To', THANK_YOU)
    res.status(200).json({ ok: true })
    return
  }

  const firstName = asString(body.first_name || body.firstName)
  const lastName = asString(body.last_name || body.lastName)
  const email = asString(body.email)
  const phone = asString(body.phone)
  const consent = isTruthy(body.consent || body.casl_consent)

  if (!firstName || !lastName || !email || !phone) {
    res.status(400).json({ ok: false, error: 'Please complete all required fields.' })
    return
  }
  if (!consent) {
    res.status(400).json({ ok: false, error: 'Please check the consent box to continue.' })
    return
  }

  const refererUtm = utmFromReferer(req)
  const payload = {
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    is_broker: false,
    casl_consent: true,
    consent_timestamp: new Date().toISOString(),
    consent_page_path: asString(body.consent_page_path || body.page_path) || '/amp.html',
    utm_source: asString(body.utm_source) || refererUtm.utm_source || null,
    utm_medium: asString(body.utm_medium) || refererUtm.utm_medium || null,
    utm_campaign: asString(body.utm_campaign) || refererUtm.utm_campaign || null,
    utm_term: asString(body.utm_term) || refererUtm.utm_term || null,
    utm_content: asString(body.utm_content) || refererUtm.utm_content || null,
    project_name: 'Elements Milton',
    source: asString(body.source) || SITE_ORIGIN,
    form_location: asString(body.form_location || body.formLocation) || 'amp',
    form_type: 'vip-registration',
    page_path: asString(body.page_path) || '/amp.html',
    status: 'new',
    priority: 'high',
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Supabase insert failed', response.status, detail)
      res.status(500).json({ ok: false, error: 'Could not save this registration. Please try again.' })
      return
    }

    res.setHeader('AMP-Redirect-To', THANK_YOU)
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ ok: false, error: 'Could not save this registration. Please try again.' })
  }
}
