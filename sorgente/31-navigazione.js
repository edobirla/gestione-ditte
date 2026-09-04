// ---------------------------------------------------------------------
// Navigazione: rotte #/sezione/id, menu, tema, ricerca globale, scorciatoie, trascinamento file.
// ---------------------------------------------------------------------
const MENU=[
  {id:'dashboard',testo:'Dashboard',icona:'dashboard'},
  {id:'operai',testo:'Operai',icona:'operai'},
  {id:'cantieri',testo:'Cantieri',icona:'cantieri'},
  {id:'clienti',testo:'Clienti',icona:'clienti'},
  {id:'presenze',testo:'Presenze',icona:'presenze'},
  {id:'documenti',testo:'Documenti',icona:'documenti',soloDesktop:true},
  {id:'preventivi',testo:'Preventivi',icona:'preventivi',soloDesktop:true},
  {id:'budget',testo:'Budget',icona:'budget',soloDesktop:true},
  {id:'impostazioni',testo:'Impostazioni',icona:'impostazioni',soloDesktop:true},
];
function leggiRotta(){
  const hash=location.hash.replace(/^#\/?/,'');
  const [percorso,query]=hash.split('?');
  const parti=percorso.split('/').filter(Boolean).map(decodeURIComponent);
  const q={};if(query)for(const kv of query.split('&')){const [k,v]=kv.split('=');q[decodeURIComponent(k)]=decodeURIComponent(v||'')}
  return {sezione:parti[0]||'dashboard',id:parti[1]||null,sotto:parti[2]||null,resto:parti.slice(3),query:q};
}
function vai(percorso){location.hash='#/'+percorso.replace(/^#?\/?/,'')}
function disegnaMenu(){
  const r=leggiRotta();
  const n=contatoriMenu();
  el('#menu').innerHTML=html`${MENU.map(m=>html`<a href="#/${m.id}" class="${r.sezione===m.id?'attivo':''} ${m.soloDesktop?'solo-desktop':''}" aria-current="${r.sezione===m.id?'page':'false'}">${icona(m.icona)}<span class="testo">${m.testo}</span>${n[m.id]?html`<span class="contatore" title="${n[m.id]} elementi da vedere">${n[m.id]}</span>`:''}</a>`)}<a href="#" class="altro" data-azione="menu-altro">${icona('altro')}<span class="testo">Altro</span></a><div class="fondo">Pavimass S.R.L.<br>v${VERSIONE_SCHEMA} · ${stato.impostazioni.dispositivo||''}</div>`;
}
function contatoriMenu(){
  const out={};
  try{ const sc=riepilogoScadenze(); out.operai=(sc.scaduti.length+sc.mancanti.length)||0; }catch(e){}
  return out;
}
// ---- render principale ----
const VISTE={};
function render(){
  if(!stato) return;
  const r=leggiRotta(); ui.rotta=r;
  disegnaMenu();
  const bi=el('#btn-indietro'); if(bi){ if(r.id){bi.classList.remove('nascosto');bi.dataset.genitore=r.sezione}else bi.classList.add('nascosto') }
  const cont=el('#contenuto');
  const fn=VISTE[r.sezione];
  const scrollPrima=cont.scrollTop;
  tabelleCliccabili.length=0;
  try{
    cont.innerHTML=fn?fn(r):html`<div class="vuoto">${icona('attenzione')}<h3>Sezione non trovata</h3><p>«${r.sezione}» non esiste.</p><a class="pulsante primario" href="#/dashboard">Vai alla dashboard</a></div>`;
  }catch(e){
    cont.innerHTML=html`<div class="avviso-inline critico">${icona('errore')}<div class="corpo"><b>Questa schermata ha avuto un errore</b> e non è stata disegnata. I dati sono al sicuro.<br><span class="mono">${(e&&e.message)||e}</span><div class="mt-s"><button class="pulsante piccolo" data-azione="dettaglio-errore" data-dettaglio="${(e&&e.stack)||''}">Dettagli</button> <a class="pulsante piccolo" href="#/dashboard">Dashboard</a></div></div></div>`;
    console.error(e);
  }
  if(ui.montaggi){for(const f of ui.montaggi)try{f(cont)}catch(e){console.error(e)}ui.montaggi=null}
  aggiornaSpie();
  document.title=titoloPagina(r);
}
function dopoRender(fn){(ui.montaggi=ui.montaggi||[]).push(fn)}
function titoloPagina(r){const m=MENU.find(x=>x.id===r.sezione);return (m?m.testo+' · ':'')+'Gestionale Pavimass'}
window.addEventListener('hashchange',()=>{ui.storicoProfondita=(ui.storicoProfondita||0)+1;chiudiPannello();chiudiRicerca();render();el('#contenuto').scrollTop=0;window.scrollTo(0,0)});

// ---- tema: sistema / chiaro / scuro, ricordato ----
function applicaTema(t){
  ui.tema=t||'sistema';
  document.documentElement.removeAttribute('data-tema');
  if(ui.tema==='chiaro'||ui.tema==='scuro') document.documentElement.setAttribute('data-tema',ui.tema);
  const b=el('#btn-tema');if(b){b.innerHTML=icona(ui.tema==='scuro'?'luna':ui.tema==='chiaro'?'sole':'monitor');b.title='Tema: '+({sistema:'come il sistema',chiaro:'chiaro',scuro:'scuro'}[ui.tema])+' (clic per cambiare)'}
  try{localStorage.setItem('pavimass-tema',ui.tema)}catch(e){}
}
function cicloTema(){const ord=['sistema','chiaro','scuro'];const i=ord.indexOf(ui.tema);applicaTema(ord[(i+1)%3]);if(stato){stato.impostazioni.tema=ui.tema;salvaStato()}avviso('Tema: '+({sistema:'come il sistema',chiaro:'chiaro',scuro:'scuro'}[ui.tema]),{silenzioso:true,durata:1500})}
function applicaDensita(d){document.documentElement.setAttribute('data-densita',d||'normale')}

// ---- ricerca globale ----
function indiceRicerca(){
  const voci=[];
  for(const p of stato.persone) voci.push({gruppo:'Persone',testo:nomePersona(p),sotto:p.mansione||p.tipo,href:'operai/'+p.id,chiavi:[p.cf,p.nome,p.cognome]});
  for(const c of stato.cantieri) voci.push({gruppo:'Cantieri',testo:c.nome,sotto:(c.stato||'')+' · '+(nomeCliente(c.committenteId)||nomeCliente(c.affidatariaId)||''),href:'cantieri/'+c.id,chiavi:[c.indirizzo&&c.indirizzo.comune]});
  for(const c of stato.clienti) voci.push({gruppo:'Clienti',testo:c.ragioneSociale,sotto:(c.ruoli||[]).join(', '),href:'clienti/'+c.id,chiavi:[c.piva]});
  for(const p of stato.professionisti) voci.push({gruppo:'Professionisti',testo:[p.titolo,p.nome].filter(Boolean).join(' '),sotto:(p.ruoli||[]).join(', '),href:'cantieri?professionista='+p.id});
  for(const d of stato.documenti){const t=tipoDoc(d.tipoId);const sogg=d.soggettoTipo==='persona'?nomePersona(persona(d.soggettoId)):d.soggettoTipo==='azienda'?'Azienda':d.soggettoTipo==='cantiere'?nomeCantiere(d.soggettoId):'';voci.push({gruppo:'Documenti',testo:(t?t.nome:'Documento')+(d.titolo?' · '+d.titolo:''),sotto:sogg,href:'documenti?doc='+d.id,chiavi:[d.note,...(d.file||[]).map(f=>(fileMeta(f)||{}).nome)]})}
  for(const b of stato.bustePaga) voci.push({gruppo:'Buste paga',testo:'Busta paga '+fMeseAnno(b.anno,b.mese),sotto:nomePersona(persona(b.personaId)),href:'documenti/buste?persona='+b.personaId});
  for(const p of stato.preventivi) voci.push({gruppo:'Preventivi',testo:'Preventivo '+(p.numero||'')+'/'+(p.anno||'')+' '+(p.oggetto||''),sotto:nomeCliente(p.clienteId),href:'preventivi/'+p.id});
  for(const m of stato.movimenti) voci.push({gruppo:'Movimenti',testo:(m.numero||'')+' '+(m.controparte||''),sotto:fData(m.data)+' · '+fEuro(m.imponibile),href:'budget?movimento='+m.id});
  const azioni=[
    {testo:'Nuovo operaio',href:'operai?nuovo=1'},{testo:'Nuovo cantiere',href:'cantieri?nuovo=1'},{testo:'Nuovo cliente',href:'clienti?nuovo=1'},{testo:'Nuovo preventivo',href:'preventivi?nuovo=1'},{testo:'Nuovo movimento',href:'budget?nuovo=1'},
    {testo:'Scadenzario',href:'operai/scadenzario'},{testo:'Presenze del mese',href:'presenze'},{testo:'Fai il backup',href:'impostazioni?backup=1'},{testo:'Caricamento iniziale documenti',href:'documenti/caricamento'},{testo:'Buste paga',href:'documenti/buste'},{testo:'Peso dell\'archivio',href:'impostazioni/peso'},{testo:'Cambia tema',azione:'tema'},{testo:'Diagramma temporale cantieri',href:'cantieri?vista=tempo'},{testo:'Confronto clienti',href:'clienti?vista=confronto'},
  ];
  for(const a of azioni) voci.push({gruppo:'Azioni',testo:a.testo,href:a.href,azione:a.azione,sotto:''});
  return voci;
}
let ricercaIdx=-1,ricercaVoci=[];
function cercaGlobale(q){
  const nq=normalizzaTesto(q); if(!nq) return [];
  const parole=nq.split(' ').filter(Boolean);
  const ris=[];
  for(const v of indiceRicerca()){
    const testo=normalizzaTesto([v.testo,v.sotto,...(v.chiavi||[])].filter(Boolean).join(' '));
    if(parole.every(p=>testo.includes(p))){const punteggio=(normalizzaTesto(v.testo).startsWith(nq)?0:1)+(v.gruppo==='Azioni'?0.5:0);ris.push({...v,punteggio})}
  }
  return ris.sort((a,b)=>a.punteggio-b.punteggio).slice(0,24);
}
function disegnaRicerca(){
  const box=el('#ricerca-risultati');const q=el('#ricerca').value;
  ricercaVoci=cercaGlobale(q);
  if(!q.trim()){box.classList.add('nascosto');return}
  if(!ricercaVoci.length){box.innerHTML=html`<div class="voce silenzioso">Nessun risultato per «${q}»</div>`;box.classList.remove('nascosto');return}
  let ultimo='';let i=0;
  box.innerHTML=ricercaVoci.map(v=>{const g=v.gruppo!==ultimo?html`<div class="gruppo">${v.gruppo}</div>`:'';ultimo=v.gruppo;return html`${g}<div class="voce ${i===ricercaIdx?'attiva':''}" data-i="${i++}" role="option">${v.testo}<span class="sotto">${v.sotto||''}</span></div>`}).join('');
  box.classList.remove('nascosto');
}
function scegliRicerca(i){const v=ricercaVoci[i];if(!v)return;chiudiRicerca();el('#ricerca').value='';if(v.azione==='tema')return cicloTema();vai(v.href)}
function chiudiRicerca(){el('#ricerca-risultati').classList.add('nascosto');ricercaIdx=-1}
function attivaRicerca(){
  const inp=el('#ricerca');
  inp.addEventListener('input',()=>{ricercaIdx=-1;disegnaRicerca()});
  inp.addEventListener('focus',()=>{if(inp.value)disegnaRicerca()});
  inp.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){e.preventDefault();ricercaIdx=Math.min(ricercaVoci.length-1,ricercaIdx+1);disegnaRicerca()}
    else if(e.key==='ArrowUp'){e.preventDefault();ricercaIdx=Math.max(0,ricercaIdx-1);disegnaRicerca()}
    else if(e.key==='Enter'){e.preventDefault();scegliRicerca(ricercaIdx<0?0:ricercaIdx)}
    else if(e.key==='Escape'){chiudiRicerca();inp.blur()}
  });
  el('#ricerca-risultati').addEventListener('mousedown',e=>{const v=e.target.closest('.voce[data-i]');if(v){e.preventDefault();scegliRicerca(+v.dataset.i)}});
  document.addEventListener('click',e=>{if(!e.target.closest('.cerca-globale'))chiudiRicerca()});
  el('#ricerca-kbd').textContent=eMac()?'⌘K':'Ctrl K';
}
// ---- scorciatoie ----
document.addEventListener('keydown',e=>{
  const inCampo=/INPUT|TEXTAREA|SELECT/.test(document.activeElement&&document.activeElement.tagName)||document.activeElement&&document.activeElement.isContentEditable;
  const mod=e.metaKey||e.ctrlKey;
  if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();el('#ricerca').focus();el('#ricerca').select();return}
  if(mod&&e.key.toLowerCase()==='z'&&!inCampo){e.preventDefault();if(e.shiftKey)ripristina();else annulla();return}
  if(mod&&e.key.toLowerCase()==='p'&&ui.anteprimaAperta){e.preventDefault();window.print();return}
  if(e.key==='Escape'&&ui.pannello&&!el('#dialoghi').children.length){chiudiPannello()}
  if(!inCampo&&!mod&&!e.altKey){
    const g={'1':'dashboard','2':'operai','3':'cantieri','4':'clienti','5':'presenze','6':'documenti','7':'preventivi','8':'budget','9':'impostazioni'}[e.key];
    if(g&&e.shiftKey===false&&document.activeElement===document.body){vai(g)}
  }
});
// ---- azioni delegate: data-azione="nome" → AZIONI[nome](el, dataset) ----
const AZIONI={};
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-azione]'); if(!t) return;
  const nome=t.dataset.azione; const fn=AZIONI[nome];
  if(!fn){console.warn('Azione sconosciuta',nome);return}
  e.preventDefault();
  try{ const r=fn(t.dataset,t,e); if(r&&r.catch) r.catch(err=>segnalaErrore(err,'Azione non riuscita: '+nome)); }catch(err){segnalaErrore(err,'Azione non riuscita: '+nome)}
});
document.addEventListener('change',e=>{
  const t=e.target.closest('[data-cambio]'); if(!t) return;
  const fn=AZIONI[t.dataset.cambio]; if(fn){try{const r=fn(t.dataset,t,e);if(r&&r.catch)r.catch(err=>segnalaErrore(err))}catch(err){segnalaErrore(err)}}
});
AZIONI['dettaglio-errore']=d=>dialogoErrore(d.dettaglio);
AZIONI['tema']=()=>cicloTema();
AZIONI['menu-altro']=()=>{
  const r=leggiRotta();
  const velo=creaEl(html`<div class="velo" style="align-items:flex-end;padding:0"><div class="foglio-altro">${MENU.map(m=>html`<a href="#/${m.id}" class="${r.sezione===m.id?'attivo':''}">${icona(m.icona)}${m.testo}</a>`)}</div></div>`);
  velo.addEventListener('click',()=>velo.remove());el('#dialoghi').appendChild(velo);
};
AZIONI['vai']=d=>vai(d.href);
AZIONI['indietro']=()=>history.back();
AZIONI['pagina-indietro']=d=>{if(ui.storicoProfondita>0)history.back();else vai(d.genitore||'dashboard')};
AZIONI['chiudi-pannello']=()=>chiudiPannello();
AZIONI['copia']=d=>copiaNegliAppunti(d.testo).then(()=>avviso('Copiato negli appunti'));

