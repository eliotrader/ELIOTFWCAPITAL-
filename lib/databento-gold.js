// Databento Historical HTTP: recent real trades, explicitly not a live stream.
// https://databento.com/docs/api-reference-historical?historical=http
// Configure DATABENTO_API_KEY and an exact DATABENTO_GOLD_SYMBOL (e.g. GCZ6).
export function aggregateDatabentoTrades(records, symbol) {
  const buckets=new Map();
  for(const r of records){
    if(r.action!=='T')continue;
    if(r.symbol!==symbol)throw new Error('Unexpected instrument');
    const ts=Date.parse(r.hd?.ts_event ?? r.ts_event);
    const price=Number(r.price),size=r.size;
    if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||!Number.isSafeInteger(size)||size<=0)throw new Error('Invalid trade');
    const minute=Math.floor(ts/60000)*60000;
    let b=buckets.get(minute);
    if(!b){b={time:new Date(minute).toISOString(),price,buy_volume:0,sell_volume:0,unknown_volume:0,last_ts:ts};buckets.set(minute,b);}
    if(ts>=b.last_ts){b.price=price;b.last_ts=ts;}
    // Databento trade side is aggressor: B = buyer; A = seller; N = none.
    if(r.side==='B')b.buy_volume+=size;
    else if(r.side==='A')b.sell_volume+=size;
    else if(r.side==='N')b.unknown_volume+=size;
    else throw new Error('Invalid side');
  }
  return [...buckets.values()].sort((a,b)=>a.last_ts-b.last_ts).map(({last_ts,...b})=>b);
}

let cached=null;
export async function fetchDatabentoGold({key,symbol,fetcher=fetch,now=Date.now()}){
  if(!/^(GC|MGC)[FGHJKMNQUVXZ]\d{1,4}$/.test(symbol||''))throw Object.assign(new Error('Select exact contract'),{code:'SYMBOL_REQUIRED'});
  if(cached && cached.symbol===symbol && now-cached.time<60000)return cached.data;
  const headers={Authorization:'Basic '+Buffer.from(key+':').toString('base64')};
  const range=await fetcher('https://hist.databento.com/v0/metadata.get_dataset_range?dataset=GLBX.MDP3',{headers,signal:AbortSignal.timeout(10000)});
  if(!range.ok)throw Object.assign(new Error('Databento access required'),{code:range.status===401||range.status===403?'ACCESS_REQUIRED':'PROVIDER_UNAVAILABLE'});
  const available=await range.json();
  const endMs=Date.parse(available.schema?.trades?.end);
  if(!Number.isFinite(endMs)||endMs>now+60000)throw new Error('Invalid dataset range');
  const form=new URLSearchParams({dataset:'GLBX.MDP3',symbols:symbol,schema:'trades',stype_in:'raw_symbol',start:new Date(endMs-15*60000).toISOString(),end:new Date(endMs).toISOString(),encoding:'json',pretty_px:'true',pretty_ts:'true',map_symbols:'true',limit:'50000'});
  const r=await fetcher('https://hist.databento.com/v0/timeseries.get_range',{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Object.assign(new Error('Databento request failed'),{code:r.status===401||r.status===403?'ACCESS_REQUIRED':'PROVIDER_UNAVAILABLE'});
  const text=await r.text();
  if(text.length>20*1024*1024)throw new Error('Response too large');
  const records=text.trim()?text.trim().split('\n').map(line=>JSON.parse(line)):[];
  if(records.length>=50000)throw Object.assign(new Error('Incomplete window'),{code:'WINDOW_TOO_BUSY'});
  const bars=aggregateDatabentoTrades(records,symbol);
  if(!bars.length)throw Object.assign(new Error('No trades in recent available window'),{code:'NO_TRADES'});
  const data={source:'Databento · CME GLBX.MDP3 · histórico reciente',instrument:symbol,mode:'historical',interval_seconds:60,asof:new Date(endMs).toISOString(),delay_seconds:Math.max(0,Math.floor((now-endMs)/1000)),bars};
  cached={symbol,time:now,data};return data;
}
