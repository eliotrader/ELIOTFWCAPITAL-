exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = JSON.parse(event.body)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Eres Elio AI, el asistente de trading personal de Elionardo Díaz, trader activo de Curicó, Chile. Tu especialidad es forex, crypto y oro (XAU/USD). Respondes en español, de forma clara, directa y profesional. Ayudas con análisis de mercado, gestión de riesgo, tamaños de lote, ratio riesgo/recompensa, interpretación de calendarios económicos y estrategias de trading. Eres parte del hub ELIOTFW CAPITAL. Sé conciso pero completo.`,
        messages: body.messages
      })
    })

    const data = await response.json()
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    }
  }
}
