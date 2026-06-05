export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { messages, system } = req.body
    const apiKey = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-Tnhv67onfw19TCSXJBEKRz9zs1Uil-SvCOwIXf0lZGM6IkrD1dd8HgOK3sbaDW5wesDvc0zZkyeKq17OBN_h2w-7VquKwAA'
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: system || 'Eres Elio AI, asistente de trading de ELIOTFW CAPITAL. Respondes en español, conciso y profesional.',
        messages
      })
    })
    const data = await response.json()
    // Log para debug
    console.log('Anthropic response:', JSON.stringify(data).substring(0, 200))
    return res.status(200).json(data)
  } catch (err) {
    console.log('Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
