export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPA_URL = 'https://geyosraoygsdpllhlrjc.supabase.co';
  const SUPA_KEY = process.env.SUPABASE_KEY;
  const { action, email, password, name } = req.body;

  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    if (action === 'login') {
      const r = await fetch(`${SUPA_URL}/rest/v1/eliotfw_users?email=eq.${encodeURIComponent(email)}&select=*`, { headers });
      const data = await r.json();
      if (!data || data.length === 0) return res.status(401).json({ error: 'Email no registrado' });
      const user = data[0];
      if (user.password !== password) return res.status(401).json({ error: 'Contraseña incorrecta' });
      return res.status(200).json({ id: user.id, email: user.email, name: user.name, plan: user.plan, trialEnd: user.trial_end });
    }

    if (action === 'register') {
      // Verificar si existe
      const check = await fetch(`${SUPA_URL}/rest/v1/eliotfw_users?email=eq.${encodeURIComponent(email)}&select=id`, { headers });
      const exists = await check.json();
      if (exists && exists.length > 0) return res.status(409).json({ error: 'Email ya registrado' });
      // Crear usuario
      const trialEnd = Date.now() + (3 * 24 * 60 * 60 * 1000);
      const r = await fetch(`${SUPA_URL}/rest/v1/eliotfw_users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, email, password, plan: 'trial', trial_end: trialEnd })
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Error creando cuenta' });
      const user = data[0];
      return res.status(200).json({ id: user.id, email: user.email, name: user.name, plan: user.plan, trialEnd: user.trial_end });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (e) {
    return res.status(500).json({ error: 'Error del servidor: ' + e.message });
  }
}
