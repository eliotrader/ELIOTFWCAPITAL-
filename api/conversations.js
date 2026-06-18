export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://geyosraoygsdpllhlrjc.supabase.co'
  const SUPABASE_KEY = process.env.SUPABASE_KEY

  const { action, user_id, role, content } = req.body

  try {
    if (action === 'save') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/elio_conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ user_id, role, content })
      })
      return res.status(200).json({ ok: true })
    }

    if (action === 'load') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/elio_conversations?user_id=eq.${user_id}&order=created_at.asc&limit=40`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      const data = await r.json()
      return res.status(200).json(data)
    }

    if (action === 'clear') {
      await fetch(`${SUPABASE_URL}/rest/v1/elio_conversations?user_id=eq.${user_id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Acción no válida' })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
