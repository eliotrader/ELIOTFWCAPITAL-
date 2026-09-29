// Read-only adapter for a licensed GC/MGC provider. Credentials stay server-side.
// Provider payload: source, instrument, interval_seconds, asof, delay_seconds,
// bars: [{time, price, buy_volume, sell_volume, unknown_volume?}].
export function normalizeOrderflow(data) {
  if (!data || typeof data.source !== 'string' || !data.source.trim() ||
      typeof data.instrument !== 'string' || !/^(GC|MGC)(?:[FGHJKMNQUVXZ]\d{1,4})?$/.test(data.instrument) ||
      !Array.isArray(data.bars) || !data.bars.length || data.bars.length > 1000) {
    throw new Error('Invalid provider payload');
  }
  const time = value => {
    if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Timestamp must include timezone');
    return new Date(value).toISOString();
  };
  const number = (value, min) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min) throw new Error('Invalid numeric value');
    return value;
  };
  const bars = data.bars.map(b => ({time:time(b.time),price:number(b.price,0.01),
    buy_volume:number(b.buy_volume,0),sell_volume:number(b.sell_volume,0),unknown_volume:number(b.unknown_volume ?? 0,0)}));
  bars.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  if (bars.some((b,i)=>i && b.time===bars[i-1].time)) throw new Error('Duplicate bar time');
  const asof=time(data.asof);
  if (Date.parse(asof)<Date.parse(bars[bars.length-1].time)) throw new Error('Invalid asof');
  return {source:data.source.trim().slice(0,120),instrument:data.instrument,asof,
    interval_seconds:number(data.interval_seconds,1),delay_seconds:number(data.delay_seconds,0),bars};
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
  const url=process.env.GOLD_ORDERFLOW_URL;
  if(!url) return res.status(503).json({ok:false,code:'NOT_CONFIGURED'});
  try {
    if(new URL(url).protocol!=='https:') throw new Error('HTTPS required');
    const token=process.env.GOLD_ORDERFLOW_TOKEN;
    const response=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(10000)});
    if(!response.ok) throw new Error('Provider unavailable');
    const data=normalizeOrderflow(await response.json());
    return res.status(200).json({ok:true,...data});
  } catch (_) {
    return res.status(502).json({ok:false,code:'PROVIDER_UNAVAILABLE'});
  }
}
