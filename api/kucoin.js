import crypto from 'crypto'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { api_key, secret, passphrase } = req.body
  if (!api_key || !secret || !passphrase) return res.status(400).json({ error: 'Faltan credenciales KuCoin' })

  try {
    const timestamp = Date.now().toString()
    const method = 'GET'
    const endpoint = '/api/v1/accounts'
    const strToSign = timestamp + method + endpoint
    const signature = crypto.createHmac('sha256', secret).update(strToSign).digest('base64')
    const passphraseEnc = crypto.createHmac('sha256', secret).update(passphrase).digest('base64')

    const r = await fetch(`https://api.kucoin.com${endpoint}`, {
      headers: {
        'KC-API-KEY': api_key,
        'KC-API-SIGN': signature,
        'KC-API-TIMESTAMP': timestamp,
        'KC-API-PASSPHRASE': passphraseEnc,
        'KC-API-KEY-VERSION': '2'
      }
    })
    const data = await r.json()

    if (data.code !== '200000') return res.status(400).json({ error: data.msg || 'Error KuCoin' })

    // Filtrar solo cuentas de trading con saldo > 0
    const balances = data.data
      .filter(a => a.type === 'trade' && parseFloat(a.balance) > 0)
      .map(a => ({
        asset: a.currency,
        free: parseFloat(a.available),
        locked: parseFloat(a.holds),
        total: parseFloat(a.balance)
      }))

    return res.status(200).json({ exchange: 'kucoin', balances })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
