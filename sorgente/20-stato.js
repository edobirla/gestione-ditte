// ---------------------------------------------------------------------
// Stato applicativo e persistenza.
// Un solo oggetto `stato`. Ogni modifica passa da esegui(): salva in IndexedDB
// (in coda, con ritardo per accorpare) e registra un'istantanea per annulla.
// I documenti (blob) NON stanno qui: vedi ARCHIVIO. Qui solo i metadati.
// ---------------------------------------------------------------------
const VERSIONE_SCHEMA=5;
// Non cambiare mai questo nome: è la chiave con cui il browser conserva l'archivio. Cambiandolo,
// i dati già salvati resterebbero nel browser ma l'applicazione non li troverebbe più.
const NOME_DB='GestionalePavimass';
let db=null;
let stato=null;
const ui={vista:null,parametri:{},pannello:null,filtri:{},selezione:{},tema:'sistema',ricercaAperta:false,ultimoSalvataggio:null,erroreSalvataggio:null};
const storia={annulla:[],ripristina:[],max:40};

function apriDb(){
  return new Promise((ok,ko)=>{
    const rq=indexedDB.open(NOME_DB,2);
    rq.onupgradeneeded=e=>{
      const d=rq.result;
      if(!d.objectStoreNames.contains('dati')) d.createObjectStore('dati');
      if(!d.objectStoreNames.contains('file')) d.createObjectStore('file');
    };
    rq.onsuccess=()=>{db=rq.result;db.onversionchange=()=>{db.close();};ok(db)};
    rq.onerror=()=>ko(rq.error||new Error('IndexedDB non disponibile'));
    rq.onblocked=()=>ko(new Error('Database bloccato da un\'altra finestra'));
  });
}
function idbGet(store,chiave){return new Promise((ok,ko)=>{const t=db.transaction(store,'readonly');const r=t.objectStore(store).get(chiave);r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
function idbPut(store,chiave,valore){return new Promise((ok,ko)=>{const t=db.transaction(store,'readwrite');const r=t.objectStore(store).put(valore,chiave);t.oncomplete=()=>ok();t.onerror=()=>ko(t.error||r.error);t.onabort=()=>ko(t.error||new Error('Transazione annullata'))})}
function idbDel(store,chiave){return new Promise((ok,ko)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).delete(chiave);t.oncomplete=()=>ok();t.onerror=()=>ko(t.error)})}
function idbChiavi(store){return new Promise((ok,ko)=>{const t=db.transaction(store,'readonly');const r=t.objectStore(store).getAllKeys();r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
function idbSvuota(store){return new Promise((ok,ko)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).clear();t.oncomplete=()=>ok();t.onerror=()=>ko(t.error)})}

// ---- caricamento e salvataggio ----
async function caricaStato(){
  let s=await idbGet('dati','stato');
  let nuovo=false;
  if(!s){ s=datiIniziali(); nuovo=true; }
  s=migraStato(s);
  stato=s;
  if(nuovo){ await salvaSubito(); }
  else if(s.__migrato){ delete s.__migrato; await salvaSubito(); }
  return stato;
}
let timerSalvataggio=null,salvataggioInCorso=null,salvataggioSporco=false;
function salvaStato(){
  salvataggioSporco=true;
  clearTimeout(timerSalvataggio);
  timerSalvataggio=setTimeout(()=>{salvaSubito()},300);
}
async function salvaSubito(){
  clearTimeout(timerSalvataggio);
  if(!stato||!db) return;
  if(salvataggioInCorso){ await salvataggioInCorso; }
  salvataggioSporco=false;
  const copia=stato; // idbPut clona strutturalmente: nessun problema di mutazioni successive
  salvataggioInCorso=idbPut('dati','stato',copia).then(()=>{ui.ultimoSalvataggio=Date.now();ui.erroreSalvataggio=null}).catch(e=>{
    ui.erroreSalvataggio=e;
    if(typeof segnalaErrore==='function') segnalaErrore(e,'Salvataggio non riuscito: i dati potrebbero non essere stati scritti. Fai subito un backup.');
  }).finally(()=>{salvataggioInCorso=null;if(salvataggioSporco)salvaSubito()});
  return salvataggioInCorso;
}
// Chiusura finestra: si prova a scrivere subito quello che è in coda
window.addEventListener('pagehide',()=>{if(salvataggioSporco)salvaSubito()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&salvataggioSporco)salvaSubito()});

// ---- esegui / annulla / ripristina ----
// esegui(descrizione, fn): fn riceve lo stato e lo modifica in loco.
// opz.senzaRender: non ridisegnare la vista (per le griglie che aggiornano da sole il DOM)
// opz.silenzioso: non mostrare l'avviso "Annulla"
function esegui(descrizione,fn,opz){
  opz=opz||{};
  const prima=clona(stato);
  try{ fn(stato); }
  catch(e){ stato=prima; segnalaErrore(e,'Modifica non applicata: '+descrizione); throw e; }
  storia.annulla.push({descrizione,prima});
  if(storia.annulla.length>storia.max) storia.annulla.shift();
  storia.ripristina.length=0;
  stato.impostazioni.modificheDopoBackup=(stato.impostazioni.modificheDopoBackup||0)+1;
  stato.impostazioni.ultimaModifica=new Date().toISOString();
  salvaStato();
  aggiornaSpie();
  if(!opz.senzaRender) render();
  if(!opz.silenzioso&&typeof avviso==='function') avviso(descrizione,{azione:{testo:'Annulla',fn:annulla},durata:3500,silenzioso:true});
}
function annulla(){
  const v=storia.annulla.pop(); if(!v){avviso('Niente da annullare');return}
  storia.ripristina.push({descrizione:v.descrizione,dopo:clona(stato)});
  stato=v.prima; salvaStato(); aggiornaSpie(); render();
  avviso('Annullato: '+v.descrizione,{silenzioso:true});
}
function ripristina(){
  const v=storia.ripristina.pop(); if(!v){avviso('Niente da ripristinare');return}
  storia.annulla.push({descrizione:v.descrizione,prima:clona(stato)});
  stato=v.dopo; salvaStato(); aggiornaSpie(); render();
  avviso('Ripristinato: '+v.descrizione,{silenzioso:true});
}
function aggiornaSpie(){
  const ba=el('#btn-annulla'),br=el('#btn-ripristina');
  if(ba){ba.disabled=!storia.annulla.length;ba.title=storia.annulla.length?'Annulla: '+storia.annulla[storia.annulla.length-1].descrizione+' (⌘Z)':'Niente da annullare'}
  if(br){br.disabled=!storia.ripristina.length;br.title=storia.ripristina.length?'Ripristina: '+storia.ripristina[storia.ripristina.length-1].descrizione:'Niente da ripristinare'}
  aggiornaSpiaBackup();
}
function aggiornaSpiaBackup(){
  const sp=el('#spia-backup'); if(!sp||!stato) return;
  const imp=stato.impostazioni; const t=sp.querySelector('.testo-spia');
  sp.classList.remove('attenzione','critica');
  if(!imp.ultimoBackup){sp.classList.add('critica');t.textContent='Mai fatto il backup';sp.title='Nessun backup: fallo da Impostazioni';return}
  const gg=giorniTra(imp.ultimoBackup.slice(0,10),oggi());
  const n=imp.modificheDopoBackup||0;
  if(n===0){t.textContent='Backup '+fDataBreve(imp.ultimoBackup.slice(0,10));sp.title='Ultimo backup: '+fDataOra(imp.ultimoBackup)+'. Nessuna modifica da allora.';return}
  if(gg>=3){sp.classList.add('critica')} else sp.classList.add('attenzione');
  t.textContent=`${n} modifiche non salvate nel backup`;
  sp.title=`Ultimo backup: ${fDataOra(imp.ultimoBackup)} (${gg} giorni fa). ${n} modifiche da allora.`;
}

// ---- istantanee recuperabili prima delle operazioni rischiose ----
async function istantanea(nome){
  if(!stato||!db) return;
  const chiave='istantanea:'+nome;
  await idbPut('dati',chiave,{quando:new Date().toISOString(),stato:clona(stato)});
  // tieni al massimo 5 istantanee
  const chiavi=(await idbChiavi('dati')).filter(k=>String(k).startsWith('istantanea:'));
  if(chiavi.length>5){
    const tutte=[];for(const k of chiavi){const v=await idbGet('dati',k);tutte.push({k,quando:v&&v.quando||''})}
    tutte.sort((a,b)=>a.quando<b.quando?-1:1);
    for(const x of tutte.slice(0,tutte.length-5)) await idbDel('dati',x.k);
  }
}
async function elencoIstantanee(){
  const chiavi=(await idbChiavi('dati')).filter(k=>String(k).startsWith('istantanea:'));
  const out=[];for(const k of chiavi){const v=await idbGet('dati',k);out.push({chiave:k,nome:String(k).slice(11),quando:v&&v.quando})}
  return out.sort((a,b)=>a.quando<b.quando?1:-1);
}

// ---- migrazioni ----
// Ogni voce porta lo stato dalla versione n-1 alla n. Poi normalizzaStato() integra i campi mancanti.
// Un backup vecchio (versione minore) passa da qui e si apre senza errori.
const migrazioni={
  1:s=>{ /* versione iniziale */ return s; },
  2:s=>{ // introdotte le quote per cantiere sui movimenti: da cantiereId singolo a quote[]
    for(const m of (s.movimenti||[])){ if(m.cantiereId&&!(m.quote&&m.quote.length)){m.quote=[{cantiereId:m.cantiereId,importo:+m.imponibile||0}]} }
    return s;
  },
  3:s=>{ // le presenze passano da {ore,cantiere,committente} piatti per giorno a oggetti con codice separato
    for(const k of Object.keys(s.presenze||{})){ const mese=s.presenze[k]; for(const pid of Object.keys(mese.persone||{})){ const mp=mese.persone[pid]; for(const g of Object.keys(mp.giorni||{})){ const c=mp.giorni[g]; if(c&&typeof c==='object'&&typeof c.ore==='string'&&CODICI_ASSENZA[c.ore.toUpperCase()]){c.codice=c.ore.toUpperCase();delete c.ore} } } }
    return s;
  },
  4:s=>{ // dati bancari e condizioni per il preventivo: presi dal preventivo vero dell'azienda, mai inventati
    const a=s.azienda||(s.azienda={});const base=datiIniziali().azienda;
    for(const k of ['banca','iban','condizioniPagamento','notePreventivo']) if(!a[k]) a[k]=base[k];
    return s;
  },
  5:s=>{ // la firma per accettazione di chi viene nominato: sostituisce solo la riga di puntini, il
        // resto del modello (anche se l'utente lo ha cambiato) non si tocca
    const righe={nomina_preposto_cantiere:['Per accettazione, il Preposto: ______________________________','{{preposto.accettazione}}'],
      nomina_antincendio_cantiere:['Per accettazione: ______________________________','{{addettiAntincendio.accettazione}}'],
      nomina_primo_soccorso_cantiere:['Per accettazione: ______________________________','{{addettiPrimoSoccorso.accettazione}}']};
    for(const m of ((s.modelli||{}).dichiarazioni||[])){const r=righe[m.id];if(r&&m.testo&&m.testo.includes(r[0]))m.testo=m.testo.replace(r[0],r[1])}
    return s;
  },
};
function migraStato(s){
  let v=+s.versioneSchema||0;
  let cambiato=false;
  while(v<VERSIONE_SCHEMA){ v++; if(migrazioni[v]) s=migrazioni[v](s); s.versioneSchema=v; cambiato=true; }
  s=normalizzaStato(s);
  if(cambiato) s.__migrato=true;
  return s;
}
// Fonde lo stato con quello predefinito: i campi che non esistevano nascono qui.
function normalizzaStato(s){
  const base=datiIniziali(true); // scheletro senza dati reali (solo struttura e valori predefiniti)
  const out=Object.assign({},base,s);
  for(const k of Object.keys(base)){
    if(base[k]&&typeof base[k]==='object'&&!Array.isArray(base[k])&&s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])) out[k]=Object.assign({},base[k],s[k]);
    if(Array.isArray(base[k])&&!Array.isArray(s[k])) out[k]=[];
  }
  out.impostazioni=Object.assign({},base.impostazioni,s.impostazioni||{});
  out.impostazioni.soglie=Object.assign({},SOGLIE_PREDEFINITE,(s.impostazioni||{}).soglie||{});
  out.azienda=Object.assign({},base.azienda,s.azienda||{});
  out.azienda.indirizzo=Object.assign({},base.azienda.indirizzo,(s.azienda||{}).indirizzo||{});
  // tipi di documento e modelli: se mancano voci di sistema, si integrano senza toccare quelle dell'utente
  const tipiBase=datiIniziali().tipiDocumento;
  for(const t of tipiBase) if(!out.tipiDocumento.find(x=>x.id===t.id)) out.tipiDocumento.push(t);
  const modBase=datiIniziali().modelli;
  out.modelli=Object.assign({},modBase,s.modelli||{});
  for(const d of modBase.dichiarazioni) if(!out.modelli.dichiarazioni.find(x=>x.id===d.id)) out.modelli.dichiarazioni.push(d);
  if(!out.lavorazioni||!out.lavorazioni.length) out.lavorazioni=datiIniziali().lavorazioni;
  for(const p of out.persone){ p.qualifiche=p.qualifiche||[]; p.retribuzione=p.retribuzione||{}; if(p.attivo===undefined) p.attivo=!p.dataCessazione; }
  for(const c of out.cantieri){ c.lavorazioni=c.lavorazioni||[]; c.operai=c.operai||[]; c.documentiProdotti=c.documentiProdotti||[]; c.invii=c.invii||[]; c.diario=c.diario||[]; c.checklistExtra=c.checklistExtra||[]; c.indirizzo=c.indirizzo||{}; c.psc=c.psc||{}; c.denuncia=c.denuncia||{}; }
  for(const cl of out.clienti){ cl.ruoli=cl.ruoli||[]; cl.referenti=cl.referenti||[]; cl.interazioni=cl.interazioni||[]; cl.indirizzo=cl.indirizzo||{}; cl.documenti=cl.documenti||[]; }
  for(const d of out.documenti){ d.file=d.file||[]; }
  out.versioneSchema=VERSIONE_SCHEMA;
  return out;
}

