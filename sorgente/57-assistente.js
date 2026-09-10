// ---------------------------------------------------------------------
// ASSISTENTE DOCUMENTI DI ALTRE AZIENDE: si carica un modulo (PDF o foto), l'applicazione lo
// ricostruisce a schermo, indica dove sembra che vada compilato, e ci si scrive sopra. I dati
// dell'azienda e del legale rappresentante si mettono con un pulsante, come nei modelli. La firma si
// sceglie fra quelle in archivio (azienda e persone) e si sposta e ridimensiona trascinandola.
// Alla fine si stampa, si condivide o si archivia come un documento qualsiasi.
// ---------------------------------------------------------------------
function testoLegaleRappresentante(){
  const a=stato.azienda;const leg=persona(a.legaleRappresentanteId);
  return [a.ragioneSociale,leg?'Il Legale Rappresentante: '+nomePersona(leg):'',leg&&leg.cf?'C.F. '+leg.cf:'',indirizzoTesto(a.indirizzo),a.piva?'P.IVA '+a.piva:''].filter(Boolean).join('\n');
}
// I dati che si inseriscono con un clic: nome in italiano, mai un codice da ricordare.
function datiDaInserire(){
  const a=stato.azienda,leg=persona(a.legaleRappresentanteId);
  return [
    ['Azienda',[['Ragione sociale',a.ragioneSociale],['Sede',indirizzoTesto(a.indirizzo)],['Partita IVA',a.piva],['Codice fiscale',a.cf],['PEC',a.pec],['Telefono',a.telefono],['Email',a.email],['Codice INAIL',a.inail],['Matricola INPS',a.inps],['Cassa Edile',a.cassaEdile]]],
    ['Legale rappresentante',[['Nome e cognome',leg?nomePersona(leg):null],['Luogo di nascita',leg?leg.luogoNascita:null],['Data di nascita',leg&&leg.dataNascita?fData(leg.dataNascita):null],['Codice fiscale',leg?leg.cf:null],['Residenza',leg?leg.residenza:null]]],
    ['Data e luogo',[['Data di oggi',fData(oggi())],['Luogo e data',(a.indirizzo.comune||'')+', '+fData(oggi())],['Comune della sede',a.indirizzo.comune]]],
    ['Blocchi',[['Dati completi del legale rappresentante',testoLegaleRappresentante()]]],
  ].map(([g,voci])=>[g,voci.filter(v=>v[1])]).filter(([g,voci])=>voci.length);
}
// Tutte le firme che l'applicazione ha in archivio: quelle dell'azienda e quelle delle persone.
function firmeDisponibili(){
  const out=[];
  for(const [k,t] of [['firmaTimbro','Timbro e firma azienda'],['firmaLegale','Firma Legale Rappresentante'],['firmaRspp','Firma RSPP'],['firmaRls','Firma RLS']]){
    const src=immagineAzienda(k);if(src)out.push({id:'az:'+k,nome:t,src});
  }
  for(const p of stato.persone) if(p.firmaImg) out.push({id:'p:'+p.id,nome:'Firma di '+nomePersona(p),src:p.firmaImg});
  return out;
}
// Punti del modulo che sembrano da compilare: le righe di puntini o trattini bassi, e le etichette
// tipiche dei moduli. Sono proposte, non certezze: si clicca quella giusta e si scrive lì.
const ETICHETTE_MODULO=[
  [/^(luogo\s+e\s+)?data\b/i,'Data di oggi'],[/^firma/i,'FIRMA'],[/^timbro/i,'FIRMA'],
  [/ragione\s+sociale|denominazione|impresa|ditta/i,'Ragione sociale'],
  [/partita\s*iva|p\.?\s*iva/i,'Partita IVA'],[/codice\s+fiscale|c\.?f\.?$/i,'Codice fiscale'],
  [/sede\s+(legale|operativa)?|indirizzo/i,'Sede'],[/il\s+sottoscritt/i,'Nome e cognome'],
  [/pec|posta\s+elettronica/i,'PEC'],[/telefono|tel\./i,'Telefono'],
  [/inail/i,'Codice INAIL'],[/inps/i,'Matricola INPS'],[/cassa\s+edile/i,'Cassa Edile'],
];
function proponiCampi(elementi){
  const valori=new Map();for(const [,voci] of datiDaInserire())for(const [nome,val] of voci)if(!valori.has(nome))valori.set(nome,val);
  const out=[];
  for(const e of elementi){
    if(e.t!=='testo') continue;
    const testo=(e.testo||'').trim();
    // riga di puntini o trattini: si scrive sopra la riga, subito dopo l'etichetta
    const vuoto=/[_.]{6,}|…{3,}/.test(testo);
    for(const [re,nome] of ETICHETTE_MODULO){
      if(!re.test(testo)) continue;
      const val=nome==='FIRMA'?null:valori.get(nome);
      if(nome!=='FIRMA'&&!val) break;
      out.push({x:e.x+e.testo.length*e.dim*0.5+e.dim*0.6,y:e.y,dim:e.dim,nome,valore:val,etichetta:tronca(testo,28),firma:nome==='FIRMA'});
      break;
    }
    if(vuoto&&!out.some(c=>Math.abs(c.y-e.y)<2&&Math.abs(c.x-e.x)<80)) out.push({x:e.x+e.dim*0.4,y:e.y,dim:e.dim,nome:'Testo libero',valore:'',etichetta:'riga da compilare'});
  }
  return out.slice(0,40);
}
AZIONI['assistente-documento-esterno']=async()=>{
  const fs=await scegliFile({multipli:false});
  if(!fs.length) return;
  await apriAssistenteDocumento(fs[0]);
};
async function apriAssistenteDocumento(file){
  let sfondo=null,pagina=null,nPagine=1,indice=0;
  const prog=dialogoAvanzamento('Lettura del documento',{testo:'Apro «'+file.name+'»…'});
  try{
    if(ePdf(file.type,file.name)){
      pagina=await rendiPaginaPdf(file,0);nPagine=pagina.pagine;
      if(pagina.scansione) sfondo=pagina.scansione; // pagina scansionata: si lavora sulla fotografia
      else if(!pagina.elementi.length){prog.chiudi();return informa('Questa pagina non si riesce ad aprire','Non contiene né testo né una fotografia leggibile: se è una scansione in un formato particolare, esporta o fotografa la pagina come JPG e caricala qui.')}
    } else if(eImmagine(file.type,file.name)){
      const img=await caricaImmagine(file);
      const c=document.createElement('canvas');const sc=Math.min(1,1600/Math.max(img.width,img.height));
      c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      sfondo=await leggiComeDataUrl(await canvasABlob(c,'image/jpeg',0.85));
      pagina={larghezza:c.width*0.75,altezza:c.height*0.75,elementi:[],pagine:1,indice:0};
    } else { prog.chiudi(); return informa('Tipo di file non adatto','L’assistente lavora su PDF e su foto o scansioni (JPG, PNG). Il file scelto è «'+file.name+'».'); }
  }catch(e){ prog.chiudi(); return segnalaErrore(e,'Non sono riuscito ad aprire «'+file.name+'»'); }
  prog.chiudi();
  await postazioneAssistente(file,pagina,sfondo,nPagine,indice);
}
// Un oggetto aggiunto dall'utente: testo, firma o rettangolo bianco. Coordinate in punti come la
// pagina, così quello che si vede a schermo è esattamente quello che esce in stampa.
function postazioneAssistente(file,pagina,sfondo,nPagine,indice){
  const oggetti=[];
  const proposte=proponiCampi(pagina.elementi);
  const firme=firmeDisponibili();
  const dati=datiDaInserire();
  const disegnaPagina=()=>{
    if(sfondo) return `<img class="ap-sfondo" src="${h(sfondo)}" alt="${h(file.name)}">`;
    return pagina.elementi.map(e=>e.t==='testo'
      ? `<span class="ap-t" style="left:${e.x}pt;top:${e.y-e.dim}pt;font-size:${e.dim}pt;${e.grassetto?'font-weight:700;':''}">${h(e.testo)}</span>`
      : `<span class="ap-l" style="left:${e.x}pt;top:${e.y}pt;width:${e.w}pt;height:${e.h}pt;${e.t==='riquadro'?'background:none;border:.6pt solid #333;':''}"></span>`).join('');
  };
  const corpo=html`<div class="assistente">
    <div class="ap-barra">
      <button class="pulsante piccolo" data-ap="testo">${icona('piu','piccola')}Casella di testo</button>
      <button class="pulsante piccolo" data-ap="firma">${icona('firma','piccola')}Firma</button>
      <button class="pulsante piccolo" data-ap="copri">${icona('elimina','piccola')}Rettangolo bianco</button>
      ${nPagine>1?html`<span class="spazio"></span><span class="piccolo secondario">Pagina</span><select id="ap-pagina">${Array.from({length:nPagine},(_,i)=>html`<option value="${i}" ${i===indice?'selected':''}>${i+1}</option>`)}</select>`:''}
      <span class="spazio"></span><span class="piccolo secondario" id="ap-stato">Clicca un dato qui sotto per metterlo nel foglio, poi trascinalo dove vuoi.</span>
    </div>
    <div class="ap-corpo">
      <div class="ap-foglio-cont"><div class="ap-foglio" id="ap-foglio" style="width:${pagina.larghezza}pt;height:${pagina.altezza}pt">
        ${grezzo(disegnaPagina())}
        <div class="ap-proposte" id="ap-proposte">${proposte.map((c,i)=>html`<button class="ap-prop" data-prop="${i}" style="left:${c.x}pt;top:${c.y-c.dim}pt" title="${c.etichetta}">${c.firma?'firma qui':c.nome}</button>`)}</div>
        <div class="ap-oggetti" id="ap-oggetti"></div>
      </div></div>
      <div class="ap-lato">
        <div class="sezione-titolo">Dati da inserire</div>
        ${dati.map(([g,voci])=>html`<div class="mb-s"><b class="piccolo">${g}</b><div class="chip-lista">${voci.map(([nome,val])=>html`<button type="button" class="chip" data-dato="${nome}" title="${val}">${nome}</button>`)}</div></div>`)}
        <div class="sezione-titolo">Firme in archivio</div>
        ${firme.length?html`<div class="ap-firme">${firme.map(f=>html`<button type="button" class="ap-firma" data-firma="${f.id}" title="${f.nome}"><img src="${f.src}" alt="${f.nome}"><span class="piccolo">${f.nome}</span></button>`)}</div>`:html`<p class="piccolo secondario">Nessuna firma in archivio. Caricale dalla scheda di ogni persona o da Documenti → Modelli.</p>`}
        <div class="sezione-titolo">Elemento scelto</div>
        <div id="ap-proprieta"><p class="piccolo secondario">Clicca un elemento nel foglio per cambiarlo.</p></div>
      </div>
    </div>
  </div>`;
  return dialogo({titolo:'Compila «'+file.name+'»',enorme:true,corpo,senzaFocus:true,valoreEscape:null,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Stampa o salva',classe:'primario',primario:true,fn:()=>({oggetti,pagina,sfondo})}],
    alMontaggio:v=>montaAssistente(v,{file,pagina,sfondo,oggetti,proposte,firme,dati,nPagine,indice})
  }).then(async r=>{
    if(!r) return;
    await esitoAssistente(file,r);
  });
}
function montaAssistente(v,ctx){
  const foglio=v.querySelector('#ap-foglio'),strato=v.querySelector('#ap-oggetti'),prop=v.querySelector('#ap-proprieta');
  const cont=v.querySelector('.ap-foglio-cont');
  const PT=96/72; // punti → pixel a scala 1
  let scala=1;
  const adatta=()=>{const disp=cont.clientWidth-24;scala=Math.min(1.6,Math.max(0.25,disp/(ctx.pagina.larghezza*PT)));foglio.style.transform='scale('+scala+')';cont.style.height=(ctx.pagina.altezza*PT*scala+24)+'px'};
  adatta();window.addEventListener('resize',adatta);
  let scelto=null;
  const disegna=()=>{
    strato.innerHTML=ctx.oggetti.map((o,i)=>{
      const unaRiga=o.t==='testo'&&!/\n/.test(o.testo||'');
      const stile=`left:${o.x}pt;top:${o.y}pt;`+(o.t==='testo'?`font-size:${o.dim}pt;${unaRiga?'white-space:pre;width:auto;':'width:'+o.w+'pt;'}`:`width:${o.w}pt;height:${o.h}pt;`);
      const dentro=o.t==='testo'?h(o.testo).replace(/\n/g,'<br>'):o.t==='firma'?`<img src="${h(o.src)}" alt="">`:'';
      return `<div class="ap-o ${o.t} ${scelto===i?'scelto':''}" data-o="${i}" style="${stile}">${dentro}<span class="maniglia" data-maniglia="${i}"></span></div>`;
    }).join('');
    proprieta();
  };
  const proprieta=()=>{
    const o=ctx.oggetti[scelto];
    if(!o){prop.innerHTML='<p class="piccolo secondario">Clicca un elemento nel foglio per cambiarlo.</p>';return}
    prop.innerHTML=String(html`<div class="campi">
      ${o.t==='testo'?html`<div class="campo largo"><span class="etichetta-campo">Testo</span><textarea id="ap-p-testo" rows="3">${o.testo}</textarea></div>
      <div class="campo"><span class="etichetta-campo">Grandezza</span><input type="range" id="ap-p-dim" min="5" max="40" step="0.5" value="${o.dim}"></div>`:''}
      ${o.t!=='testo'?html`<div class="campo"><span class="etichetta-campo">Larghezza</span><input type="range" id="ap-p-w" min="20" max="${Math.round(ctx.pagina.larghezza)}" value="${Math.round(o.w)}"></div>`:''}
      </div>
      <button class="pulsante piccolo pericolo mt-s" id="ap-p-elimina">${icona('elimina','piccola')}Togli questo elemento</button>`);
    const t=prop.querySelector('#ap-p-testo');if(t)t.addEventListener('input',()=>{o.testo=t.value;const el2=strato.querySelector('[data-o="'+scelto+'"]');if(el2)el2.innerHTML=h(o.testo).replace(/\n/g,'<br>')+'<span class="maniglia" data-maniglia="'+scelto+'"></span>'});
    const d=prop.querySelector('#ap-p-dim');if(d)d.addEventListener('input',()=>{o.dim=+d.value;const el2=strato.querySelector('[data-o="'+scelto+'"]');if(el2)el2.style.fontSize=o.dim+'pt'});
    const w=prop.querySelector('#ap-p-w');if(w)w.addEventListener('input',()=>{const k=+w.value/o.w;o.w=+w.value;if(o.t==='firma')o.h=o.h*k;const el2=strato.querySelector('[data-o="'+scelto+'"]');if(el2){el2.style.width=o.w+'pt';el2.style.height=o.h+'pt'}});
    prop.querySelector('#ap-p-elimina').addEventListener('click',()=>{ctx.oggetti.splice(scelto,1);scelto=null;disegna()});
  };
  const aggiungi=(o)=>{ctx.oggetti.push(o);scelto=ctx.oggetti.length-1;disegna();return o};
  const centro=()=>({x:ctx.pagina.larghezza*0.2,y:ctx.pagina.altezza*0.4});
  const nuovoTesto=(testo,x,y,dim)=>aggiungi({t:'testo',testo:testo||'testo',x:x!=null?x:centro().x,y:y!=null?y:centro().y,w:Math.max(80,String(testo||'').length*(dim||11)*0.62),dim:dim||11});
  const nuovaFirma=(f,x,y)=>{const w=120;aggiungi({t:'firma',src:f.src,nome:f.nome,x:x!=null?x:centro().x,y:y!=null?y:centro().y,w,h:w*0.38})};
  // barra e pannello laterale
  v.querySelector('[data-ap="testo"]').addEventListener('click',()=>nuovoTesto('',null,null,11));
  v.querySelector('[data-ap="copri"]').addEventListener('click',()=>aggiungi({t:'copri',x:centro().x,y:centro().y,w:200,h:30}));
  v.querySelector('[data-ap="firma"]').addEventListener('click',()=>{if(!ctx.firme.length)return avviso('Nessuna firma in archivio: caricane una dalla scheda di una persona',{tipo:'attenzione'});nuovaFirma(ctx.firme[0])});
  tutti('[data-dato]',v).forEach(b=>b.addEventListener('click',()=>{
    const nome=b.dataset.dato;let val=null;
    for(const [,voci] of ctx.dati)for(const [n,vv] of voci)if(n===nome)val=vv;
    nuovoTesto(val||nome,null,null,11);
  }));
  tutti('[data-firma]',v).forEach(b=>b.addEventListener('click',()=>{const f=ctx.firme.find(x=>x.id===b.dataset.firma);if(f)nuovaFirma(f)}));
  tutti('[data-prop]',v).forEach(b=>b.addEventListener('click',()=>{
    const c=ctx.proposte[+b.dataset.prop];
    if(c.firma){ if(!ctx.firme.length)return avviso('Nessuna firma in archivio',{tipo:'attenzione'}); nuovaFirma(ctx.firme[0],c.x,c.y-24); }
    else nuovoTesto(c.valore||'',c.x,c.y-c.dim,Math.max(8,c.dim));
    b.classList.add('usata');
  }));
  const sel=v.querySelector('#ap-pagina');
  if(sel) sel.addEventListener('change',async()=>{
    const p=await rendiPaginaPdf(ctx.file,+sel.value);
    v.chiudi(null);postazioneAssistente(ctx.file,p,p.scansione||null,ctx.nPagine,+sel.value);
  });
  // trascinamento e ridimensionamento
  let trascina=null;
  strato.addEventListener('pointerdown',e=>{
    const man=e.target.closest('[data-maniglia]');const el2=e.target.closest('[data-o]');
    if(!el2) return;
    const i=+el2.dataset.o;scelto=i;const o=ctx.oggetti[i];
    tutti('.ap-o',strato).forEach(x=>x.classList.toggle('scelto',+x.dataset.o===i));proprieta();
    trascina={i,o,man:!!man,x0:e.clientX,y0:e.clientY,ox:o.x,oy:o.y,ow:o.w,oh:o.h||0,dim:o.dim||0,el:el2};
    el2.setPointerCapture(e.pointerId);e.preventDefault();
  });
  strato.addEventListener('pointermove',e=>{
    if(!trascina) return;
    const dx=(e.clientX-trascina.x0)/(scala*PT),dy=(e.clientY-trascina.y0)/(scala*PT);
    const o=trascina.o;
    if(trascina.man){
      const k=Math.max(0.15,(trascina.ow+dx)/trascina.ow);
      o.w=Math.max(12,trascina.ow*k);
      if(o.t==='testo') o.dim=Math.max(5,trascina.dim*k); else o.h=Math.max(6,trascina.oh*k);
      trascina.el.style.width=o.w+'pt';
      if(o.t==='testo') trascina.el.style.fontSize=o.dim+'pt'; else trascina.el.style.height=o.h+'pt';
    } else {
      o.x=Math.max(0,Math.min(ctx.pagina.larghezza-8,trascina.ox+dx));
      o.y=Math.max(0,Math.min(ctx.pagina.altezza-8,trascina.oy+dy));
      trascina.el.style.left=o.x+'pt';trascina.el.style.top=o.y+'pt';
    }
  });
  const fine=()=>{if(trascina){trascina=null;proprieta()}};
  strato.addEventListener('pointerup',fine);strato.addEventListener('pointercancel',fine);
  v.addEventListener('keydown',e=>{
    if(scelto==null) return;
    if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const o=ctx.oggetti[scelto];const passo=e.shiftKey?5:1;
    const k=nomeTasto(e);
    if(k==='ArrowLeft'){o.x-=passo}else if(k==='ArrowRight'){o.x+=passo}else if(k==='ArrowUp'){o.y-=passo}else if(k==='ArrowDown'){o.y+=passo}
    else if(k==='Delete'||k==='Backspace'){ctx.oggetti.splice(scelto,1);scelto=null;disegna();e.preventDefault();return}
    else return;
    e.preventDefault();disegna();
  });
  disegna();
}
// Il foglio compilato diventa una pagina di stampa dell'applicazione, con le stesse misure
// dell'originale: da lì si stampa, si condivide o si archivia come un documento qualsiasi.
function contenutoFoglio(r,xml){
  const {pagina,sfondo,oggetti}=r;
  const fine=xml?'/>':'>';
  const dentro=[];
  if(sfondo) dentro.push(`<img src="${h(sfondo)}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain"${fine}`);
  else for(const e of pagina.elementi){
    if(e.t==='testo') dentro.push(`<span style="position:absolute;left:${e.x}pt;top:${e.y-e.dim}pt;font-size:${e.dim}pt;white-space:pre;line-height:1;${e.grassetto?'font-weight:700;':''}">${h(e.testo)}</span>`);
    else dentro.push(`<span style="position:absolute;left:${e.x}pt;top:${e.y}pt;width:${e.w}pt;height:${e.h}pt;${e.t==='riquadro'?'border:.6pt solid #333':'background:#111'}"></span>`);
  }
  for(const o of oggetti){
    if(o.t==='testo'){
      const multi=/\n/.test(o.testo||'');
      dentro.push(`<span style="position:absolute;left:${o.x}pt;top:${o.y}pt;font-size:${o.dim}pt;line-height:1.25;${multi?'width:'+o.w+'pt;white-space:pre-wrap;':'white-space:pre;'}">${h(o.testo)}</span>`);
    } else if(o.t==='firma') dentro.push(`<img src="${h(o.src)}" style="position:absolute;left:${o.x}pt;top:${o.y}pt;width:${o.w}pt;height:${o.h}pt;object-fit:contain"${fine}`);
    else dentro.push(`<span style="position:absolute;left:${o.x}pt;top:${o.y}pt;width:${o.w}pt;height:${o.h}pt;background:#fff"></span>`);
  }
  return dentro.join('');
}
// Il foglio compilato diventa una pagina di stampa dell'applicazione, con le stesse misure
// dell'originale: da lì si stampa, si condivide o si archivia come un documento qualsiasi.
function paginaAssistenteHtml(r){
  const mmL=r.pagina.larghezza/72*25.4,mmA=r.pagina.altezza/72*25.4;
  return `<div class="pagina" style="width:${mmL}mm;height:${mmA}mm"><div class="corpo-pagina doc" style="position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#111;background:#fff">${contenutoFoglio(r,false)}</div></div>`;
}
// ...e diventa anche un'immagine da archiviare: si disegna l'HTML dentro un SVG e lo si porta su una
// tela. Dentro il foglio ci sono solo stili in riga e immagini data:, altrimenti la tela resterebbe
// bianca (non può caricare risorse esterne). L'HTML qui dev'essere XML valido, tag chiusi compresi.
async function immagineDelFoglio(r){
  const L=r.pagina.larghezza,A=r.pagina.altezza;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(L*2)}" height="${Math.round(A*2)}" viewBox="0 0 ${L} ${A}">`
    +`<foreignObject x="0" y="0" width="${L}" height="${A}">`
    +`<div xmlns="http://www.w3.org/1999/xhtml" style="width:${L}pt;height:${A}pt;position:relative;overflow:hidden;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#111111">${contenutoFoglio(r,true)}</div>`
    +`</foreignObject></svg>`;
  const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  const img=await new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ko(new Error('il foglio non si è potuto disegnare'));i.src=url});
  const c=document.createElement('canvas');c.width=Math.round(L*2);c.height=Math.round(A*2);
  const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
  return await canvasABlob(c,'image/jpeg',0.9);
}
async function esitoAssistente(file,r){
  const nome=file.name.replace(/\.[a-z0-9]+$/i,'')+' - compilato';
  anteprimaStampa({titolo:nome,pagineHtml:[paginaAssistenteHtml(r)],registra:false,
    azioniExtra:`<button class="pulsante" data-ap-archivia>${icona('allega')}Archivia come documento</button>`});
  const b=el('[data-ap-archivia]');
  if(b) b.addEventListener('click',async()=>{
    try{
      const blob=await immagineDelFoglio(r);
      dialogoDocumento({},[new File([blob],nome+'.jpg',{type:'image/jpeg'})]);
    }catch(e){ segnalaErrore(e,'Non sono riuscito a trasformare il foglio in immagine: usa "Stampa / Salva PDF" e poi allega il PDF'); }
  });
}
