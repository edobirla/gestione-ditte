// ---------------------------------------------------------------------
// PREPARA UN INVIO: quando qualcuno chiede «mandami attestati e visite di tutti», si scelgono i tipi
// di documento e le persone, e l'app prepara una cartella ordinata (per operaio o per tipo): salvata
// direttamente in una cartella del computer, scaricata come ZIP o condivisa.
// ui.invio = {tipi:{[tipoId]:true}, persone:{[pid]:true}, storico:false, per:'operaio'|'tipo'}
// ---------------------------------------------------------------------
function statoInvio(){
  if(!ui.invio) ui.invio={tipi:{},persone:Object.fromEntries(stato.persone.filter(p=>p.attivo).map(p=>[p.id,true])),storico:false,per:'operaio'};
  return ui.invio;
}
// I documenti da mettere: per ogni persona e tipo scelto, quello in corso (o anche i vecchi), solo se ha un file.
function vociInvio(){
  const st=statoInvio();const voci=[],mancanti=[];
  const persone=stato.persone.filter(p=>st.persone[p.id]);const tipi=stato.tipiDocumento.filter(t=>st.tipi[t.id]);
  for(const p of persone) for(const t of tipi.filter(t=>t.ambito==='persona')){
    const docs=documentiPersona(p.id).filter(d=>d.tipoId===t.id&&(d.file||[]).length);
    const scelti=st.storico?docs:(()=>{const m=migliorDocumento(docs.filter(d=>!documentoSuperato(d)),t,oggi(),soglie())||migliorDocumento(docs,t,oggi(),soglie());return m?[m.doc]:[]})();
    if(!scelti.length) mancanti.push({p,t});
    for(const d of scelti) voci.push({d,t,chi:nomePersona(p)});
  }
  for(const t of tipi.filter(t=>t.ambito==='azienda')){
    const docs=stato.documenti.filter(d=>d.soggettoTipo==='azienda'&&d.tipoId===t.id&&(d.file||[]).length);
    const m=st.storico?docs:(migliorDocumento(docs.filter(d=>!documentoSuperato(d)),t,oggi(),soglie())||{}).doc;
    const scelti=st.storico?docs:m?[m]:[];
    if(!scelti.length) mancanti.push({p:null,t});
    for(const d of scelti) voci.push({d,t,chi:'Azienda'});
  }
  return {voci,mancanti,nFile:somma(voci,v=>v.d.file.length)};
}
function vistaInvio(){
  const st=statoInvio();const {voci,mancanti,nFile}=vociInvio();
  const conDoc=t=>stato.documenti.filter(d=>d.tipoId===t.id&&(d.file||[]).length).length;
  const tipi=stato.tipiDocumento.filter(t=>(t.ambito==='persona'||t.ambito==='azienda')&&conDoc(t));
  const gruppi=raggruppa(tipi,t=>t.ambito==='azienda'?'Azienda':CATEGORIE_TIPO_DOC[t.categoria]||'Altro');
  const persone=stato.persone.filter(p=>p.attivo||st.persone[p.id]);
  const nTipi=Object.values(st.tipi).filter(Boolean).length,nPers=persone.filter(p=>st.persone[p.id]).length;
  return html`<div class="bento">
  <div class="guscio c-7"><div class="scheda"><div class="intesta"><h2>1 · Quali documenti</h2><span class="riga stretta"><button class="pulsante piccolo discreto" data-azione="invio-tipi" data-valore="tutti">Tutti</button><button class="pulsante piccolo discreto" data-azione="invio-tipi" data-valore="nessuno">Nessuno</button></span></div>
    ${Array.from(gruppi.entries()).map(([g,tt])=>html`<div class="sezione-titolo">${g}</div><div class="griglia due">${tt.map(t=>html`<label class="riga stretta"><input type="checkbox" data-cambio="invio-tipo" data-id="${t.id}" ${st.tipi[t.id]?'checked':''}><span>${t.nome}</span><span class="piccolo silenzioso">${conDoc(t)}</span></label>`)}</div>`)}</div></div>
  <div class="guscio c-5"><div class="scheda"><div class="intesta"><h2>2 · Di chi</h2><span class="riga stretta"><button class="pulsante piccolo discreto" data-azione="invio-persone" data-valore="tutti">Tutti</button><button class="pulsante piccolo discreto" data-azione="invio-persone" data-valore="nessuno">Nessuno</button></span></div>
    ${stato.cantieri.some(c=>(c.operai||[]).length&&c.stato!=='chiuso')?html`<select class="mb-s" data-cambio="invio-cantiere" aria-label="Solo gli operai di un cantiere"><option value="">Solo gli operai di un cantiere…</option>${stato.cantieri.filter(c=>(c.operai||[]).length&&c.stato!=='chiuso').map(c=>html`<option value="${c.id}">${c.nome}</option>`)}</select>`:''}
    <div class="colonna" style="gap:4px">${persone.map(p=>html`<label class="riga stretta"><input type="checkbox" data-cambio="invio-persona" data-id="${p.id}" ${st.persone[p.id]?'checked':''}>${avatar(p,'mini')}<span>${nomePersona(p)}</span></label>`)}</div></div></div>
  <div class="guscio c-12"><div class="scheda"><div class="intesta"><h2>3 · Come prepararli</h2></div>
    <div class="riga" style="flex-wrap:wrap;gap:16px"><div class="gruppo-pulsanti">${[['operaio','Una cartella per operaio'],['tipo','Una cartella per tipo']].map(([v,t])=>html`<button class="pulsante ${st.per===v?'attivo':''}" data-azione="invio-per" data-valore="${v}">${t}</button>`)}</div>
      <label class="riga stretta"><input type="checkbox" data-cambio="invio-storico" ${st.storico?'checked':''}>Anche i documenti vecchi (rinnovati o scaduti)</label></div>
    <p class="mt">${nTipi&&nPers?html`<b>${plurale(nFile,'file','file')}</b> da ${plurale(voci.length,'documento','documenti')} · ${plurale(nTipi,'tipo','tipi')} · ${plurale(nPers,'persona','persone')}`:html`<span class="silenzioso">Scegli almeno un tipo di documento e una persona.</span>`}</p>
    ${mancanti.length?html`<details class="mt-s"><summary class="warn-t piccolo">${plurale(mancanti.length,'documento mancante','documenti mancanti')} (non hanno il file in archivio)</summary><ul class="piccolo">${mancanti.map(m=>html`<li>${m.p?nomePersona(m.p):'Azienda'}: ${m.t.nome}</li>`)}</ul></details>`:''}
    <div class="riga mt">${'showDirectoryPicker' in window?html`<button class="pulsante primario" data-azione="invio-cartella" ${nFile?'':'disabled'}>${icona('cartella','piccola')}Salva in una cartella…</button>`:''}<button class="pulsante ${'showDirectoryPicker' in window?'':'primario'}" data-azione="invio-zip" ${nFile?'':'disabled'}>${icona('scarica','piccola')}Scarica ZIP</button><button class="pulsante" data-azione="invio-condividi" ${nFile?'':'disabled'}>${icona('condividi','piccola')}Condividi ZIP</button></div></div></div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.cambio||!t.dataset.cambio.startsWith('invio-'))return;const st=statoInvio();const k=t.dataset.cambio;
  if(k==='invio-tipo')st.tipi[t.dataset.id]=t.checked;else if(k==='invio-persona')st.persone[t.dataset.id]=t.checked;else if(k==='invio-storico')st.storico=t.checked;
  else if(k==='invio-cantiere'&&t.value){const c=cantiere(t.value);st.persone=Object.fromEntries((c.operai||[]).map(id=>[id,true]))}
  render()});
AZIONI['invio-tipi']=d=>{const st=statoInvio();st.tipi=d.valore==='tutti'?Object.fromEntries(stato.tipiDocumento.filter(t=>t.ambito==='persona').map(t=>[t.id,true])):{};render()};
AZIONI['invio-persone']=d=>{const st=statoInvio();st.persone=d.valore==='tutti'?Object.fromEntries(stato.persone.filter(p=>p.attivo).map(p=>[p.id,true])):{};render()};
AZIONI['invio-per']=d=>{statoInvio().per=d.valore;render()};
// Percorso di ogni file dentro la cartella: «Rossi Mario/Visita medica - Rossi Mario - 12-03-2026.pdf»
// (o per tipo): il nome del file segue il criterio unico di nomeChiaroDocumento
async function fileInvio(prog){
  const st=statoInvio();const {voci}=vociInvio();const out=[];const usati=new Set();const pul=s=>pulisciNomeFile(s);
  for(let i=0;i<voci.length;i++){
    const v=voci[i];if(prog){if(prog.annullato)return null;await prog.aggiorna(i,voci.length,v.chi+' · '+v.t.nome)}
    const cartella=pul(st.per==='tipo'?v.t.nome:v.chi);const base=nomeChiaroDocumento(v.d);
    for(const fid of v.d.file){const m=fileMeta(fid);if(!m)continue;const b=await leggiFile(m.hash);if(!b)continue;
      const nome=nomeUnico(usati,cartella+'/'+base+'.'+(estensioneDi(m.nome)||'pdf')).slice(cartella.length+1);out.push({cartella,nome,dati:b})}
  }
  return out;
}
const nomeInvio=()=>'Documenti '+pulisciNomeFile(stato.azienda.ragioneSociale||'')+' '+fDataBreve(oggi()).replace(/\//g,'-');
// Chrome ed Edge scrivono direttamente in una cartella scelta: la finestra di scelta va aperta subito
// al clic, prima di leggere i file, altrimenti il browser la rifiuta.
AZIONI['invio-cartella']=async()=>{
  let dir;try{dir=await window.showDirectoryPicker({mode:'readwrite',id:'invio'})}catch(e){if(e&&e.name==='AbortError')return;return segnalaErrore(e,'Non riesco ad aprire la cartella')}
  const prog=dialogoAvanzamento('Preparazione dei documenti',{annullabile:true});
  try{
    const files=await fileInvio(prog);if(!files){prog.chiudi();return}
    const radice=await dir.getDirectoryHandle(nomeInvio(),{create:true});const sotto={};
    for(const f of files){const d=sotto[f.cartella]||(sotto[f.cartella]=await radice.getDirectoryHandle(f.cartella,{create:true}));const fh=await d.getFileHandle(f.nome,{create:true});const w=await fh.createWritable();await w.write(f.dati);await w.close()}
    prog.chiudi();informa('Cartella pronta',html`<p>Nella cartella che hai scelto c'è <b>${nomeInvio()}</b> con ${plurale(files.length,'file','file')} in ${plurale(Object.keys(sotto).length,'sottocartella','sottocartelle')}.</p>`);
  }catch(e){prog.chiudi();segnalaErrore(e,'Non sono riuscito a salvare nella cartella')}
};
async function zipInvio(){
  const prog=dialogoAvanzamento('Preparazione dello ZIP',{annullabile:true});
  try{const files=await fileInvio(prog);if(!files){prog.chiudi();return null}const blob=await creaZip(files.map(f=>({nome:nomeInvio()+'/'+f.cartella+'/'+f.nome,dati:f.dati})));prog.chiudi();return blob}
  catch(e){prog.chiudi();segnalaErrore(e,'Non sono riuscito a preparare lo ZIP');return null}
}
AZIONI['invio-zip']=async()=>{const b=await zipInvio();if(b)scaricaBlob(b,nomeInvio()+'.zip')};
AZIONI['invio-condividi']=async()=>{const b=await zipInvio();if(b)await condividiOScarica(b,nomeInvio()+'.zip',{titolo:nomeInvio()})};
