// ---------------------------------------------------------------------
// BANCA: i conti e i documenti della banca, come nella cartella «banca» dell'azienda: movimenti ed
// estratti conto per conto e per mese (o trimestre), carta di credito, RiBa, assegni, bollettini,
// PagoPA, finanziamenti. I bonifici restano in Versamenti → Bonifici.
// Ogni documento ha una data di riferimento: per movimenti, estratti e carta è la fine del periodo,
// per gli altri il giorno. Da lì li prende il pacchetto del commercialista.
// stato.banca = {conti:[{id, nome, iban, note}], documenti:[{id, contoId, tipo, data, descrizione, importo, fileId}]}
// ---------------------------------------------------------------------
// [id, nome, periodo] — periodo dice come si legge la data: 'mese', 'trimestre' o 'giorno'
const TIPI_BANCA=[['movimenti','Movimenti del conto','mese'],['estratto','Estratto conto','mese'],['estratto_trim','Estratto conto trimestrale','trimestre'],['carta','Carta di credito','mese'],
  ['riba_pagate','RiBa pagate','giorno'],['riba_emesse','RiBa emesse','giorno'],['assegno','Assegno','giorno'],['bollettino','Bollettino','giorno'],['pagopa','PagoPA','giorno'],['finanziamento','Finanziamento','giorno'],['altro','Altro documento bancario','giorno']];
const TIPI_CONTO=['movimenti','estratto','estratto_trim']; // quelli che riempiono la casella del conto nel mese
function tipoBanca(id){return TIPI_BANCA.find(t=>t[0]===id)||TIPI_BANCA[TIPI_BANCA.length-1]}
function banca(){return stato.banca||{conti:[],documenti:[]}}
function contoBanca(id){return banca().conti.find(c=>c.id===id)||null}
function periodoBanca(d){const [a,m,g]=(d.data||'').split('-').map(Number);const p=tipoBanca(d.tipo)[2];return !a?'':p==='trimestre'?Math.ceil(m/3)+'° trimestre '+a:p==='mese'?nomeMese(m)+' '+a:dataNomeFile(d.data)}
function nomeDocumentoBanca(d){const c=contoBanca(d.contoId);return nomeChiaro([tipoBanca(d.tipo)[1],c&&c.nome,d.descrizione,periodoBanca(d)])}
// documenti della banca che cadono nel mese 'AAAA-MM' (per il commercialista)
function documentiBancaMese(k){return banca().documenti.filter(d=>(d.data||'').startsWith(k)&&d.fileId)}

