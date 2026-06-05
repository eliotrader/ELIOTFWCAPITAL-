export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { messages, system } = req.body
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: system || 'Eres Elio AI, asistente de trading de ELIOTFW CAPITAL. Responde en español, conciso y profesional.',
        messages
      })
    })
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
