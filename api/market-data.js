export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const TWELVE_KEY = process.env.TWELVE_DATA_KEY || '7051023d677245af897a34242a8d3306'
  const result = {}

  async function safeFetch(url, timeout = 5000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const r = await fetch(url, { signal: controller.signal })
      clearTimeout(id)
      const text = await r.text()
      try { return JSON.parse(text) } catch(e) { return null }
    } catch(e) {
      clearTimeout(id)
      return null
    }
  }

  async function yahooPrice(symbol) {
    const d = await safeFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`)
    return d?.chart?.result?.[0]?.meta?.regularMarketPrice || null
  }

  // ── Yahoo Finance — fuente primaria para todos los símbolos ──
  try {
    const [xau, dxy, btc, eur, gbp, jpy, eth, vix, tnx, spx] = await Promise.all([
      yahooPrice('XAUUSD=X'),
      yahooPrice('DX-Y.NYB'),
      yahooPrice('BTC-USD'),
      yahooPrice('EURUSD=X'),
      yahooPrice('GBPUSD=X'),
      yahooPrice('USDJPY=X'),
      yahooPrice('ETH-USD'),
      yahooPrice('%5EVIX'),
      yahooPrice('%5ETNX'),
      yahooPrice('%5EGSPC'),
    ])
    if (xau) result.xauusd = parseFloat(xau.toFixed(2))
    if (dxy) result.dxy   = parseFloat(dxy).toFixed(2)
    if (btc) result.btc   = parseFloat(btc).toFixed(2)
    if (eur) result.eurusd = parseFloat(eur).toFixed(5)
    if (gbp) result.gbpusd = parseFloat(gbp).toFixed(5)
    if (jpy) result.usdjpy = parseFloat(jpy).toFixed(3)
    if (eth) result.ethusd = parseFloat(eth).toFixed(2)
    if (vix) result.vix   = parseFloat(vix).toFixed(2)
    if (tnx) result.tnx   = parseFloat(tnx).toFixed(2)
    if (spx) result.spx   = parseFloat(spx).toFixed(2)
  } catch(e) {}

  // ── Twelve Data — fallback para lo que no llegó ──
  try {
    const missing = []
    if (!result.xauusd) missing.push('XAU/USD')
    if (!result.dxy)    missing.push('DXY')
    if (!result.btc)    missing.push('BTC/USD')
    if (!result.eurusd) missing.push('EUR/USD')
    if (!result.gbpusd) missing.push('GBP/USD')
    if (missing.length > 0) {
      const d = await safeFetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(missing.join(','))}&apikey=${TWELVE_KEY}`)
      if (d) {
        if (!result.xauusd && d['XAU/USD']?.price) result.xauusd = parseFloat(d['XAU/USD'].price)
        if (!result.dxy    && d['DXY']?.price)     result.dxy    = parseFloat(d['DXY'].price).toFixed(2)
        if (!result.btc    && d['BTC/USD']?.price) result.btc    = parseFloat(d['BTC/USD'].price).toFixed(2)
        if (!result.eurusd && d['EUR/USD']?.price) result.eurusd = parseFloat(d['EUR/USD'].price).toFixed(5)
        if (!result.gbpusd && d['GBP/USD']?.price) result.gbpusd = parseFloat(d['GBP/USD'].price).toFixed(5)
      }
    }
  } catch(e) {}

  // ── Frankfurter — fallback final para XAU/USD ──
  if (!result.xauusd) {
    try {
      const d = await safeFetch('https://api.frankfurter.app/latest?from=XAU&to=USD')
      if (d?.rates?.USD) result.xauusd = d.rates.USD
    } catch(e) {}
  }

  // ── XAU/USD OHLC via Twelve Data ──
  try {
    const d = await safeFetch(`https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1day&outputsize=2&apikey=${TWELVE_KEY}`)
    if (d?.values?.length > 0) {
      const latest = d.values[0]
      result.xauusd_high       = parseFloat(latest.high).toFixed(2)
      result.xauusd_low        = parseFloat(latest.low).toFixed(2)
      result.xauusd_open       = parseFloat(latest.open).toFixed(2)
      result.xauusd_close_prev = d.values[1] ? parseFloat(d.values[1].close).toFixed(2) : null
    }
  } catch(e) {}

  // ── Fred API — Fed Funds Rate ──
  try {
    const fedD = await safeFetch('https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&sort_order=desc&limit=1&api_key=8c10e5b6a7dcdb95a38e9f82d22e11ac&file_type=json')
    if (fedD?.observations?.[0]?.value) result.fed_rate = parseFloat(fedD.observations[0].value).toFixed(2)
  } catch(e) {}

  // ── Fred API — CPI ──
  try {
    const cpiD = await safeFetch('https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&sort_order=desc&limit=2&api_key=8c10e5b6a7dcdb95a38e9f82d22e11ac&file_type=json')
    if (cpiD?.observations?.length >= 2) {
      const curr = parseFloat(cpiD.observations[0].value)
      const prev = parseFloat(cpiD.observations[1].value)
      result.cpi = ((curr - prev) / prev * 100 * 12).toFixed(1)
    }
  } catch(e) {}

  return res.status(200).json(result)
}
