// Native charts use actual GC/MGC bar data; no simulated market series.
(()=>{
  const NS='http://www.w3.org/2000/svg';
  const el=id=>document.getElementById(id);
  let snapshot=null;
  const total=b=>b.buy_volume+b.sell_volume+b.unknown_volume;
  const delta=b=>b.buy_volume-b.sell_volume;
  const flowColor=b=>delta(b)>0?'#70e0a8':delta(b)<0?'#e08080':'#e8c84a';
  const fmt=n=>n.toLocaleString('es-CL',{maximumFractionDigits:2});
  const time=t=>new Date(t).toLocaleTimeString('es-CL',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'});
  function add(parent,tag,attrs={},text){
    const node=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));
    if(text!==undefined)node.textContent=text;
    parent.appendChild(node);return node;
  }
  function svg(id,label,height){
    const host=el(id);host.replaceChildren();
    const s=add(host,'svg',{viewBox:`0 0 900 ${height}`,role:'img','aria-label':label});
    add(s,'title',{},label);return s;
  }
  function axes(s,top,bottom,lo,hi,bars){
    for(let j=0;j<3;j++){
      const y=top+j*(bottom-top)/2;
      add(s,'line',{x1:15,y1:y,x2:810,y2:y,stroke:'#253047'});
      add(s,'text',{x:820,y:y+4,fill:'#a5adbc','font-size':12},fmt(hi-j*(hi-lo)/2));
    }
    for(const i of [...new Set([0,Math.floor((bars.length-1)/2),bars.length-1])]){
      const span=Math.max(1,Date.parse(bars[bars.length-1].time)-Date.parse(bars[0].time));
      add(s,'text',{x:15+(Date.parse(bars[i].time)-Date.parse(bars[0].time))*790/span,y:bottom+18,fill:'#a5adbc','font-size':12,'text-anchor':i===0?'start':'middle'},time(bars[i].time));
    }
  }
  window.renderGoldOrderflow=function(){
    if(!snapshot)return;
    const bars=snapshot.bars;
    const threshold=Number(el('gold-flow-threshold').value);
    if(!Number.isFinite(threshold)||threshold<=0)return;
    const span=Math.max(snapshot.interval_seconds*1000,Date.parse(bars[bars.length-1].time)-Date.parse(bars[0].time));
    const x=i=>15+(Date.parse(bars[i].time)-Date.parse(bars[0].time))*790/span;
    let lo=Math.min(...bars.map(b=>b.price)),hi=Math.max(...bars.map(b=>b.price));
    const pad=Math.max((hi-lo)*.12,.1);lo-=pad;hi+=pad;
    const y=p=>20+(hi-p)/(hi-lo)*210;
    const price=svg('gold-flow-price','Precio de futuros y actividad de gran tamaño',265);
    axes(price,20,230,lo,hi,bars);
    add(price,'polyline',{points:bars.map((b,i)=>`${x(i)},${y(b.price)}`).join(' '),fill:'none',stroke:'#818bff','stroke-width':2.5});
    const maxTotal=Math.max(1,...bars.map(total));
    bars.forEach((b,i)=>{
      if(total(b)<threshold)return;
      const c=add(price,'circle',{cx:x(i),cy:y(b.price),r:5+15*Math.sqrt(total(b)/maxTotal),fill:flowColor(b),'fill-opacity':.25,stroke:flowColor(b)});
      add(c,'title',{},`${time(b.time)} NY · Precio ${fmt(b.price)} · Total ${fmt(total(b))} contratos · Compras ${fmt(b.buy_volume)} · Ventas ${fmt(b.sell_volume)} · Sin clasificar ${fmt(b.unknown_volume)} · Delta ${fmt(delta(b))}`);
    });
    const width=Math.max(1,Math.min(20,790/bars.length*.75));
    const aggression=svg('gold-flow-aggressor','Agresor por intervalo: compras y ventas',75);
    bars.forEach((b,i)=>{
      const n=b.buy_volume+b.sell_volume;
      const share=n?b.buy_volume/n:.5;
      const c=add(aggression,'rect',{x:x(i)-width/2,y:8,width,height:40,fill:n?(share>=.5?'#70e0a8':'#e08080'):'#596272','fill-opacity':n?.25+Math.abs(share-.5)*1.5:.3});
      add(c,'title',{},`${time(b.time)} · Compra ${fmt(b.buy_volume)} / venta ${fmt(b.sell_volume)} / sin clasificar ${fmt(b.unknown_volume)}`);
    });
    const volume=svg('gold-flow-total','Volumen total por intervalo, en contratos',145);
    axes(volume,15,115,0,maxTotal,bars);
    bars.forEach((b,i)=>add(volume,'rect',{x:x(i)-width/2,y:115-total(b)/maxTotal*100,width,height:total(b)/maxTotal*100,fill:total(b)>=threshold?'#e8c84a':'#6b84b7'}));
    const maxDelta=Math.max(1,...bars.map(b=>Math.abs(delta(b))));
    const ds=svg('gold-flow-delta','Delta por intervalo: volumen comprador menos vendedor',175);
    axes(ds,15,145,-maxDelta,maxDelta,bars);
    add(ds,'line',{x1:15,y1:80,x2:810,y2:80,stroke:'#a5adbc','stroke-dasharray':'4 4'});
    bars.forEach((b,i)=>add(ds,'rect',{x:x(i)-width/2,y:delta(b)>=0?80-delta(b)/maxDelta*65:80,width,height:Math.abs(delta(b))/maxDelta*65,fill:delta(b)>=0?'#70e0a8':'#e08080'}));
    // Reset at the start of each loaded window, not at the session open.
    let running=0;
    const cumulative=bars.map(b=>running+=delta(b));
    const cvdLimit=Math.max(1,...cumulative.map(Math.abs));
    const cvdY=value=>80-value/cvdLimit*65;
    const cvd=svg('gold-flow-cvd','Delta acumulado de la ventana cargada, en contratos',175);
    axes(cvd,15,145,-cvdLimit,cvdLimit,bars);
    add(cvd,'line',{x1:15,y1:80,x2:810,y2:80,stroke:'#a5adbc','stroke-dasharray':'4 4'});
    add(cvd,'polyline',{points:[`${x(0)},80`,...cumulative.map((value,i)=>`${x(i)},${cvdY(value)}`)].join(' '),fill:'none',stroke:'#a0c0ff','stroke-width':2.5});
    cumulative.forEach((value,i)=>{
      const point=add(cvd,'circle',{cx:x(i),cy:cvdY(value),r:3,fill:value>0?'#70e0a8':value<0?'#e08080':'#e8c84a'});
      add(point,'title',{},`${time(bars[i].time)} NY · Delta intervalo ${fmt(delta(bars[i]))} · Acumulado ${fmt(value)} contratos`);
    });
    const sum=bars.reduce((a,b)=>({total:a.total+total(b),delta:a.delta+delta(b)}),{total:0,delta:0});
    el('gold-flow-summary').textContent=`Ventana cargada · Total ${fmt(sum.total)} contratos · Delta acumulado final ${fmt(sum.delta)} · ${bars.filter(b=>total(b)>=threshold).length} intervalos sobre el umbral`;
  };
  window.refreshGoldOrderflow=async function(){
    const status=el('gold-flow-status');if(!status)return;
    if(window.goldOrderflowLoading)return;
    window.goldOrderflowLoading=true;
    status.textContent='Consultando flujo de operaciones…';
    try{
      const r=await fetch('/api/gold-orderflow',{cache:'no-store'});
      const data=await r.json();
      const messages={NOT_CONFIGURED:'Databento pendiente de activación: falta acceso al proveedor.',SYMBOL_REQUIRED:'Falta seleccionar el contrato de oro del proveedor.',ACCESS_REQUIRED:'El proveedor requiere una clave válida y acceso al dataset CME.',NO_TRADES:'Sin operaciones en la ventana reciente disponible. El contrato puede no tener actividad.',WINDOW_TOO_BUSY:'Ventana incompleta por exceso de operaciones; no se muestran cálculos parciales.'};
      if(!r.ok||!data.ok)throw new Error(messages[data.code]||'No se pudo consultar el proveedor.');
      snapshot=data;
      window.renderGoldOrderflow();
      const delay=Math.max(data.delay_seconds,Math.floor((Date.now()-Date.parse(data.asof))/1000),0);
      const hours=Math.floor(delay/3600),minutes=Math.floor(delay%3600/60),seconds=delay%60;
      status.textContent=`${data.mode==='historical'?'HISTÓRICO · ':''}${data.source} · ${data.instrument} · intervalos de ${data.interval_seconds}s · retraso al consultar ${hours}h ${minutes}m ${seconds}s · dato ${new Date(data.asof).toLocaleString('es-CL',{timeZone:'America/Santiago'})} (Chile) · actualización manual`;
    }catch(e){
      snapshot=null;
      ['price','aggressor','total','delta','cvd'].forEach(id=>el('gold-flow-'+id).replaceChildren());
      el('gold-flow-summary').textContent='Sin datos de operaciones.';
      status.textContent=e.message;
    }finally{
      window.goldOrderflowLoading=false;
    }
  };
})();
