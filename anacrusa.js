let memoryEvents = globalThis.__ANACRUSA_EVENTS__ || [];
globalThis.__ANACRUSA_EVENTS__ = memoryEvents;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-anacrusa-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ ok:true, app:'ANACRUSA', events: memoryEvents.slice(-100) });
  }
  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'Method not allowed'});

  const expected = process.env.ANACRUSA_WEBHOOK_SECRET || '';
  if (expected && req.headers['x-anacrusa-secret'] !== expected && req.query?.secret !== expected) {
    return res.status(401).json({ok:false,error:'unauthorized'});
  }

  const p = typeof req.body === 'object' && req.body ? req.body : {};
  const event = {
    received_at: new Date().toISOString(),
    symbol: String(p.symbol || p.ticker || 'XAUUSD'),
    timeframe: String(p.timeframe || p.interval || ''),
    side: String(p.side || p.direction || p.signal || '').toUpperCase(),
    price: p.price ?? p.close ?? '',
    sl: p.sl ?? '',
    tp: p.tp ?? '',
    open: p.open ?? '',
    high: p.high ?? '',
    low: p.low ?? '',
    close: p.close ?? p.price ?? '',
    time: p.time ?? p.bar_time ?? '',
    setup: p.setup ?? p.type ?? ''
  };

  memoryEvents.push(event);
  if (memoryEvents.length > 100) memoryEvents = memoryEvents.slice(-100);
  globalThis.__ANACRUSA_EVENTS__ = memoryEvents;

  // Optional durable persistence when a Supabase service role is configured in Vercel.
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    try {
      await fetch(`${sbUrl}/rest/v1/anacrusa_signals`, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey':sbKey,
          'Authorization':`Bearer ${sbKey}`,
          'Prefer':'return=minimal'
        },
        body:JSON.stringify(event)
      });
    } catch (_) {}
  }

  return res.status(200).json({ok:true,event});
}
