export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { messages, system } = req.body
    const apiKey = process.env.ANTHROPIC_API_KEY || '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'
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        system: system || 'Eres Elio AI, asistente de trading de ELIOTFW CAPITAL. Respondes en español, conciso y profesional.',
        messages
      })
    })
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
