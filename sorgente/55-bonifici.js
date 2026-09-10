// ---------------------------------------------------------------------
// BONIFICI: archivio delle conferme di bonifico, ricercabile e filtrabile.
// ---------------------------------------------------------------------
VISTE.bonifici=function(r){
  if(r.query.nuovo){setTimeout(()=>dialogoBonifico(null),0);history.replaceState(null,'','#/bonifici')}
  if(r.query.bonifico){setTimeout(()=>dialogoBonifico(perId('bonifici',r.query.bonifico)),0);history.replaceState(null,'','#/bonifici')}
  const f=ui.filtri.bonifici||{};
  let righe=stato.bonifici.slice();
  if(f.cerca){const q=normalizzaTesto(f.cerca);righe=righe.filter(b=>normalizzaTesto([b.controparte,b.causale,b.note].join(' ')).includes(q))}
  if(f.anno) righe=righe.filter(b=>(b.data||'').startsWith(f.anno));
  righe.sort((a,b)=>(b.data||'')<(a.data||'')?-1:1);
  const anni=unici(stato.bonifici.map(b=>(b.data||'').slice(0,4)).filter(Boolean)).sort().reverse();
  return html`<div class="testata"><div><h1>Bonifici</h1><div class="sotto">${plurale(stato.bonifici.length,'conferma di bonifico','conferme di bonifico')}</div></div>
    <div class="azioni"><button class="pulsante primario" data-azione="bonifico-nuovo">${icona('piu')}Nuovo bonifico</button></div></div>
  <div class="strumenti-tabella"><input type="search" placeholder="Cerca per controparte, causale, note" value="${f.cerca||''}" data-cambio="filtro-bonifici" data-campo="cerca" aria-label="Cerca bonifici"><select data-cambio="filtro-bonifici" data-campo="anno"><option value="">Tutti gli anni</option>${anni.map(a=>html`<option value="${a}" ${f.anno===a?'selected':''}>${a}</option>`)}</select>${pulsanteCancellaFiltri(!!(f.cerca||f.anno),'filtro-bonifici-reset')}<span class="conteggio">${righe.length} bonifici · ${fEuro(somma(righe,b=>+b.importo||0),0)}</span></div>
  ${tabella({id:'bonifici',righe,onRiga:b=>apriBonifico(b.id),colonne:[
    {chiave:'data',titolo:'Data',principale:true,formatta:b=>fData(b.data)},
    {chiave:'controparte',titolo:'Controparte',valore:b=>b.controparte||''},
    {chiave:'causale',titolo:'Causale',valore:b=>b.causale||''},
    {chiave:'importo',titolo:'Importo',num:true,formatta:b=>fEuro(b.importo,2)},
    {chiave:'file',titolo:'Ricevuta',formatta:b=>b.fileId?icona('allega','piccola'):html`<span class="da-compilare piccolo">nessuna</span>`},
  ],vuoto:vuoto({icona:'bonifici',titolo:'Nessun bonifico',testo:'Carica qui le conferme di bonifico per tenerle ricercabili in un unico posto.',azione:{testo:'Nuovo bonifico',azione:'bonifico-nuovo'}})})}`;
};
AZIONI['filtro-bonifici']=(d,t)=>{ui.filtri.bonifici=Object.assign({},ui.filtri.bonifici,{[d.campo]:t.value});render();if(d.campo==='cerca')setTimeout(()=>{const i=el('[data-cambio="filtro-bonifici"][data-campo="cerca"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
AZIONI['filtro-bonifici-reset']=()=>{ui.filtri.bonifici={};render()};
document.addEventListener('input',debounce(e=>{const t=e.target;if(t.matches&&t.matches('[data-cambio="filtro-bonifici"][data-campo="cerca"]'))AZIONI['filtro-bonifici']({campo:'cerca'},t)},250));
AZIONI['bonifico-nuovo']=()=>dialogoBonifico(null);
// Le distinte scaricate dalla banca sono PDF con testo, quindi si leggono: la distinta MPS mette
// prima tutte le etichette e poi tutti i valori, quindi cercare il valore "vicino all'etichetta" non
// funziona (la prima versione pescava l'ordinante al posto del beneficiario). L'unico punto fermo è
// l'IBAN del beneficiario: sopra ci sono importo e nome, sotto la causale.
const RE_IBAN=/\bIT\d{2}[-\s]?(?:[A-Z0-9][-\s]?){20,30}/g;
const RE_IMPORTO=/^-?\d{1,3}(?:\.\d{3})*,\d{2}$|^-?\d+,\d{2}$/;
const RE_STATO=/^(inoltrata|eseguita|contabilizzata|annullata|respinta|revocata|in\s+attesa)/i;
const RE_DATA=/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/;
function ibanCompatto(x){return String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function leggiDistinta(testo){
  const righe=testo.split('\n').map(x=>x.trim());
  const nostro=ibanCompatto(stato.azienda.iban);
  const disposizioni=[];
  for(let i=0;i<righe.length;i++){
    RE_IBAN.lastIndex=0;const m=RE_IBAN.exec(righe[i]);
    if(!m) continue;
    const iban=ibanCompatto(m[0]).slice(0,27);
    if(iban.length<15||(nostro&&iban===nostro)) continue; // il nostro è il conto di addebito
    // sopra: le righe del nome, fino alla riga con l'importo
    const nome=[];let importo=null;
    for(let k=i-1;k>=0&&i-k<=8;k--){
      const r=righe[k];if(!r) continue;
      if(RE_IMPORTO.test(r)){importo=leggiNumero(r);break}
      if(RE_IBAN.test(r)||RE_STATO.test(r)) break;
      RE_IBAN.lastIndex=0;
      nome.unshift(r);
    }
    // sotto: la causale, fino allo stato della disposizione
    const causale=[];let data=null;
    for(let k=i+1;k<righe.length&&k-i<=12;k++){
      const r=righe[k];if(!r) continue;
      if(RE_STATO.test(r)){const d=RE_DATA.exec(righe.slice(k,k+3).join(' '));if(d)data=interpretaData(d[1]);break}
      RE_IBAN.lastIndex=0;if(RE_IBAN.test(r)||RE_IMPORTO.test(r)) break;
      causale.push(r);
    }
    disposizioni.push({importo,beneficiario:nome.join(' ').replace(/\s+/g,' ').trim(),iban,causale:causale.join(' ').replace(/\s+/g,' ').trim(),data});
  }
  const totM=/([\d.]+,\d{2})\s*EUR/.exec(testo);
  const dataDoc=RE_DATA.exec(testo);
  return {disposizioni,totale:totM?leggiNumero(totM[1]):null,data:dataDoc?interpretaData(dataDoc[1]):null};
}
async function proponiBonificoDaFile(file){
  if(!ePdf(file.type,file.name)) return null;
  let testo; try{ testo=(await estraiTestoPdf(file)).testo }catch(e){ return null }
  if(!testo||testo.replace(/\s/g,'').length<40) return null; // scansione senza testo: niente da leggere
  const d=leggiDistinta(testo);
  if(!d.disposizioni.length) return null;
  return d;
}
async function dialogoBonifico(b){
  const nuovo=!b; b=b||{data:oggi()};
  let fileNuovo=null;
  const campi=[{nome:'data',etichetta:'Data',tipo:'data',obbligatorio:true},{nome:'importo',etichetta:'Importo',tipo:'euro',obbligatorio:true},{nome:'controparte',etichetta:'Controparte'},{nome:'causale',etichetta:'Causale',largo:true},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}];
  const testoZona=()=>html`${icona('carica')}${fileNuovo?fileNuovo.name:'Trascina qui o clicca per aggiungere la ricevuta'}`;
  const zonaFile=()=>html`<div class="sezione-titolo">Ricevuta</div>${b.fileId?html`<div class="riga stretta mb-s"><span class="spazio taglia">${(fileMeta(b.fileId)||{}).nome||'file'}</span><button class="pulsante piccolo" data-azione="file-apri" data-id="${b.fileId}">${icona('occhio','piccola')}Apri</button></div>`:''}<div class="zona-drop" id="dlg-bonifico-drop" data-drop-locale>${testoZona()}</div>`;
  const v=await dialogoModulo(nuovo?'Nuovo bonifico':'Bonifico '+(b.controparte||''),campi,b,{coda:zonaFile(),alMontaggio:v=>{
    const zona=v.querySelector('#dlg-bonifico-drop');
    const form=v.querySelector('form');
    const rinfresca=()=>{zona.innerHTML=testoZona();};
    // riempie solo le caselle ancora vuote, mai quelle già scritte a mano
    const proponi=async()=>{
      if(!fileNuovo) return;
      zona.innerHTML=html`Leggo la distinta…`;
      const p=await proponiBonificoDaFile(fileNuovo);
      rinfresca();
      if(!p) return;
      // una distinta di stipendi contiene decine di disposizioni: si offrono tutte in un colpo
      if(p.disposizioni.length>1){
        const scelte=await scegliDisposizioni(p);
        if(scelte&&scelte.length){ v.chiudi(null); return creaBonificiDaDistinta(fileNuovo,scelte); }
      }
      const d0=p.disposizioni[0]||{};
      const messi=[];
      // «vuota» comprende il valore proposto dall'app (la data di oggi): quella letta sulla distinta vale di più
      const metti=(nome,valore,etichetta,predefinito)=>{const i=form.querySelector('[name='+nome+']');if(!i||!valore)return;if(i.value&&i.value!==predefinito)return;i.value=valore;i.dispatchEvent(new Event('change',{bubbles:true}));messi.push(etichetta)};
      metti('data',d0.data||p.data,'data',oggi());metti('importo',d0.importo!=null?fNum(d0.importo,2):'','importo');metti('controparte',d0.beneficiario,'beneficiario');metti('causale',d0.causale,'causale');
      if(messi.length) avviso('Letti dalla distinta: '+messi.join(', ')+'. Controlla prima di salvare.',{tipo:'attenzione'});
    };
    zona.addEventListener('click',async()=>{const fs=await scegliFile({multipli:false,accetta:'.pdf,image/*'});if(fs.length){fileNuovo=fs[0];rinfresca();proponi()}});
    zona.addEventListener('dragover',e=>{e.preventDefault();zona.classList.add('sopra');if(e.dataTransfer)e.dataTransfer.dropEffect='copy'});
    zona.addEventListener('dragleave',()=>zona.classList.remove('sopra'));
    zona.addEventListener('drop',async e=>{e.preventDefault();e.stopPropagation();zona.classList.remove('sopra');const fs=await fileDaDrop(e.dataTransfer);if(fs.length){fileNuovo=fs[0];rinfresca();proponi()}});
  },pulsantiExtra:nuovo?[]:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare questo bonifico?',{pericolo:true})){esegui('Eliminato bonifico',s=>{s.bonifici=s.bonifici.filter(x=>x.id!==b.id);cestinaFileOrfani(s)});return null}return false}}]});
  if(!v) return;
  let fileId=b.fileId||null;
  if(fileNuovo){const es=await acquisisciFile(fileNuovo,{});fileId=es.rec.id}
  if(nuovo) esegui('Nuovo bonifico',s=>{s.bonifici.push(Object.assign({id:nuovoId('bo'),fileId},v))});
  else esegui('Modificato bonifico',s=>{Object.assign(s.bonifici.find(x=>x.id===b.id),v,{fileId})});
}

// Distinta con più disposizioni (tipico degli stipendi): si vedono tutte e si scelgono quelle da
// registrare. Il file della distinta è uno solo e resta allegato a ognuna (l'archivio deduplica).
async function scegliDisposizioni(d){
  return dialogo({titolo:'La distinta contiene '+d.disposizioni.length+' bonifici',largo:true,
    corpo:html`<p class="piccolo secondario">Totale della distinta ${d.totale!=null?fEuro(d.totale):'—'}${d.data?' · '+fData(d.data):''}. Togli la spunta a quelli che non vuoi registrare.</p>
    <table class="tabella densa"><thead><tr><th></th><th>Beneficiario</th><th>Causale</th><th>Data</th><th class="num">Importo</th></tr></thead><tbody>${d.disposizioni.map((x,i)=>html`<tr><td><input type="checkbox" data-disp="${i}" checked aria-label="Registra"></td><td><b>${x.beneficiario||'—'}</b><br><span class="piccolo secondario mono">${x.iban}</span></td><td class="piccolo">${x.causale||''}</td><td>${x.data?fData(x.data):''}</td><td class="num">${x.importo!=null?fEuro(x.importo):'—'}</td></tr>`)}</tbody></table>`,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Compila uno solo a mano',valore:[]},{testo:'Registra i selezionati',classe:'primario',primario:true,fn:v=>tutti('[data-disp]:checked',v).map(x=>d.disposizioni[+x.dataset.disp])}]});
}
async function creaBonificiDaDistinta(file,disposizioni){
  const es=await acquisisciFile(file,{});
  esegui('Registrati '+disposizioni.length+' bonifici dalla distinta',s=>{
    for(const x of disposizioni) s.bonifici.push({id:nuovoId('bo'),data:x.data||oggi(),importo:x.importo,controparte:x.beneficiario||'',causale:x.causale||'',note:x.iban?'IBAN '+x.iban:'',fileId:es.rec.id});
  });
  avviso(disposizioni.length+' bonifici registrati dalla distinta: controlla gli importi.',{tipo:'attenzione'});
}
// ---- pannello laterale del bonifico (come per i documenti) ----
async function apriBonifico(id){
  const b=perId('bonifici',id); if(!b) return avviso('Bonifico non trovato',{tipo:'errore'});
  const m=b.fileId?fileMeta(b.fileId):null;
  const corpo=html`<div class="campi" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
    <div class="campo"><span class="etichetta-campo">Data</span><div>${b.data?fData(b.data):daCompilare()}</div></div>
    <div class="campo"><span class="etichetta-campo">Importo</span><div><b>${b.importo!=null?fEuro(b.importo,2):daCompilare()}</b></div></div>
    <div class="campo largo"><span class="etichetta-campo">Controparte</span><div>${b.controparte||daCompilare()}</div></div>
    ${b.causale?html`<div class="campo largo"><span class="etichetta-campo">Causale</span><div>${b.causale}</div></div>`:''}
    ${b.note?html`<div class="campo largo"><span class="etichetta-campo">Note</span><div>${b.note}</div></div>`:''}
  </div>
  <div class="sezione-titolo">Distinta</div>
  ${m?html`<ul class="elenco-piatto"><li>${icona(ePdf(m.mime,m.nome)?'pdf':'immagine')}<span class="spazio taglia" title="${m.nome}">${m.nome}</span><span class="piccolo secondario">${fPeso(m.dimensione)}</span><button class="pulsante piccolo" data-azione="file-scarica" data-id="${m.id}">${icona('scarica','piccola')}</button><button class="pulsante piccolo" data-azione="file-condividi" data-id="${m.id}">${icona('condividi','piccola')}</button></li></ul>`
    :html`<div class="zona-drop" data-azione="bonifico-allega" data-id="${b.id}" data-drop-bonifico="${b.id}">${icona('carica')}Trascina qui la distinta o clicca per allegarla</div>`}
  <div id="anteprima-bonifico" class="mt"></div>`;
  apriPannello({titolo:'Bonifico'+(b.controparte?' · '+b.controparte:''),largo:!!m,corpo,piede:html`<button class="pulsante primario" data-azione="bonifico-modifica" data-id="${b.id}">${icona('modifica')}Modifica</button><span class="spazio"></span><button class="pulsante pericolo" data-azione="bonifico-elimina" data-id="${b.id}">${icona('elimina')}Elimina</button>`});
  if(m){const a=await htmlAnteprimaFile(m.id);const c=el('#anteprima-bonifico');if(c)c.innerHTML=a}
}
AZIONI['bonifico-apri']=d=>apriBonifico(d.id);
AZIONI['bonifico-modifica']=async d=>{await dialogoBonifico(perId('bonifici',d.id));apriBonifico(d.id)};
AZIONI['bonifico-elimina']=async d=>{if(!(await conferma('Eliminare questo bonifico? La distinta resta nel cestino 30 giorni.',{pericolo:true,ok:'Elimina'})))return;chiudiPannello();esegui('Eliminato bonifico',s=>{s.bonifici=s.bonifici.filter(x=>x.id!==d.id);cestinaFileOrfani(s)})};
AZIONI['bonifico-allega']=async d=>{const fs=await scegliFile({multipli:false,accetta:'.pdf,image/*'});if(!fs.length)return;await allegaDistinta(d.id,fs[0])};
async function allegaDistinta(id,file){
  const es=await acquisisciFile(file,{});
  esegui('Allegata distinta',s=>{s.bonifici.find(x=>x.id===id).fileId=es.rec.id},{senzaRender:true});
  apriBonifico(id);render();
}
