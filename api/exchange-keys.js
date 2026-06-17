export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://geyosraoygsdpllhlrjc.supabase.co'
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

  const { action, user_id, binance_api_key, binance_secret, kucoin_api_key, kucoin_secret, kucoin_passphrase } = req.body

  try {
    if (action === 'save') {
      const updateData = {}
      if (binance_api_key !== undefined) updateData.binance_api_key = binance_api_key
      if (binance_secret !== undefined) updateData.binance_secret = binance_secret
      if (kucoin_api_key !== undefined) updateData.kucoin_api_key = kucoin_api_key
      if (kucoin_secret !== undefined) updateData.kucoin_secret = kucoin_secret
      if (kucoin_passphrase !== undefined) updateData.kucoin_passphrase = kucoin_passphrase

      const r = await fetch(`${SUPABASE_URL}/rest/v1/eliotfw_users?id=eq.${user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      })
      const data = await r.json()
      return res.status(200).json({ ok: true })
    }

    if (action === 'get') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/eliotfw_users?id=eq.${user_id}&select=binance_api_key,binance_secret,kucoin_api_key,kucoin_secret,kucoin_passphrase`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      const data = await r.json()
      if (!data[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
      return res.status(200).json(data[0])
    }

    return res.status(400).json({ error: 'Acción no válida' })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
