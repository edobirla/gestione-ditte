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
  ${tabella({id:'bonifici',righe,onRiga:b=>dialogoBonifico(b),colonne:[
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
// Le distinte scaricate dalla banca sono PDF con testo: si leggono e si propongono i campi, così
// non si ricompila tutto a mano. Non si salva mai da sola: riempie solo le caselle ancora vuote e
// lo dice, il controllo resta all'utente (sono conferme di denaro uscito).
function vicinoAEtichetta(testo,parole,valoreRe,finestra){
  if(!testo) return null;
  for(const parola of parole){
    const re=new RegExp(parola,'gi'); let m;
    while((m=re.exec(testo))){
      const dopo=testo.slice(m.index+m[0].length,m.index+m[0].length+(finestra||80));
      const vm=valoreRe.exec(dopo); valoreRe.lastIndex=0;
      if(vm) return vm[1]!==undefined?vm[1].trim():vm[0].trim();
    }
  }
  return null;
}
async function proponiBonificoDaFile(file){
  if(!ePdf(file.type,file.name)) return null;
  let testo; try{ testo=(await estraiTestoPdf(file)).testo }catch(e){ return null }
  if(!testo||testo.replace(/\s/g,'').length<40) return null; // scansione senza testo: niente da leggere
  const importoRe=/^[^\d\n]{0,12}(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/;
  const nomeRe=/^[:\s]{0,3}([A-ZÀ-Ü][^\n]{2,60})/;
  const importoTesto=vicinoAEtichetta(testo,['importo(?!\\s*in\\s*lettere)','totale\\s+addebito','totale\\s+bonifico','divisa\\s+e\\s+importo'],importoRe,60);
  return {
    importo:importoTesto?leggiNumero(importoTesto):null,
    controparte:vicinoAEtichetta(testo,['beneficiari[oa]','a\\s+favore\\s+di','destinatari[oa]','ordinante\\s+a'],nomeRe,90),
    causale:vicinoAEtichetta(testo,['causale','descrizione\\s+operazione','motivo\\s+del\\s+pagamento'],nomeRe,120),
    data:estraiDataDaTesto(testo,['data\\s+esecuzione','data\\s+valuta','data\\s+operazione','eseguito\\s+il','disposto\\s+il','data\\s+contabile','data']),
  };
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
      const messi=[];
      // «vuota» comprende il valore proposto dall'app (la data di oggi): quella letta sulla distinta vale di più
      const metti=(nome,valore,etichetta,predefinito)=>{const i=form.querySelector('[name='+nome+']');if(!i||!valore)return;if(i.value&&i.value!==predefinito)return;i.value=valore;i.dispatchEvent(new Event('change',{bubbles:true}));messi.push(etichetta)};
      metti('data',p.data,'data',oggi());metti('importo',p.importo!=null?fNum(p.importo,2):'','importo');metti('controparte',p.controparte,'beneficiario');metti('causale',p.causale,'causale');
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
