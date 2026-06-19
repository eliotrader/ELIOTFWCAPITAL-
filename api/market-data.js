export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const TWELVE_KEY = process.env.TWELVE_DATA_KEY || '7051023d677245af897a34242a8d3306'
  const result = {}

  async function safeFetch(url, timeout = 8000, headers = {}) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const r = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          ...headers
        }
      })
      clearTimeout(id)
      const text = await r.text()
      try { return JSON.parse(text) } catch(e) { return null }
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

  // DXY fallback — Yahoo Finance
  if (!result.dxy) {
    try {
      const d = await safeFetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1d')
      const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (p) result.dxy = parseFloat(p).toFixed(2)
    } catch(e) {}
  }

  // VIX — Yahoo Finance
  try {
    const d = await safeFetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d')
    const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice
    if (p) result.vix = parseFloat(p).toFixed(2)
  } catch(e) {}

  // TNX Bono 10Y — Yahoo Finance
  try {
    const d = await safeFetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=1d')
    const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice
    if (p) result.tnx = parseFloat(p).toFixed(2)
  } catch(e) {}

  // SPX — Yahoo Finance
  try {
    const d = await safeFetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1d')
    const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice
    if (p) result.spx = parseFloat(p).toFixed(2)
  } catch(e) {}

  // XAU/USD — gold-api.com (gratis, sin key, precio del oro en vivo)
  if (!result.xauusd) {
    try {
      const d = await safeFetch('https://api.gold-api.com/price/XAU')
      if (d?.price) result.xauusd = parseFloat(d.price)
    } catch(e) {}
  }
  // XAU/USD — CoinGecko PAX Gold (gratis, sin key; PAXG ≈ 1 oz oro)
  if (!result.xauusd) {
    try {
      const d = await safeFetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd')
      if (d?.['pax-gold']?.usd) result.xauusd = parseFloat(d['pax-gold'].usd)
    } catch(e) {}
  }
  // XAU/USD — Binance PAXG/USDT (gratis, sin key)
  if (!result.xauusd) {
    try {
      const d = await safeFetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT')
      if (d?.price) result.xauusd = parseFloat(d.price)
    } catch(e) {}
  }
  // XAU/USD — Yahoo (último respaldo)
  if (!result.xauusd) {
    try {
      const d = await safeFetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d')
      const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (p) result.xauusd = parseFloat(p)
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
    const d = await safeFetch('https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&sort_order=desc&limit=1&api_key=8c10e5b6a7dcdb95a38e9f82d22e11ac&file_type=json')
    if (d?.observations?.[0]?.value) result.fed_rate = parseFloat(d.observations[0].value).toFixed(2)
  } catch(e) {}

  // Fred API — CPI
  try {
    const d = await safeFetch('https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&sort_order=desc&limit=2&api_key=8c10e5b6a7dcdb95a38e9f82d22e11ac&file_type=json')
    if (d?.observations?.length >= 2) {
      const curr = parseFloat(d.observations[0].value)
      const prev = parseFloat(d.observations[1].value)
      result.cpi = ((curr - prev) / prev * 100 * 12).toFixed(1)
    }
  } catch(e) {}

  return res.status(200).json(result)
}
