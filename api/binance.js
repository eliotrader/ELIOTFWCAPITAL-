import crypto from 'crypto'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { api_key, secret } = req.body
  if (!api_key || !secret) return res.status(400).json({ error: 'Faltan credenciales' })

  try {
    const timestamp = Date.now()
    const queryString = `timestamp=${timestamp}`
    const signature = crypto.createHmac('sha256', secret).update(queryString).digest('hex')

    const r = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': api_key }
    })
    const data = await r.json()

    if (data.code) return res.status(400).json({ error: data.msg || 'Error Binance' })

    // Filtrar solo balances con saldo > 0
    const balances = data.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }))

    return res.status(200).json({ exchange: 'binance', balances })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