// ---- accesso comodo ----
function perId(coll,id){return (stato[coll]||[]).find(x=>x.id===id)||null}
function persona(id){return perId('persone',id)}
function cantiere(id){return perId('cantieri',id)}
function cliente(id){return perId('clienti',id)}
function professionista(id){return perId('professionisti',id)}
function tipoDoc(id){return (stato.tipiDocumento||[]).find(t=>t.id===id)||null}
function fileMeta(id){return (stato.file||[]).find(f=>f.id===id||f.hash===id)||null}
function documentiDi(tipoSoggetto,id){return stato.documenti.filter(d=>d.soggettoTipo===tipoSoggetto&&d.soggettoId===id)}
function personeAttive(){return stato.persone.filter(p=>p.attivo)}
function nomeCliente(id){const c=cliente(id);return c?c.ragioneSociale:''}
function nomeCantiere(id){const c=cantiere(id);return c?c.nome:''}
function nomeProfessionista(id){const p=professionista(id);return p?[p.titolo,p.nome].filter(Boolean).join(' '):''}
function nomeMezzo(m){if(!m)return'[mezzo eliminato]';return [m.targa,[m.marca,m.modello].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
function soglie(){return stato.impostazioni.soglie||SOGLIE_PREDEFINITE}
function meseP(anno,mese){return (stato.presenze||{})[chiaveMese(anno,mese)]||null}
function assicuraMese(s,anno,mese){const k=chiaveMese(anno,mese);s.presenze[k]=s.presenze[k]||{persone:{}};return s.presenze[k]}
function assicuraMesePersona(s,anno,mese,pid){const m=assicuraMese(s,anno,mese);m.persone[pid]=m.persone[pid]||{giorni:{},aggiustamenti:[]};return m.persone[pid]}

// ---- gestione errori globale: mai bloccare, mai perdere dati ----
function segnalaErrore(e,contesto){
  console.error(contesto||'',e);
  const dettaglio=(contesto?contesto+'\n':'')+(e&&e.stack||String(e));
  if(typeof avviso==='function') avviso((contesto||'Si è verificato un errore')+' — '+((e&&e.message)||e),{tipo:'errore',durata:9000,azione:{testo:'Dettagli',fn:()=>dialogoErrore(dettaglio)}});
}
window.addEventListener('error',ev=>{ if(ev.error) segnalaErrore(ev.error,'Errore imprevisto'); });
window.addEventListener('unhandledrejection',ev=>{ segnalaErrore(ev.reason,'Operazione non riuscita'); });
