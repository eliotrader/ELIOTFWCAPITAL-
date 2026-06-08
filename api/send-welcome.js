export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email } = req.body;
  const RESEND_KEY = process.env.RESEND_KEY;

  try {
    const res2 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ELIOTFW CAPITAL <onboarding@resend.dev>',
        to: email,
        subject: '🏆 Bienvenido al verdadero movimiento del precio',
        html: `
          <div style="background:#050810;color:#f0eadc;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 30px;">
            <div style="text-align:center;margin-bottom:30px;">
              <div style="font-size:28px;font-weight:900;letter-spacing:6px;color:#e8c84a;">ELIOTFW</div>
              <div style="font-size:20px;font-weight:900;letter-spacing:8px;color:#e8c84a;">CAPITAL</div>
              <div style="font-size:11px;letter-spacing:4px;color:rgba(232,200,74,0.5);margin-top:4px;">TRADING HUB PERSONAL</div>
            </div>
            <div style="border:1px solid rgba(196,160,60,0.3);border-radius:8px;padding:30px;background:rgba(12,18,36,0.97);">
              <h1 style="color:#f0d060;font-size:22px;letter-spacing:2px;margin-bottom:20px;">¡Felicidades ${name}! 🎯</h1>
              <p style="color:#c8c0a8;font-size:15px;line-height:1.8;margin-bottom:16px;">
                Acabas de unirte al <strong style="color:#e8c84a;">verdadero movimiento del precio</strong>. 
                Bienvenido a ELIOTFW CAPITAL — la plataforma donde el análisis, la disciplina y la IA se unen para hacer de ti un trader superior.
              </p>
              <p style="color:#c8c0a8;font-size:15px;line-height:1.8;margin-bottom:24px;">
                Tienes <strong style="color:#f0d060;">3 días gratuitos</strong> con acceso completo a todas las herramientas: señales diarias, Ask Elio AI, portafolio en vivo, journal y calculadora de riesgo.
              </p>
              <div style="background:rgba(196,160,60,0.08);border:1px solid rgba(196,160,60,0.25);border-radius:6px;padding:20px;margin-bottom:24px;">
                <div style="font-size:12px;letter-spacing:2px;color:#a09060;margin-bottom:12px;text-transform:uppercase;">Lo que tienes disponible</div>
                <div style="color:#d8d0bc;font-size:14px;line-height:2;">
                  ⚡ Señales diarias XAU/USD con análisis IA<br>
                  🤖 Ask Elio AI — Tu asistente de trading 24/7<br>
                  📊 Portafolio con P&L en tiempo real<br>
                  📒 Trading Journal profesional<br>
                  🧮 Calculadora de lotes y riesgo<br>
                  📈 Panel de Fundamentales XAUUSD
                </div>
              </div>
              <div style="text-align:center;margin-bottom:24px;">
                <a href="https://eliotfwcapital-1ypj.vercel.app" style="display:inline-block;background:rgba(196,160,60,0.15);border:1px solid rgba(232,200,74,0.5);color:#f0d060;padding:14px 32px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:2px;">
                  ACCEDER AL HUB →
                </a>
              </div>
              <div style="border-top:1px solid rgba(196,160,60,0.15);padding-top:20px;">
                <div style="font-size:12px;letter-spacing:2px;color:#a09060;margin-bottom:10px;text-transform:uppercase;">Planes disponibles</div>
                <div style="display:flex;gap:10px;">
                  <div style="flex:1;background:rgba(5,8,16,0.7);border:1px solid rgba(196,160,60,0.2);border-radius:5px;padding:12px;text-align:center;">
                    <div style="color:#e8c84a;font-weight:700;font-size:15px;">Básico</div>
                    <div style="color:#f0d060;font-size:20px;font-weight:900;margin:4px 0;">$9.99</div>
                    <div style="color:#9090a8;font-size:11px;">USDT/mes</div>
                  </div>
                  <div style="flex:1;background:rgba(30,24,8,0.85);border:1px solid rgba(232,200,74,0.4);border-radius:5px;padding:12px;text-align:center;">
                    <div style="color:#f0d060;font-weight:700;font-size:15px;">⭐ Premium</div>
                    <div style="color:#f0d060;font-size:20px;font-weight:900;margin:4px 0;">$49.99</div>
                    <div style="color:#9090a8;font-size:11px;">USDT/mes</div>
                  </div>
                </div>
              </div>
            </div>
            <div style="text-align:center;margin-top:24px;font-size:11px;color:#404858;letter-spacing:1px;">
              ELIOTFW CAPITAL · eliotrader21@gmail.com<br>
              <a href="https://discord.gg/ZJJrSEjS" style="color:#5865F2;text-decoration:none;">Discord</a> · 
              <a href="https://www.youtube.com/@ELIOTFWCAPITAL" style="color:#e08080;text-decoration:none;">YouTube</a>
            </div>
          </div>
        `
      })
    });

    const data = await res2.json();
    if (!res2.ok) return res.status(500).json({ error: data.message || 'Error enviando email' });
    return res.status(200).json({ success: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