// ---- trascinamento file: un solo gestore per tutta l'app ----
// Un solo dragover/drop (invece di più gestori sovrapposti in cattura e bolla) evidenzia solo la
// zona di rilascio effettiva sotto il cursore, ricalcolata a ogni evento — niente contatore
// dragenter/dragleave da tenere in sincronia, che su Chrome si disallineava facilmente e lasciava
// il drop "morto" nonostante il cursore mostrasse la copia.
let zonaDropAttiva=null;
function trovaZonaDrop(target){return target&&target.closest&&(target.closest('[data-drop-doc]')||target.closest('[data-drop-soggetto]')||target.closest('[data-drop-caricamento]')||target.closest('[data-drop-buste]')||target.closest('.zona-drop'))}
function evidenziaZona(z){if(z===zonaDropAttiva)return;if(zonaDropAttiva)zonaDropAttiva.classList.remove('sopra');if(z)z.classList.add('sopra');zonaDropAttiva=z}
window.addEventListener('dragover',e=>{
  if(!e.dataTransfer||!Array.from(e.dataTransfer.types).includes('Files'))return;
  e.preventDefault();e.dataTransfer.dropEffect='copy';
  evidenziaZona(trovaZonaDrop(e.target));
});
window.addEventListener('dragleave',e=>{if(e.clientX<=0||e.clientY<=0||e.clientX>=window.innerWidth||e.clientY>=window.innerHeight)evidenziaZona(null)});
window.addEventListener('drop',async e=>{
  if(!e.dataTransfer||!e.dataTransfer.files||!e.dataTransfer.files.length) return;
  e.preventDefault();
  const z=trovaZonaDrop(e.target)||zonaDropAttiva;
  evidenziaZona(null);
  if(z&&z.hasAttribute('data-drop-locale')) return; // zona che gestisce da sola (es. dialogo documento)
  const files=await fileDaDrop(e.dataTransfer);
  if(!files.length) return;
  if(z){
    if(z.dataset.dropDoc) return allegaFilesADocumento(z.dataset.dropDoc,files);
    if(z.dataset.dropSoggetto){const [tipo,id]=z.dataset.dropSoggetto.split(':');return dialogoDocumento({soggettoTipo:tipo,soggettoId:id},files)}
    if(z.hasAttribute('data-drop-caricamento')){ui.caricamentoFiles=files;ui.caricamentoRighe=null;return render()}
    if(z.hasAttribute('data-drop-buste')) return accodaBuste(files);
  }
  if(typeof acquisizioneRapida==='function') acquisizioneRapida(files);
});
// Legge cartelle intere trascinate (webkitGetAsEntry) e restituisce File con percorso relativo
async function fileDaDrop(dt){
  const out=[];
  const items=dt.items?Array.from(dt.items):[];
  const entries=items.map(i=>i.webkitGetAsEntry?i.webkitGetAsEntry():null);
  if(entries.some(Boolean)){
    for(const en of entries){ if(en) await leggiEntry(en,'',out); }
    if(out.length) return out;
  }
  for(const f of Array.from(dt.files)){ f.percorso=f.webkitRelativePath||f.name; out.push(f); }
  return out;
}
function leggiEntry(entry,percorso,out){
  return new Promise(risolvi=>{
    if(entry.isFile){ entry.file(f=>{ try{ f.percorso=percorso+f.name; }catch(e){} out.push(f); risolvi(); },()=>risolvi()); }
    else if(entry.isDirectory){
      const reader=entry.createReader();const tutteVoci=[];
      const leggi=()=>reader.readEntries(async voci=>{ if(!voci.length){ for(const v of tutteVoci) await leggiEntry(v,percorso+entry.name+'/',out); risolvi(); } else { tutteVoci.push(...voci); leggi(); } },()=>risolvi());
      leggi();
    } else risolvi();
  });
}
function scegliFile(opz){
  opz=opz||{};
  return new Promise(risolvi=>{
    const inp=el(opz.cartella?'#input-cartella-nascosto':'#input-file-nascosto');
    inp.value='';inp.multiple=opz.multipli!==false;inp.accept=opz.accetta||'';
    inp.onchange=()=>{const fs=Array.from(inp.files||[]);fs.forEach(f=>{try{f.percorso=f.webkitRelativePath||f.name}catch(e){}});risolvi(fs)};
    inp.click();
  });
}