// ---- proposte dal nome del file e dal testo del PDF ----
function tipoBancaDaNome(n){n=normalizzaTesto(n);return /trim/.test(n)?'estratto_trim':/movimenti|lista mov/.test(n)?'movimenti':/estratto/.test(n)?'estratto':/carta|visa|nexi|mastercard|amex/.test(n)?'carta':/riba/.test(n)?(/emess/.test(n)?'riba_emesse':'riba_pagate'):/assegn/.test(n)?'assegno':/bollett/.test(n)?'bollettino':/pagopa|pago pa/.test(n)?'pagopa':/finanz|piano amm|mutuo|prestito/.test(n)?'finanziamento':null}
function fineMese(a,m){return a+'-'+pad2(m)+'-'+pad2(giorniNelMese(a,m))}
// Data dal nome: «2° trim» (con l'anno della cartella), «0715» = 15 luglio, «150430» = 30/04/2015, «7 luglio»
function dataBancaDaNome(nome,percorso,annoDefault){
  const n=normalizzaTesto(nome);const anno=+((/(?:^|\/)(20\d{2})(?:\/|$)/.exec(percorso||'')||/(20\d{2})/.exec(nome)||[])[1]||annoDefault);
  let x=/([1-4])\s*(?:°|o)?\s*trim/.exec(nome.toLowerCase());if(x)return fineMese(anno,+x[1]*3);
  x=/^(\d{2})(\d{2})(\d{2})(?!\d)/.exec(nome);if(x&&+x[2]>=1&&+x[2]<=12&&+x[3]>=1&&+x[3]<=31)return '20'+x[1]+'-'+x[2]+'-'+x[3];
  x=/^(\d{2})(\d{2})(?!\d)/.exec(nome);if(x&&+x[1]>=1&&+x[1]<=12&&+x[2]>=1&&+x[2]<=31)return anno+'-'+x[1]+'-'+x[2];
  const i=NOMI_MESI.findIndex(mm=>new RegExp('(^| )'+mm+'( |$)').test(n));if(i>=0)return fineMese(anno,i+1);
  return null;
}
// Dal testo: il mese che compare più spesso nelle date dei movimenti, e il giorno più avanti di quel mese
function dataBancaDaTesto(testo){
  const conta=new Map(),ultimo=new Map();
  for(const x of testo.matchAll(/\b(\d{2})[\/.-](\d{2})[\/.-](20\d{2}|\d{2})\b/g)){const g=+x[1],m=+x[2];if(g<1||g>31||m<1||m>12)continue;const a=x[3].length===2?2000+ +x[3]:+x[3];const k=a+'-'+pad2(m);conta.set(k,(conta.get(k)||0)+1);const d=k+'-'+pad2(g);if(!ultimo.has(k)||d>ultimo.get(k))ultimo.set(k,d)}
  const k=[...conta.entries()].sort((a,b)=>b[1]-a[1])[0];return k?ultimo.get(k[0]):null;
}
// quello che resta del nome tolte date, mesi e parole del tipo: «0715 danilo betti» → «danilo betti»
function descrizioneBancaDaNome(nome){const n=normalizzaTesto(nome.replace(/\.[^.]+$/,'')).replace(/\b\d+\b/g,' ').replace(new RegExp('\\b('+NOMI_MESI.join('|')+'|movimenti|cc|estratto|conto|trim|new|paskey|base|pdf)\\b','g'),' ').replace(/\s+/g,' ').trim();return n}
function contoDaNome(n){n=normalizzaTesto(n);const cc=banca().conti;return (cc.find(c=>normalizzaTesto(c.nome).split(' ').some(w=>w.length>=3&&n.includes(w)))||(cc.length===1?cc[0]:null)||{}).id||''}

