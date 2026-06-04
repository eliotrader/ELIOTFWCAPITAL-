export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  const TWELVE_KEY = '7051023d677245af897a34242a8d3306'
  const result = {}
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=XAU&to=USD')
    const d = await r.json()
    if (d.rates?.USD) result.xauusd = d.rates.USD
  } catch(e) {}
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR')
    const d = await r.json()
    if (d.rates?.EUR) result.dxy = (103 * (1.08 / (1/d.rates.EUR))).toFixed(2)
  } catch(e) {}
  try {
    const r = await fetch(`https://api.twelvedata.com/price?symbol=VIX&apikey=${TWELVE_KEY}`)
    const d = await r.json()
    if (d.price && !d.code) result.vix = parseFloat(d.price).toFixed(2)
  } catch(e) {}
  try {
    const r = await fetch(`https://api.twelvedata.com/price?symbol=TNX&apikey=${TWELVE_KEY}`)
    const d = await r.json()
    if (d.price && !d.code) result.tnx = parseFloat(d.price).toFixed(2)
  } catch(e) {}
  try {
    const r = await fetch(`https://api.twelvedata.com/price?symbol=BTC/USD&apikey=${TWELVE_KEY}`)
    const d = await r.json()
    if (d.price && !d.code) result.btc = parseFloat(d.price).toFixed(2)
  } catch(e) {}
  return res.status(200).json(result)
}
