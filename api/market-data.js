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
      return await r.json()
    } catch(e) {
      clearTimeout(id)
      return null
    }
  }

  // Twelve Data — batch principales
  try {
    const symbols = 'XAU/USD,DXY,BTC/USD,EUR/USD,GBP/USD,USD/JPY,ETH/USD'
    const d = await safeFetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols)}&apikey=${TWELVE_KEY}`)
    if (d) {
      if (d['XAU/USD']?.price)  result.xauusd  = parseFloat(d['XAU/USD'].price)
      if (d['DXY']?.price)      result.dxy     = parseFloat(d['DXY'].price).toFixed(2)
      if (d['BTC/USD']?.price)  result.btc     = parseFloat(d['BTC/USD'].price).toFixed(2)
      if (d['EUR/USD']?.price)  result.eurusd  = parseFloat(d['EUR/USD'].price).toFixed(5)
      if (d['GBP/USD']?.price)  result.gbpusd  = parseFloat(d['GBP/USD'].price).toFixed(5)
      if (d['USD/JPY']?.price)  result.usdjpy  = parseFloat(d['USD/JPY'].price).toFixed(3)
      if (d['ETH/USD']?.price)  result.ethusd  = parseFloat(d['ETH/USD'].price).toFixed(2)
    }
  } catch(e) {}

  // VIX — Yahoo Finance API (gratuito, sin key)
  try {
    const vixData = await safeFetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d')
    const vixPrice = vixData?.chart?.result?.[0]?.meta?.regularMarketPrice
    if (vixPrice) result.vix = parseFloat(vixPrice).toFixed(2)
  } catch(e) {}

  // TNX (Bono 10Y) — Yahoo Finance API
  try {
    const tnxData = await safeFetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=1d')
    const tnxPrice = tnxData?.chart?.result?.[0]?.meta?.regularMarketPrice
    if (tnxPrice) result.tnx = parseFloat(tnxPrice).toFixed(2)
  } catch(e) {}

  // SPX — Yahoo Finance
  try {
    const spxData = await safeFetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1d')
    const spxPrice = spxData?.chart?.result?.[0]?.meta?.regularMarketPrice
    if (spxPrice) result.spx = parseFloat(spxPrice).toFixed(2)
  } catch(e) {}

  // XAU/USD fallback — Frankfurter
  if (!result.xauusd) {
    try {
      const d = await safeFetch('https://api.frankfurter.app/latest?from=XAU&to=USD')
      if (d?.rates?.USD) result.xauusd = d.rates.USD
    } catch(e) {}
  }

  // XAU/USD OHLC
  try {
    const d = await safeFetch(`https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1day&outputsize=2&apikey=${TWELVE_KEY}`)
    if (d?.values?.length > 0) {
      const latest = d.values[0]
      result.xauusd_high = parseFloat(latest.high).toFixed(2)
      result.xauusd_low  = parseFloat(latest.low).toFixed(2)
      result.xauusd_open = parseFloat(latest.open).toFixed(2)
      result.xauusd_close_prev = d.values[1] ? parseFloat(d.values[1].close).toFixed(2) : null
    }
  } catch(e) {}

  // Fred API — Fed Funds Rate
  try {
    const fedD = await safeFetch('https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&sort_order=desc&limit=1&api_key=8c10e5b6a7dcdb95a38e9f82d22e11ac&file_type=json')
    if (fedD?.observations?.[0]?.value) {
      result.fed_rate = parseFloat(fedD.observations[0].value).toFixed(2)
    }
  } catch(e) {}

  // Fred API — CPI
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