VISTE.banca=function(r){
  const t=r.id||'mesi';const B=banca();
  const testa=html`<div class="testata"><div><div class="occhiello">Amministrazione</div><h1>Banca</h1><p class="sotto">Conti, movimenti ed estratti conto mese per mese, carta di credito, RiBa, assegni, bollettini e finanziamenti. I bonifici sono in <a href="#/versamenti/bonifici">Versamenti</a>.</p></div>
    <div class="azioni"><button class="pulsante" data-azione="banca-conto">${icona('piu','piccola')}Nuovo conto</button><button class="pulsante primario" data-azione="banca-carica">Carica documenti<span class="manopola">${icona('carica','piccola')}</span></button></div></div>
  ${linguetteRotta('banca',[{id:'mesi',testo:'Mese per mese'},{id:'documenti',testo:'Tutti i documenti',contatore:B.documenti.length||null},{id:'conti',testo:'Conti',contatore:B.conti.length||null}],t)}`;
  const drop=html`<div class="zona-drop piccola mb" data-azione="banca-carica" data-drop-banca>${icona('carica')}<div><b>Trascina qui i PDF della banca</b><br><span>Anche tanti insieme o un'intera cartella: dal nome e dal testo propongo tipo, conto e data, poi controlli tu.</span></div></div>`;
  if(t==='conti') return html`${testa}${B.conti.length?html`<div class="scheda"><ul class="elenco-piatto">${B.conti.map(c=>html`<li class="link" data-azione="banca-conto" data-id="${c.id}"><span class="spazio"><b>${c.nome}</b><br><span class="piccolo silenzioso mono">${c.iban||'IBAN non scritto'}</span>${c.note?html`<br><span class="piccolo silenzioso">${c.note}</span>`:''}</span><span class="piccolo silenzioso">${plurale(B.documenti.filter(d=>d.contoId===c.id).length,'documento','documenti')}</span></li>`)}</ul></div>`:vuoto({icona:'euro',titolo:'Nessun conto',testo:'Aggiungi i conti dell\'azienda (per esempio MPS e Intesa): movimenti ed estratti conto si mettono mese per mese sotto ciascuno.',azione:{testo:'Nuovo conto',azione:'banca-conto'}})}`;
  if(t==='documenti'){
    const f=ui.filtri.banca||{};let righe=B.documenti.slice();
    if(f.tipo)righe=righe.filter(d=>d.tipo===f.tipo);if(f.anno)righe=righe.filter(d=>(d.data||'').startsWith(f.anno));
    if(f.cerca){const q=normalizzaTesto(f.cerca);righe=righe.filter(d=>normalizzaTesto(nomeDocumentoBanca(d)).includes(q))}
    righe.sort((a,b)=>(b.data||'')<(a.data||'')?-1:1);
    const anni=unici(B.documenti.map(d=>(d.data||'').slice(0,4)).filter(Boolean)).sort().reverse();
    return html`${testa}${drop}<div class="strumenti-tabella"><input type="search" placeholder="Cerca" value="${f.cerca||''}" data-cambio="banca-filtro" data-campo="cerca"><select data-cambio="banca-filtro" data-campo="tipo"><option value="">Tutti i tipi</option>${TIPI_BANCA.map(([v,n])=>html`<option value="${v}" ${f.tipo===v?'selected':''}>${n}</option>`)}</select><select data-cambio="banca-filtro" data-campo="anno"><option value="">Tutti gli anni</option>${anni.map(a=>html`<option ${f.anno===a?'selected':''}>${a}</option>`)}</select></div>
    ${righe.length?html`<div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>Documento</th><th>Riferito a</th><th class="num">Importo</th><th></th></tr></thead><tbody>${righe.map(d=>html`<tr class="cliccabile" data-azione="file-apri" data-id="${d.fileId}"><td><b>${tipoBanca(d.tipo)[1]}</b>${contoBanca(d.contoId)?' · '+contoBanca(d.contoId).nome:''}${d.descrizione?html`<br><span class="piccolo silenzioso">${d.descrizione}</span>`:''}</td><td>${periodoBanca(d)}</td><td class="num">${d.importo!=null?fEuro(d.importo):''}</td><td><button class="pulsante piccolo discreto icona" data-azione="banca-modifica" data-id="${d.id}" title="Modifica">${icona('modifica','piccola')}</button></td></tr>`)}</tbody></table></div>`:vuoto({icona:'euro',titolo:'Nessun documento',testo:'Trascina qui i PDF della banca.'})}`;
  }
  // mese per mese: una colonna per conto (movimenti o estratto), la carta e gli altri documenti
  const anno=+(ui.filtri.bancaAnno||new Date().getFullYear());
  const anni=unici([new Date().getFullYear(),...B.documenti.map(d=>+(d.data||'').slice(0,4)).filter(Boolean)]).sort((a,b)=>b-a);
  const ora=new Date().getFullYear()*100+new Date().getMonth()+1;
  const casella=(docs,m,vuota)=>{const fut=anno*100+m>ora;if(docs.length){const d=docs[0];return html`<button class="casella-v ok" data-azione="file-apri" data-id="${d.fileId}" title="${nomeDocumentoBanca(d)}"><b>${docs.length>1?plurale(docs.length,'file','file'):tipoBanca(d.tipo)[0]==='estratto_trim'?'trimestrale':tipoBanca(d.tipo)[1].split(' ')[0]}</b><span>apri</span></button>`}return html`<button class="casella-v ${fut?'futuro':vuota}" ${fut?'disabled':''} data-azione="banca-carica"><b>${fut?'':'—'}</b><span>${fut?'':'carica'}</span></button>`};
  const delMese=(m,filtro)=>B.documenti.filter(d=>(d.data||'').startsWith(anno+'-'+pad2(m))&&filtro(d));
  const conti=B.conti.length?B.conti:[{id:'',nome:'Conto'}];
  const col=conti.length+2;
  return html`${testa}${drop}
  <div class="riga mb-s"><span class="spazio"></span><select data-cambio="banca-anno" aria-label="Anno">${anni.map(a=>html`<option value="${a}" ${a===anno?'selected':''}>${a}</option>`)}</select></div>
  ${B.conti.length?'':html`<div class="avviso-inline info">${icona('info')}<div class="corpo">Aggiungi i conti dell'azienda con «Nuovo conto»: così movimenti ed estratti hanno ciascuno la sua colonna.</div></div>`}
  <div class="tabella-scorri"><div class="griglia-versamenti" style="grid-template-columns:90px repeat(${col},minmax(110px,1fr))"><span></span>${conti.map(c=>html`<span class="tv">${c.nome}</span>`)}<span class="tv">Carta di credito</span><span class="tv">Altri documenti</span>
    ${NOMI_MESI.map((nm,i)=>{const m=i+1;const altri=delMese(m,d=>!TIPI_CONTO.includes(d.tipo)&&d.tipo!=='carta');
      return html`<span class="mv">${capitalizza(nm)}</span>${conti.map(c=>casella(B.documenti.filter(d=>TIPI_CONTO.includes(d.tipo)&&(d.contoId||'')===c.id&&(d.data||'').startsWith(anno+'-'+pad2(m))||d.tipo==='estratto_trim'&&(d.contoId||'')===c.id&&(d.data||'').startsWith(String(anno))&&Math.ceil(+d.data.slice(5,7)/3)===Math.ceil(m/3)),m,'manca'))}${casella(delMese(m,d=>d.tipo==='carta'),m,'futuro')}<a class="casella-v ${altri.length?'ok':'futuro'}" href="#/banca/documenti"><b>${altri.length?plurale(altri.length,'file','file'):''}</b><span>${altri.length?unici(altri.map(d=>tipoBanca(d.tipo)[1])).join(', '):''}</span></a>`})}</div></div>
  <p class="piccolo silenzioso mt-s">Un estratto trimestrale copre i tre mesi del trimestre. Le caselle vuote dei conti aprono il caricamento.</p>`;
};
AZIONI['banca-anno']=(d,t)=>{ui.filtri.bancaAnno=t.value;render()};
AZIONI['banca-filtro']=(d,t)=>{ui.filtri.banca=Object.assign({},ui.filtri.banca,{[d.campo]:t.value});render();if(d.campo==='cerca')setTimeout(()=>{const i=el('[data-campo="cerca"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
function assicuraBanca(s){s.banca=s.banca||{};s.banca.conti=s.banca.conti||[];s.banca.documenti=s.banca.documenti||[];return s.banca}
AZIONI['banca-conto']=async d=>{
  const c=d.id?contoBanca(d.id):null;
  const v=await dialogoModulo(c?'Conto '+c.nome:'Nuovo conto',[{nome:'nome',etichetta:'Nome (come lo chiami: MPS, Intesa…)',obbligatorio:true},{nome:'iban',etichetta:'IBAN'},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}],c||{iban:banca().conti.length?'':stato.azienda.iban||''},
    {pulsantiExtra:c?[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(banca().documenti.some(x=>x.contoId===c.id))return informa('Il conto ha dei documenti','Prima sposta o elimina i suoi documenti.'),false;if(await conferma('Eliminare il conto '+c.nome+'?',{pericolo:true}))esegui('Eliminato conto '+c.nome,s=>{assicuraBanca(s).conti=s.banca.conti.filter(x=>x.id!==c.id)});return null}}]:[]});
  if(!v)return;v.iban=ibanCompatto(v.iban)||null;
  esegui(c?'Modificato conto '+v.nome:'Nuovo conto '+v.nome,s=>{const b=assicuraBanca(s);if(c)Object.assign(b.conti.find(x=>x.id===c.id),v);else b.conti.push(Object.assign({id:nuovoId('cc')},v))});
};
AZIONI['banca-carica']=async()=>{const fs=await scegliFile({accetta:'.pdf,image/*,.csv,.xls,.xlsx'});if(fs.length)await caricaBanca(fs)};
const campiDocBanca=()=>[{nome:'tipo',etichetta:'Tipo',tipo:'select',vuoto:false,opzioni:TIPI_BANCA.map(([v,t])=>({v,t}))},{nome:'contoId',etichetta:'Conto',tipo:'select',vuotoTesto:'nessuno',opzioni:banca().conti.map(c=>({v:c.id,t:c.nome}))},{nome:'data',etichetta:'Data (per i periodi: l\'ultimo giorno)',tipo:'data',obbligatorio:true},{nome:'descrizione',etichetta:'Descrizione (a chi, per cosa)'},{nome:'importo',etichetta:'Importo',tipo:'euro'}];
async function caricaBanca(files){
  const prog=dialogoAvanzamento('Lettura dei documenti',{testo:'Leggo i PDF…'});
  const righe=[];const annoCorr=new Date().getFullYear();
  for(let i=0;i<files.length;i++){const f=files[i];await prog.aggiorna(i,files.length,f.name);const perc=(f.webkitRelativePath||f.percorso||'')+'/'+f.name;
    let testo='';if(!dataBancaDaNome(f.name,perc,null)&&ePdf(f.type,f.name)){try{testo=(await estraiTestoPdf(f)).testo||''}catch(e){}}
    const tipo=tipoBancaDaNome(perc)||'movimenti';
    righe.push({i,f,tipo,contoId:contoDaNome(perc),data:dataBancaDaNome(f.name,perc,annoCorr)||dataBancaDaTesto(testo)||oggi(),descrizione:descrizioneBancaDaNome(f.name)})}
  prog.chiudi();
  const opz=(lista,val)=>lista.map(([v,t])=>html`<option value="${v}" ${v===val?'selected':''}>${t}</option>`);
  const ok=await dialogo({titolo:plurale(righe.length,'documento della banca','documenti della banca'),largo:true,corpo:html`<p class="piccolo secondario">Controlla tipo, conto e data: li ho proposti dal nome del file e dal testo. Per movimenti ed estratti la data è l'ultimo giorno del periodo.</p>
    <div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>File</th><th>Tipo</th><th>Conto</th><th>Data</th><th>Descrizione</th></tr></thead><tbody>${righe.map(r=>html`<tr data-i="${r.i}"><td class="taglia" style="max-width:180px" title="${r.f.name}">${r.f.name}</td><td><select data-c="tipo">${opz(TIPI_BANCA,r.tipo)}</select></td><td><select data-c="contoId"><option value="">—</option>${opz(banca().conti.map(c=>[c.id,c.nome]),r.contoId)}</select></td><td><input type="date" data-c="data" value="${r.data}"></td><td><input type="text" data-c="descrizione" value="${r.descrizione}" style="width:140px"></td></tr>`)}</tbody></table></div>
    ${banca().conti.length?'':html`<p class="piccolo warn-t mt-s">Non hai ancora conti: puoi caricare lo stesso e assegnarli dopo, o crearli prima con «Nuovo conto».</p>`}`,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Archivia',classe:'primario',primario:true,fn:v=>{for(const tr of tutti('tbody tr',v)){const r=righe[+tr.dataset.i];for(const c of ['tipo','contoId','data','descrizione'])r[c]=tr.querySelector(`[data-c="${c}"]`).value.trim()}return true}}]});
  if(!ok)return;
  const esiti=await acquisisciConAnteprima(righe.map(r=>r.f));if(!esiti)return;
  esegui('Archiviati '+plurale(esiti.length,'documento','documenti')+' della banca',s=>{const b=assicuraBanca(s);esiti.forEach((e,k)=>{const r=righe[k];if(b.documenti.some(d=>d.fileId===e.rec.id))return;b.documenti.push({id:nuovoId('db'),contoId:r.contoId||null,tipo:r.tipo,data:r.data||oggi(),descrizione:r.descrizione||null,importo:null,fileId:e.rec.id})})});
}
AZIONI['banca-modifica']=async d=>{
  const x=banca().documenti.find(y=>y.id===d.id);if(!x)return;
  const v=await dialogoModulo(nomeDocumentoBanca(x),campiDocBanca(),x,{pulsantiExtra:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare questo documento? Il file resta nel cestino 30 giorni.',{pericolo:true,ok:'Elimina'}))esegui('Eliminato documento della banca',s=>{assicuraBanca(s).documenti=s.banca.documenti.filter(y=>y.id!==x.id);cestinaFileOrfani(s)});return null}}]});
  if(!v)return;esegui('Modificato documento della banca',s=>{Object.assign(assicuraBanca(s).documenti.find(y=>y.id===x.id),{tipo:v.tipo,contoId:v.contoId||null,data:v.data,descrizione:v.descrizione||null,importo:v.importo===''||v.importo==null?null:+v.importo})});
};
