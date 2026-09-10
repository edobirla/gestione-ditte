// ---------------------------------------------------------------------
// BUDGET: registro dei movimenti (sempre imponibile), quote per cantiere con quadratura,
// spese generali fuori dai margini, viste per cantiere e per cliente, riepilogo annuale con quadratura.
// ---------------------------------------------------------------------
const TIPI_MOVIMENTO={entrata:'Entrata',uscita:'Uscita',nota_credito:'Nota di credito'};
VISTE.budget=function(r){
  if(r.query.nuovo){setTimeout(()=>dialogoMovimento(null),0);history.replaceState(null,'','#/budget')}
  if(r.query.movimento){setTimeout(()=>dialogoMovimento(perId('movimenti',r.query.movimento)),0);history.replaceState(null,'','#/budget')}
  const vista=r.id||'movimenti';
  const anni=unici(stato.movimenti.map(m=>(m.data||'').slice(0,4)).filter(Boolean).concat([String(new Date().getFullYear())])).sort().reverse();
  const anno=ui.filtri.budgetAnno||anni[0];
  const testa=html`<div class="testata"><div><h1>Budget</h1><div class="sotto">${stato.movimenti.length} movimenti · si lavora sempre sull'<b>imponibile</b>, mai sul totale documento</div></div><div class="azioni"><select data-cambio="budget-anno" aria-label="Anno" style="width:auto">${anni.map(a=>html`<option value="${a}" ${a===anno?'selected':''}>${a}</option>`)}</select><button class="pulsante" data-azione="budget-importa-xml" title="Importa fatture elettroniche in formato XML (FatturaPA)">${icona('carica')}Importa XML</button><button class="pulsante" data-azione="budget-stampa" data-anno="${anno}">${icona('stampa')}Stampa</button><button class="pulsante" data-azione="budget-csv" data-anno="${anno}">${icona('scarica')}CSV</button><button class="pulsante primario" data-azione="movimento-nuovo">${icona('piu')}Nuovo movimento</button></div></div>
  ${linguette('budget',[{id:'movimenti',testo:'Movimenti',icona:'elenco'},{id:'cantieri',testo:'Per cantiere',icona:'cantieri'},{id:'clienti',testo:'Per cliente',icona:'clienti'},{id:'annuale',testo:'Riepilogo annuale',icona:'budget'}],vista)}`;
  return html`${testa}${vista==='cantieri'?budgetPerCantiere(anno):vista==='clienti'?budgetPerCliente(anno):vista==='annuale'?budgetAnnuale(anno):budgetMovimenti(anno,r)}`;
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-linguetta="budget"]');if(b){e.stopImmediatePropagation();vai('budget/'+(b.dataset.valore==='movimenti'?'':b.dataset.valore))}},true);
AZIONI['budget-anno']=(d,t)=>{ui.filtri.budgetAnno=t.value;render()};
AZIONI['movimento-nuovo']=d=>dialogoMovimento(null,d.cantiere);
function budgetMovimenti(anno,r){
  const f=Object.assign({filtro:r.query.filtro||''},ui.filtri.budget||{});
  let mov=stato.movimenti.filter(m=>(m.data||'').startsWith(anno));
  if(f.filtro==='nonassegnate') mov=stato.movimenti.filter(m=>m.categoria!=='spese_generali'&&!quoteMovimentoPerCantiere(m).length);
  if(f.filtro==='daverificare') mov=stato.movimenti.filter(m=>m.daVerificare);
  if(f.tipo) mov=mov.filter(m=>m.tipo===f.tipo);
  if(f.categoria) mov=mov.filter(m=>m.categoria===f.categoria);
  if(f.cerca){const q=normalizzaTesto(f.cerca);mov=mov.filter(m=>normalizzaTesto([m.numero,m.controparte,m.note,nomeCliente(m.clienteId)].join(' ')).includes(q))}
  const tot={entrate:somma(mov.filter(m=>m.tipo==='entrata'),m=>+m.imponibile||0),uscite:somma(mov.filter(m=>m.tipo==='uscita'),m=>+m.imponibile||0),note:somma(mov.filter(m=>m.tipo==='nota_credito'),m=>+m.imponibile||0)};
  return html`<div class="strumenti-tabella"><input type="search" placeholder="Cerca numero, controparte, note" value="${f.cerca||''}" data-cambio="budget-filtro" data-campo="cerca"><select data-cambio="budget-filtro" data-campo="tipo"><option value="">Tutti i tipi</option>${Object.entries(TIPI_MOVIMENTO).map(([v,t])=>html`<option value="${v}" ${f.tipo===v?'selected':''}>${t}</option>`)}</select><select data-cambio="budget-filtro" data-campo="categoria"><option value="">Tutte le categorie</option>${Object.entries(CATEGORIE_MOVIMENTO).map(([v,t])=>html`<option value="${v}" ${f.categoria===v?'selected':''}>${t}</option>`)}</select><div class="gruppo-pulsanti"><button class="pulsante piccolo ${!f.filtro?'attivo':''}" data-azione="budget-filtro-rapido" data-valore="">Anno ${anno}</button><button class="pulsante piccolo ${f.filtro==='nonassegnate'?'attivo':''}" data-azione="budget-filtro-rapido" data-valore="nonassegnate">Non assegnate</button><button class="pulsante piccolo ${f.filtro==='daverificare'?'attivo':''}" data-azione="budget-filtro-rapido" data-valore="daverificare">Da verificare</button></div>${pulsanteCancellaFiltri(!!(f.cerca||f.tipo||f.categoria),'budget-filtro-reset')}<span class="conteggio">${mov.length} movimenti · entrate ${fEuro(tot.entrate,0)} · uscite ${fEuro(tot.uscite,0)}${tot.note?' · note di credito '+fEuro(tot.note,0):''}</span></div>
  ${tabella({id:'movimenti',righe:mov,chiaveOrd:'data',dir:'desc',onRiga:m=>dialogoMovimento(m),classeRiga:m=>m.daVerificare?'riga-scadenza':m.tipo==='nota_credito'?'riga-pianificare':'',colonne:[
    {chiave:'data',titolo:'Data',principale:true,formatta:m=>html`<b>${fData(m.data)}</b>${m.daVerificare?html` <span class="pillola scadenza">${icona('attenzione','piccola')}da verificare</span>`:''}`},
    {chiave:'tipo',titolo:'Tipo',formatta:m=>m.tipo==='nota_credito'?html`<span class="pillola pianificare">${icona('meno','piccola')}Nota di credito</span>`:TIPI_MOVIMENTO[m.tipo]},
    {chiave:'numero',titolo:'N. fattura',formatta:m=>m.numero||''},
    {chiave:'controparte',titolo:'Controparte',formatta:m=>html`${m.controparte||nomeCliente(m.clienteId)||daCompilare()}${m.clienteId&&m.controparte?html`<br><span class="piccolo secondario">${nomeCliente(m.clienteId)}</span>`:''}`},
    {chiave:'categoria',titolo:'Categoria',valore:m=>CATEGORIE_MOVIMENTO[m.categoria]||''},
    {chiave:'cant',titolo:'Cantiere',formatta:m=>{const q=quoteMovimentoPerCantiere(m);if(m.categoria==='spese_generali')return html`<span class="silenzioso">spese generali</span>`;if(!q.length)return html`<span class="da-compilare">non assegnata</span>`;return q.map(x=>html`<span class="etichetta-tag">${nomeCantiere(x.cantiereId)}${q.length>1?' '+fEuro(x.importo,0):''}</span> `)}},
    {chiave:'imponibile',titolo:'Imponibile',num:true,valore:m=>importoConSegno(m),formatta:m=>html`<span class="${m.tipo==='nota_credito'?'da-compilare':''}">${m.tipo==='nota_credito'?'− ':''}${fEuro(m.imponibile)}</span>`},
    {chiave:'incasso',titolo:'Incasso',formatta:m=>m.tipo==='uscita'?'':m.dataIncasso?html`${fData(m.dataIncasso)} <span class="piccolo secondario">(${giorniPagamento(m)} gg)</span>`:html`<span class="silenzioso">non registrato</span>`},
    {chiave:'file',titolo:'Doc.',formatta:m=>m.fileId?html`<button class="pulsante piccolo icona" data-azione="file-apri" data-id="${m.fileId}" aria-label="Apri fattura">${icona('pdf','piccola')}</button>`:''},
  ],vuoto:vuoto({icona:'budget',titolo:'Nessun movimento',testo:'Registra entrate e uscite con l\'imponibile e assegnale ai cantieri: da qui nascono margini e report.',azione:{testo:'Nuovo movimento',azione:'movimento-nuovo'}})})}`;
}
AZIONI['budget-filtro']=(d,t)=>{ui.filtri.budget=Object.assign({},ui.filtri.budget,{[d.campo]:t.value});render();if(d.campo==='cerca')setTimeout(()=>{const i=el('[data-cambio="budget-filtro"][data-campo="cerca"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
AZIONI['budget-filtro-reset']=()=>{ui.filtri.budget={};render()};
document.addEventListener('input',debounce(e=>{const t=e.target;if(t.matches&&t.matches('[data-cambio="budget-filtro"][data-campo="cerca"]'))AZIONI['budget-filtro']({campo:'cerca'},t)},250));
AZIONI['budget-filtro-rapido']=d=>{ui.filtri.budget=Object.assign({},ui.filtri.budget,{filtro:d.valore});history.replaceState(null,'','#/budget');render()};
function budgetPerCantiere(anno){
  const cs=stato.cantieri.filter(c=>String(c.anno)===String(anno)).map(c=>({c,eco:economiaCantiere(c.id,stato.movimenti)}));
  const conMov=cs.filter(x=>x.eco.entrate||x.eco.uscite);
  return html`<div class="scheda"><h3>Margine per cantiere · cantieri iniziati nel ${anno}</h3><p class="secondario piccolo">Un cantiere appartiene interamente all'anno in cui è iniziato, comprese le fatture emesse negli anni successivi. Le spese generali sono escluse.</p>${conMov.length?graficoBarreOrizzontali(conMov.sort((a,b)=>b.eco.margine-a.eco.margine).map(x=>({etichetta:x.c.nome,valore:Math.round(x.eco.margine),href:'#/cantieri/'+x.c.id})),{formatta:v=>fEuro(v,0)}):''}
  ${tabella({righe:cs,href:x=>'#/cantieri/'+x.c.id,colonne:[{chiave:'n',titolo:'Cantiere',principale:true,formatta:x=>html`<b>${x.c.nome}</b> <span class="piccolo secondario">${STATI_CANTIERE[x.c.stato]}</span>`},{chiave:'cl',titolo:'Cliente',formatta:x=>nomeCliente(x.c.affidatariaId)||nomeCliente(x.c.committenteId)},{chiave:'contr',titolo:'Contratto',num:true,formatta:x=>x.c.importoContratto?fEuro(x.c.importoContratto,0):''},{chiave:'e',titolo:'Entrate',num:true,formatta:x=>fEuro(x.eco.entrate,0)},{chiave:'u',titolo:'Uscite',num:true,formatta:x=>fEuro(x.eco.uscite,0)},{chiave:'m',titolo:'Margine',num:true,formatta:x=>html`<span class="${x.eco.margine<0?'da-compilare':''}">${fEuro(x.eco.margine,0)}</span>`},{chiave:'p',titolo:'%',num:true,formatta:x=>x.eco.marginePct!=null?fPct(x.eco.marginePct,0):''}],piede:html`<tr><td colspan="3">Totale</td><td class="num">${fEuro(somma(cs,x=>x.eco.entrate),0)}</td><td class="num">${fEuro(somma(cs,x=>x.eco.uscite),0)}</td><td class="num">${fEuro(somma(cs,x=>x.eco.margine),0)}</td><td></td></tr>`})}</div>`;
}
function budgetPerCliente(anno){
  const righe=stato.clienti.map(c=>{const mov=movimentiCliente(c.id).filter(m=>(m.data||'').startsWith(anno));return {c,entrate:somma(mov.filter(m=>m.tipo==='entrata'),m=>+m.imponibile||0),uscite:somma(mov.filter(m=>m.tipo==='uscita'),m=>+m.imponibile||0),note:somma(mov.filter(m=>m.tipo==='nota_credito'),m=>+m.imponibile||0),n:mov.length}}).filter(x=>x.n);
  return html`<div class="scheda"><h3>Per cliente · fatture datate ${anno}</h3>${righe.length?html`${graficoBarre(righe.sort((a,b)=>b.entrate-a.entrate).map(x=>({etichetta:x.c.ragioneSociale,valore:Math.round(x.entrate-x.note)})),{formatta:v=>fEuro(v,0)})}${tabella({righe,href:x=>'#/clienti/'+x.c.id,colonne:[{chiave:'n',titolo:'Cliente',principale:true,formatta:x=>x.c.ragioneSociale},{chiave:'e',titolo:'Fatturato (entrate − note)',num:true,formatta:x=>fEuro(x.entrate-x.note,0)},{chiave:'u',titolo:'Uscite collegate',num:true,formatta:x=>fEuro(x.uscite,0)},{chiave:'m',titolo:'Movimenti',num:true,valore:x=>x.n}]})}`:html`<p class="secondario">Nessun movimento nel ${anno}.</p>`}</div>`;
}
// Riepilogo annuale: doppia lettura (per data fattura, come il commercialista; per cantiere, per anno di inizio) con quadratura
function budgetAnnuale(anno){
  const perData=stato.movimenti.filter(m=>(m.data||'').startsWith(anno));
  const E=somma(perData.filter(m=>m.tipo==='entrata'),m=>+m.imponibile||0),U=somma(perData.filter(m=>m.tipo==='uscita'),m=>+m.imponibile||0),N=somma(perData.filter(m=>m.tipo==='nota_credito'),m=>+m.imponibile||0),SG=somma(perData.filter(m=>m.tipo==='uscita'&&m.categoria==='spese_generali'),m=>+m.imponibile||0);
  const cantAnno=new Set(stato.cantieri.filter(c=>String(c.anno)===String(anno)).map(c=>c.id));
  let Ec=0,Uc=0;const fuoriAnno=[];const inAnnoAltri=[];
  for(const m of stato.movimenti){for(const q of quoteMovimentoPerCantiere(m)){if(!cantAnno.has(q.cantiereId))continue;const imp=+q.importo||0;if(m.tipo==='entrata')Ec+=imp;else if(m.tipo==='uscita')Uc+=imp;else Ec-=imp;if(!(m.data||'').startsWith(anno))fuoriAnno.push({m,q})}}
  for(const m of perData){for(const q of quoteMovimentoPerCantiere(m)){if(!cantAnno.has(q.cantiereId))inAnnoAltri.push({m,q})}}
  const perMese=Array.from({length:12},(_,i)=>{const k=anno+'-'+pad2(i+1);const mm=perData.filter(m=>(m.data||'').startsWith(k));return {etichetta:NOMI_MESI_BREVI[i],valori:[somma(mm.filter(m=>m.tipo==='entrata'),m=>+m.imponibile||0),somma(mm.filter(m=>m.tipo==='uscita'),m=>+m.imponibile||0)]}});
  const perCat=Object.entries(CATEGORIE_MOVIMENTO).map(([k,t])=>({etichetta:t,valore:somma(perData.filter(m=>m.tipo==='uscita'&&m.categoria===k),m=>+m.imponibile||0)})).filter(x=>x.valore);
  const spiegaQuadr=`Lettura per data fattura (come il software di contabilità): entrate ${fEuro(E-N,0)}, uscite ${fEuro(U,0)}. Lettura per cantiere (cantieri iniziati nel ${anno}, tutte le loro fatture): entrate ${fEuro(Ec,0)}, uscite ${fEuro(Uc,0)}.`;
  return html`<div class="griglia quattro mb"><div class="indicatore" style="cursor:default"><span class="etichetta">Entrate ${anno} (per data fattura)</span><span class="valore md">${fEuro(E-N,0)}</span><span class="nota">${N?'note di credito '+fEuro(N,0):''}</span></div><div class="indicatore" style="cursor:default"><span class="etichetta">Uscite ${anno}</span><span class="valore md">${fEuro(U,0)}</span><span class="nota">di cui spese generali ${fEuro(SG,0)}</span></div><div class="indicatore ${E-N-U<0?'critico':'ok'}" style="cursor:default"><span class="etichetta">Risultato per data fattura</span><span class="valore md">${fEuro(E-N-U,0)}</span></div><div class="indicatore ${Ec-Uc<0?'critico':'ok'}" style="cursor:default"><span class="etichetta">Margine cantieri ${anno} (per cantiere)</span><span class="valore md">${fEuro(Ec-Uc,0)}</span><span class="nota">senza spese generali</span></div></div>
  <div class="griglia due"><div class="scheda"><h3>Entrate e uscite per mese</h3>${graficoImpilato(perMese,[{nome:'Entrate'},{nome:'Uscite',classe:'s2'}],{formatta:v=>fEuro(v,0)})}</div><div class="scheda"><h3>Uscite per categoria</h3>${perCat.length?graficoBarreOrizzontali(perCat.sort((a,b)=>b.valore-a.valore).map(x=>({...x,valore:Math.round(x.valore)})),{formatta:v=>fEuro(v,0)}):html`<p class="secondario">Nessuna uscita.</p>`}</div></div>
  <div class="scheda mt"><h3>${icona('bilancia')}Quadratura fra le due letture</h3><p class="piccolo">${spiegaQuadr}</p>
    <table class="tabella densa reattiva"><tbody><tr><td data-etichetta="Voce">Entrate per data fattura ${anno}</td><td class="num" data-etichetta="Importo">${fEuro(E-N,0)}</td></tr><tr><td data-etichetta="Voce">− fatture del ${anno} riferite a cantieri di altri anni</td><td class="num" data-etichetta="Importo">− ${fEuro(somma(inAnnoAltri.filter(x=>x.m.tipo!=='uscita'),x=>x.m.tipo==='nota_credito'?-x.q.importo:x.q.importo),0)}</td></tr><tr><td data-etichetta="Voce">+ fatture di altri anni riferite a cantieri del ${anno}</td><td class="num" data-etichetta="Importo">+ ${fEuro(somma(fuoriAnno.filter(x=>x.m.tipo!=='uscita'),x=>x.m.tipo==='nota_credito'?-x.q.importo:x.q.importo),0)}</td></tr><tr><td data-etichetta="Voce">− fatture del ${anno} non assegnate ad alcun cantiere (entrate)</td><td class="num" data-etichetta="Importo">− ${fEuro(somma(perData.filter(m=>m.tipo!=='uscita'&&!quoteMovimentoPerCantiere(m).length),m=>importoConSegno(m)),0)}</td></tr><tr class="totale"><td data-etichetta="Voce"><b>= Entrate per cantiere ${anno}</b></td><td class="num" data-etichetta="Importo"><b>${fEuro(Ec,0)}</b></td></tr></tbody></table>
    ${fuoriAnno.length?html`<div class="sezione-titolo">Fatture datate fuori anno ma di cantieri ${anno}</div>${tabella({righe:fuoriAnno,onRiga:x=>dialogoMovimento(x.m),colonne:[{chiave:'d',titolo:'Data',principale:true,formatta:x=>fData(x.m.data)},{chiave:'n',titolo:'Numero',formatta:x=>x.m.numero||''},{chiave:'c',titolo:'Cantiere',formatta:x=>nomeCantiere(x.q.cantiereId)},{chiave:'t',titolo:'Tipo',formatta:x=>TIPI_MOVIMENTO[x.m.tipo]},{chiave:'i',titolo:'Quota',num:true,formatta:x=>fEuro(x.q.importo)}]})}`:''}
    ${inAnnoAltri.length?html`<div class="sezione-titolo">Fatture del ${anno} riferite a cantieri di altri anni</div>${tabella({righe:inAnnoAltri,onRiga:x=>dialogoMovimento(x.m),colonne:[{chiave:'d',titolo:'Data',principale:true,formatta:x=>fData(x.m.data)},{chiave:'n',titolo:'Numero',formatta:x=>x.m.numero||''},{chiave:'c',titolo:'Cantiere',formatta:x=>nomeCantiere(x.q.cantiereId)+' ('+(cantiere(x.q.cantiereId)||{}).anno+')'},{chiave:'t',titolo:'Tipo',formatta:x=>TIPI_MOVIMENTO[x.m.tipo]},{chiave:'i',titolo:'Quota',num:true,formatta:x=>fEuro(x.q.importo)}]})}`:''}</div>`;
}
// ---- dialogo movimento con quote per cantiere ----
async function dialogoMovimento(m,cantierePre){
  const nuovo=!m; m=m||{tipo:'uscita',data:oggi(),categoria:'materiali',quote:cantierePre?[{cantiereId:cantierePre,importo:null}]:[],daVerificare:false};
  const quote=clona(m.quote||[]);
  const listaQuote=()=>html`<div id="quote-box"><div class="sezione-titolo">Assegnazione a cantieri</div><p class="piccolo secondario">Una fattura può essere divisa fra più cantieri: la somma delle quote deve tornare all'imponibile. Le spese generali non si assegnano.</p>${quote.map((q,i)=>html`<div class="riga mb-s"><select data-quota="cantiereId" data-i="${i}" style="flex:2"><option value="">— cantiere —</option>${stato.cantieri.map(c=>html`<option value="${c.id}" ${c.id===q.cantiereId?'selected':''}>${c.nome} (${c.anno})</option>`)}</select><input type="text" inputmode="decimal" class="num-input" data-quota="importo" data-i="${i}" value="${q.importo!=null?fNum(q.importo,2):''}" placeholder="importo" style="flex:1"><button class="pulsante piccolo icona" data-quota-togli="${i}" aria-label="Togli">${icona('chiudi','piccola')}</button></div>`)}<div class="riga"><button class="pulsante piccolo" id="quota-aggiungi">${icona('piu','piccola')}Aggiungi quota</button><button class="pulsante piccolo" id="quota-tutto">Tutto a un cantiere</button><span class="spazio"></span><span id="quota-diff" class="piccolo"></span></div></div>`;
  const campi=[{nome:'tipo',etichetta:'Tipo',tipo:'select',vuoto:false,opzioni:Object.entries(TIPI_MOVIMENTO).map(([v,t])=>({v,t}))},{nome:'numero',etichetta:'Numero fattura'},{nome:'data',etichetta:'Data fattura',tipo:'data',obbligatorio:true},{nome:'controparte',etichetta:'Controparte (fornitore / cliente)'},{nome:'clienteId',etichetta:'Cliente collegato',tipo:'select',opzioni:stato.clienti.map(c=>({v:c.id,t:c.ragioneSociale}))},{nome:'fornitoreId',etichetta:'Fornitore collegato',tipo:'select',opzioni:stato.fornitori.map(f=>({v:f.id,t:f.ragioneSociale}))},{nome:'imponibile',etichetta:'Imponibile (NON il totale documento)',tipo:'euro',obbligatorio:true,aiuto:'In reverse charge coincide col totale; sulle fatture ordinarie al 22% no'},{nome:'categoria',etichetta:'Categoria',tipo:'select',vuoto:false,opzioni:Object.entries(CATEGORIE_MOVIMENTO).map(([v,t])=>({v,t}))},{nome:'notaSu',etichetta:'Nota di credito su',tipo:'select',opzioni:[{v:'entrata',t:'una nostra fattura (riduce le entrate)'},{v:'uscita',t:'una fattura ricevuta (riduce le uscite)'}]},{nome:'dataIncasso',etichetta:'Data di incasso / pagamento',tipo:'data',aiuto:'Se non la registri, i tempi di pagamento non si calcolano: non si stima'},{nome:'daVerificare',tipo:'spunta',testo:'Da verificare (cantiere non chiaro: mai indovinare)'},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}];
  const v=await dialogoModulo(nuovo?'Nuovo movimento':'Movimento '+(m.numero||''),campi,m,{coda:listaQuote(),alMontaggio:vv=>{
    const box=()=>vv.querySelector('#quote-box');
    const rinfresca=()=>{box().outerHTML=listaQuote().s;lega()};
    const aggiornaDiff=()=>{const imp=leggiNumero(vv.querySelector('[name=imponibile]').value)||0;const tot=somma(quote,q=>+q.importo||0);const d=arrotonda2(imp-tot);const e=vv.querySelector('#quota-diff');if(!e)return;if(!quote.length){e.textContent='';return}e.innerHTML=Math.abs(d)<0.005?html`<span class="pillola valido">${icona('ok','piccola')}quote = imponibile</span>`:html`<span class="pillola scaduto">${icona('errore','piccola')}differenza ${fEuro(d)}</span>`};
    const lega=()=>{tutti('[data-quota]',vv).forEach(i=>i.addEventListener('change',()=>{const q=quote[+i.dataset.i];if(i.dataset.quota==='importo')q.importo=leggiNumero(i.value);else q.cantiereId=i.value;aggiornaDiff()}));tutti('[data-quota-togli]',vv).forEach(b=>b.onclick=()=>{quote.splice(+b.dataset.quotaTogli,1);rinfresca()});vv.querySelector('#quota-aggiungi').onclick=()=>{quote.push({cantiereId:'',importo:null});rinfresca()};vv.querySelector('#quota-tutto').onclick=()=>{const imp=leggiNumero(vv.querySelector('[name=imponibile]').value)||0;if(!quote.length)quote.push({cantiereId:'',importo:imp});else{quote.length=1;quote[0].importo=imp}rinfresca()};aggiornaDiff()};
    lega();vv.querySelector('[name=imponibile]').addEventListener('input',aggiornaDiff);
    const cat=vv.querySelector('[name=categoria]');const agg=()=>{const b=box();if(b)b.style.display=cat.value==='spese_generali'?'none':''};cat.addEventListener('change',agg);agg();
    const tipo=vv.querySelector('[name=tipo]');const ns=vv.querySelector('[name=notaSu]').closest('.campo');const aggT=()=>{ns.style.display=tipo.value==='nota_credito'?'':'none'};tipo.addEventListener('change',aggT);aggT();
  },validaTutto:(val,vv)=>{
    if(val.imponibile<0&&val.tipo!=='nota_credito') return 'L\'imponibile non può essere negativo (usa una nota di credito)';
    const q=quote.filter(x=>x.cantiereId);
    if(val.categoria!=='spese_generali'&&q.length){const tot=somma(q,x=>+x.importo||0);const d=arrotonda2((+val.imponibile||0)-tot);if(Math.abs(d)>=0.005)return 'Le quote non tornano all\'imponibile: differenza di '+fEuro(d)}
    if(quote.some(x=>!x.cantiereId&&x.importo)) return 'Una quota non ha il cantiere';
    return null;
  },pulsantiExtra:nuovo?[]:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare questo movimento?',{pericolo:true})){esegui('Eliminato movimento',s=>{s.movimenti=s.movimenti.filter(x=>x.id!==m.id);cestinaFileOrfani(s)});return null}return false}},{testo:m.fileId?'Vedi fattura':'Allega fattura',sinistra:true,fn:async()=>{if(m.fileId){AZIONI['file-apri']({id:m.fileId});return false}const fs=await scegliFile({multipli:false,accetta:'.pdf,image/*'});if(!fs.length)return false;const es=await acquisisciFile(fs[0],{});esegui('Allegata fattura',s=>{s.movimenti.find(x=>x.id===m.id).fileId=es.rec.id},{senzaRender:true});m.fileId=es.rec.id;avviso('Fattura allegata');return false}}]});
  if(!v) return;
  v.quote=v.categoria==='spese_generali'?[]:quote.filter(x=>x.cantiereId).map(x=>({cantiereId:x.cantiereId,importo:+x.importo||0}));
  v.cantiereId=v.quote.length===1?v.quote[0].cantiereId:null;
  if(nuovo) esegui('Nuovo movimento '+(v.numero||''),s=>{s.movimenti.push(Object.assign({id:nuovoId('m'),fileId:null},v))});
  else esegui('Modificato movimento '+(v.numero||''),s=>{Object.assign(s.movimenti.find(x=>x.id===m.id),v)});
}
AZIONI['budget-csv']=d=>{const righe=[['Data','Tipo','Numero','Controparte','Cliente','Categoria','Imponibile','Cantieri (quote)','Data incasso','Da verificare','Note']];for(const m of stato.movimenti.filter(m=>(m.data||'').startsWith(d.anno)))righe.push([fData(m.data),TIPI_MOVIMENTO[m.tipo],m.numero||'',m.controparte||'',nomeCliente(m.clienteId),CATEGORIE_MOVIMENTO[m.categoria]||'',m.imponibile,quoteMovimentoPerCantiere(m).map(q=>nomeCantiere(q.cantiereId)+' '+fNum(q.importo,2)).join(' | '),fData(m.dataIncasso),m.daVerificare?'sì':'',m.note||'']);scaricaCsv(righe,nomeFileData('Movimenti '+d.anno,'csv'))};

// ---- importazione fatture elettroniche XML (FatturaPA) ----
// Formato scelto perché è quello con cui i software di fatturazione (es. SimplyFatt) esportano
// le fatture in modo strutturato: niente da rileggere a occhio, i dati sono già nei campi giusti.
function estraiFatturaXml(testo){
  const doc=new DOMParser().parseFromString(testo,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error('XML non valido o non leggibile');
  const pick=(root,tag)=>{if(!root)return'';const e=root.querySelector('*|'+tag);return e?(e.textContent||'').trim():''};
  const header=doc.querySelector('*|FatturaElettronicaHeader');
  const cedente=header&&header.querySelector('*|CedentePrestatore');
  const cessionario=header&&header.querySelector('*|CessionarioCommittente');
  const anagrafica=el=>el&&el.querySelector('*|Anagrafica');
  const nomeSoggetto=el=>pick(anagrafica(el),'Denominazione')||[pick(anagrafica(el),'Nome'),pick(anagrafica(el),'Cognome')].filter(Boolean).join(' ');
  const pivaCedente=pick(cedente&&cedente.querySelector('*|IdFiscaleIVA'),'IdCodice');
  const denomCedente=nomeSoggetto(cedente);
  const denomCessionario=nomeSoggetto(cessionario);
  const bodies=Array.from(doc.querySelectorAll('*|FatturaElettronicaBody'));
  if(!bodies.length) throw new Error('Nessun corpo fattura (FatturaElettronicaBody) trovato');
  return bodies.map(body=>{
    const datiGen=body.querySelector('*|DatiGeneraliDocumento');
    const numero=pick(datiGen,'Numero'),data=pick(datiGen,'Data');
    const riepiloghi=Array.from(body.querySelectorAll('*|DatiRiepilogo'));
    const imponibile=arrotonda2(somma(riepiloghi,r=>parseFloat(pick(r,'ImponibileImporto'))||0));
    return {numero,data,imponibile,pivaCedente,denomCedente,denomCessionario};
  });
}
AZIONI['budget-importa-xml']=async()=>{
  const fs=await scegliFile({accetta:'.xml'});
  if(!fs.length) return;
  const nostraPiva=normalizzaTesto(stato.azienda.piva);
  const nuovi=[];let duplicate=0,errori=0;
  for(const f of fs){
    try{
      const fatture=estraiFatturaXml(await leggiComeTesto(f));
      for(const ft of fatture){
        if(!ft.numero||!ft.data){errori++;continue}
        const xmlId=[ft.pivaCedente,ft.numero,ft.data].join('|');
        if(stato.movimenti.some(m=>m.fatturaXmlId===xmlId)){duplicate++;continue}
        const nostra=!!ft.pivaCedente&&normalizzaTesto(ft.pivaCedente)===nostraPiva;
        const tipo=nostra?'entrata':'uscita';
        const controparte=nostra?ft.denomCessionario:ft.denomCedente;
        let fornitoreId=null,clienteId=null;
        if(!nostra&&controparte){const q=normalizzaTesto(controparte);const fo=stato.fornitori.find(x=>normalizzaTesto(x.ragioneSociale)===q);if(fo)fornitoreId=fo.id}
        if(nostra&&controparte){const q=normalizzaTesto(controparte);const cl=stato.clienti.find(x=>normalizzaTesto(x.ragioneSociale)===q);if(cl)clienteId=cl.id}
        nuovi.push({id:nuovoId('m'),tipo,numero:ft.numero,data:ft.data,controparte,clienteId,fornitoreId,imponibile:ft.imponibile,categoria:'materiali',quote:[],daVerificare:true,fatturaXmlId:xmlId,note:'Importata da fattura XML: '+f.name});
      }
    }catch(e){errori++}
  }
  if(nuovi.length) esegui(`Importate ${nuovi.length} fatture da XML`,s=>{s.movimenti.push(...nuovi)});
  avviso(`${nuovi.length} fatture importate${duplicate?', '+duplicate+' già presenti':''}${errori?', '+errori+' con errori':''}. Sono segnate «da verificare»: assegna categoria e cantiere.`,{tipo:!nuovi.length&&errori?'errore':undefined,durata:6000});
};
AZIONI['budget-stampa']=d=>stampaBudget(d.anno);
