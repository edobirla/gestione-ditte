// ---------------------------------------------------------------------
// DOCUMENTI: archivio trasversale, anteprime, dialogo documento, acquisizione con compressione,
// caricamento iniziale (classificatore), buste paga, peso dell'archivio, modelli, documenti generati.
// ---------------------------------------------------------------------
VISTE.documenti=function(r){
  if(r.query.doc){setTimeout(()=>apriDocumento(r.query.doc),0);history.replaceState(null,'','#/documenti')}
  const sotto=r.id||'archivio';
  const testa=html`<div class="testata"><div><h1>Documenti</h1><div class="sotto">${stato.file.filter(f=>!f.cestinato).length} file · ${fPeso(somma(stato.file.filter(f=>!f.cestinato),f=>f.dimensione))} nell'archivio</div></div><div class="azioni"><button class="pulsante" data-azione="assistente-documento-esterno" title="Copri intestazioni, aggiungi timbro/firma e dati del legale rappresentante su un documento di un'altra azienda">${icona('magia')}Assistente documento esterno</button><button class="pulsante" data-azione="documento-nuovo">${icona('allega')}Aggiungi documento</button><a class="pulsante" href="#/documenti/caricamento">${icona('cartella')}Caricamento cartelle</a></div></div>
  ${linguette('documenti',[{id:'archivio',testo:'Archivio',icona:'documenti'},{id:'buste',testo:'Buste paga',icona:'busta-paga'},{id:'modelli',testo:'Modelli',icona:'firma'},{id:'generati',testo:'Generati',icona:'stampa'},{id:'caricamento',testo:'Caricamento',icona:'cartella'}].map(x=>({...x,href:'#/documenti/'+(x.id==='archivio'?'':x.id)})),sotto)}`;
  const corpo=sotto==='buste'?vistaBustePaga(r):sotto==='modelli'?vistaModelli(r):sotto==='generati'?vistaGenerati():sotto==='caricamento'?vistaCaricamento():vistaArchivio();
  return html`${testa}${corpo}`;
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-linguetta="documenti"]');if(b){e.stopImmediatePropagation();vai('documenti/'+(b.dataset.valore==='archivio'?'':b.dataset.valore))}},true);

function vistaArchivio(){
  const f=ui.filtri.archivio||{};
  let docs=stato.documenti.map(d=>({d,info:infoDocumento(d),tipo:tipoDoc(d.tipoId),peso:somma((d.file||[]).map(id=>fileMeta(id)).filter(Boolean),m=>m.dimensione)}));
  if(f.soggetto) docs=docs.filter(x=>(x.d.soggettoTipo+':'+x.d.soggettoId)===f.soggetto||(f.soggetto==='azienda'&&x.d.soggettoTipo==='azienda'));
  if(f.tipo) docs=docs.filter(x=>x.d.tipoId===f.tipo);
  if(f.anno) docs=docs.filter(x=>(x.d.dataEmissione||'').startsWith(f.anno)||(x.info.data||'').startsWith(f.anno));
  if(f.stato) docs=docs.filter(x=>x.info.stato===f.stato);
  if(f.cerca){const q=normalizzaTesto(f.cerca);docs=docs.filter(x=>normalizzaTesto([x.tipo&&x.tipo.nome,x.d.titolo,x.d.note,nomeSoggettoDoc(x.d),...(x.d.file||[]).map(id=>(fileMeta(id)||{}).nome)].join(' ')).includes(q))}
  const soggetti=[{v:'azienda',t:stato.azienda.ragioneSociale},...stato.persone.map(p=>({v:'persona:'+p.id,t:nomePersona(p)})),...stato.cantieri.map(c=>({v:'cantiere:'+c.id,t:'Cantiere '+c.nome})),...stato.mezzi.map(m=>({v:'mezzo:'+m.id,t:'Mezzo '+nomeMezzo(m)}))];
  const anni=unici(stato.documenti.flatMap(d=>[(d.dataEmissione||'').slice(0,4),(d.dataScadenza||'').slice(0,4)]).filter(Boolean)).sort().reverse();
  const sel=(nome,opz,val,etic)=>html`<select data-cambio="filtro-archivio" data-campo="${nome}" aria-label="${etic}"><option value="">${etic}</option>${opz.map(o=>html`<option value="${o.v}" ${o.v===val?'selected':''}>${o.t}</option>`)}</select>`;
  return html`<div class="strumenti-tabella"><input type="search" placeholder="Cerca nel nome, titolo, note" value="${f.cerca||''}" data-cambio="filtro-archivio" data-campo="cerca" aria-label="Cerca documenti">${sel('soggetto',soggetti,f.soggetto,'Tutti i soggetti')}${sel('tipo',stato.tipiDocumento.map(t=>({v:t.id,t:t.nome})),f.tipo,'Tutti i tipi')}${sel('anno',anni.map(a=>({v:a,t:a})),f.anno,'Anno')}${sel('stato',Object.entries(STATI_DOC).map(([v,x])=>({v,t:x.etichetta})),f.stato,'Validità')}${pulsanteCancellaFiltri(!!(f.cerca||f.soggetto||f.tipo||f.anno||f.stato),'filtro-archivio-reset')}<span class="conteggio">${docs.length} documenti</span></div>
  ${tabella({id:'archivio',righe:docs,chiaveOrd:'stato',onRiga:x=>apriDocumento(x.d.id),classeRiga:x=>'riga-'+x.info.stato,colonne:[
    {chiave:'sogg',titolo:'Soggetto',principale:true,valore:x=>nomeSoggettoDoc(x.d)},
    {chiave:'tipo',titolo:'Documento',valore:x=>x.tipo?x.tipo.nome:'',formatta:x=>html`<b>${x.tipo?x.tipo.nome:'[tipo?]'}</b>${x.d.titolo?html`<br><span class="piccolo secondario">${x.d.titolo}</span>`:''}`},
    {chiave:'em',titolo:'Emissione',valore:x=>x.d.dataEmissione||'',formatta:x=>x.d.dataEmissione?fData(x.d.dataEmissione):''},
    {chiave:'scad',titolo:'Scadenza',valore:x=>x.info.data||'',formatta:x=>x.info.data?html`<span class="${x.info.stimata?'stimata':''}">${fData(x.info.data)}${x.info.stimata?' ~':''}</span>`:''},
    {chiave:'stato',titolo:'Stato',valore:x=>STATI_DOC[x.info.stato].ordine,formatta:x=>pillolaDocumento(x.info,{breve:true})},
  ],vuoto:vuoto({icona:'documenti',titolo:'Nessun documento con questi filtri',testo:'Prova ad allargare i filtri o aggiungi un documento.'})})}`;
}
AZIONI['filtro-archivio']=(d,t)=>{ui.filtri.archivio=Object.assign({},ui.filtri.archivio,{[d.campo]:t.value});render();if(d.campo==='cerca')setTimeout(()=>{const i=el('[data-cambio="filtro-archivio"][data-campo="cerca"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
AZIONI['filtro-archivio-reset']=()=>{ui.filtri.archivio={};render()};
document.addEventListener('input',debounce(e=>{const t=e.target;if(t.matches&&t.matches('[data-cambio="filtro-archivio"][data-campo="cerca"]'))AZIONI['filtro-archivio']({campo:'cerca'},t)},250));

// ---- anteprima file ----
async function htmlAnteprimaFile(fileId,pagina){
  const m=fileMeta(fileId); if(!m) return html`<div class="anteprima-nessuna">File non trovato nei metadati.</div>`;
  const u=await urlFile(m.hash); if(!u) return html`<div class="anteprima-nessuna">${icona('attenzione')} Il contenuto di «${m.nome}» non è nell'archivio del browser (forse manca dal backup ripristinato).</div>`;
  const frammento=pagina?'#page='+pagina+'&toolbar=0&navpanes=0':'#toolbar=0&navpanes=0';
  if(eImmagine(m.mime,m.nome)) return html`<img class="anteprima-img" src="${u}" alt="${m.nome}" data-azione="immagine-zoom" data-src="${u}">`;
  if(ePdf(m.mime,m.nome)){
    if(eIos()) return html`<div class="anteprima-nessuna">${icona('pdf')}<p>Su iPhone e iPad l'anteprima incorporata mostra solo la prima pagina.</p><a class="pulsante primario" href="${u}${frammento}" target="_blank" rel="noopener">Apri a schermo intero</a><div class="mt"><iframe class="anteprima-doc" src="${u}${frammento}" title="${m.nome}" style="min-height:40vh"></iframe></div></div>`;
    return html`<iframe class="anteprima-doc" src="${u}${frammento}&statusbar=0" title="${m.nome}"></iframe>`;
  }
  return html`<div class="anteprima-nessuna">${icona('file')}<p>Anteprima non disponibile per questo tipo di file (${m.mime||estensioneDi(m.nome)}).</p><button class="pulsante" data-azione="file-scarica" data-id="${m.id}">${icona('scarica')}Scarica</button></div>`;
}
AZIONI['immagine-zoom']=d=>{dialogo({titolo:'Immagine',enorme:true,corpo:html`<img src="${d.src}" style="max-height:calc(100dvh - 160px);margin:0 auto;object-fit:contain">`,pulsanti:[{testo:'Chiudi',valore:true}]})};
AZIONI['file-apri']=async d=>{const m=fileMeta(d.id);if(!m)return avviso('File non trovato',{tipo:'errore'});apriPannello({titolo:m.nome,largo:true,pieno:true,corpo:html`<div class="anteprima-nessuna">Caricamento…</div>`,piede:html`<button class="pulsante" data-azione="file-scarica" data-id="${m.id}">${icona('scarica')}Scarica</button><button class="pulsante" data-azione="file-condividi" data-id="${m.id}">${icona('condividi')}Condividi</button><span class="spazio"></span><span class="piccolo secondario">${fPeso(m.dimensione)}${m.compresso?' · compresso da '+fPeso(m.dimensioneOriginale):''}</span>`});const a=await htmlAnteprimaFile(m.id);const c=el('#pannello .corpo');if(c)c.innerHTML=a};
AZIONI['file-scarica']=async d=>{const m=fileMeta(d.id);const b=await leggiFile(m.hash);if(!b)return avviso('Contenuto non disponibile',{tipo:'errore'});scaricaBlob(b,m.nome)};
AZIONI['file-condividi']=async d=>{const m=fileMeta(d.id);const b=await leggiFile(m.hash);if(!b)return avviso('Contenuto non disponibile',{tipo:'errore'});condividiOScarica(b,m.nome)};

// ---- pannello documento ----
async function apriDocumento(docId){
  const d=perId('documenti',docId); if(!d) return avviso('Documento non trovato',{tipo:'errore'});
  const t=tipoDoc(d.tipoId); const info=infoDocumento(d);
  const files=(d.file||[]).map(id=>fileMeta(id)).filter(Boolean);
  const meta=html`<div class="campi" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
    <div class="campo"><span class="etichetta-campo">Soggetto</span><div><a href="${hrefSoggettoDoc(d)}">${nomeSoggettoDoc(d)}</a></div></div>
    <div class="campo"><span class="etichetta-campo">Tipo</span><div>${t?t.nome:daCompilare('tipo')}</div></div>
    <div class="campo"><span class="etichetta-campo">Emissione</span><div>${d.dataEmissione?fData(d.dataEmissione):daCompilare()}</div></div>
    <div class="campo"><span class="etichetta-campo">Scadenza</span><div>${info.data?html`<span class="${info.stimata?'stimata':''}">${fData(info.data)}${info.stimata?' (stimata)':''}</span>`:d.senzaScadenza?'nessuna':daCompilare()}</div></div>
    <div class="campo"><span class="etichetta-campo">Stato</span><div>${pillolaDocumento(info)}</div></div>
    ${d.titolo?html`<div class="campo largo"><span class="etichetta-campo">Titolo</span><div>${d.titolo}</div></div>`:''}
    ${d.note?html`<div class="campo largo"><span class="etichetta-campo">Note</span><div>${d.note}</div></div>`:''}
  </div>
  <div class="sezione-titolo">File allegati (${files.length})</div>
  ${files.length?html`<ul class="elenco-piatto">${files.map(m=>html`<li>${icona(ePdf(m.mime,m.nome)?'pdf':eImmagine(m.mime,m.nome)?'immagine':'file')}<span class="spazio taglia" title="${m.nome}">${m.nome}</span><span class="piccolo secondario">${fPeso(m.dimensione)}</span><button class="pulsante piccolo" data-azione="doc-anteprima-file" data-id="${m.id}">${icona('occhio','piccola')}</button><button class="pulsante piccolo" data-azione="file-scarica" data-id="${m.id}">${icona('scarica','piccola')}</button><button class="pulsante piccolo" data-azione="file-condividi" data-id="${m.id}">${icona('condividi','piccola')}</button><button class="pulsante piccolo pericolo" data-azione="doc-rimuovi-file" data-doc="${d.id}" data-id="${m.id}" title="Togli il file dal documento">${icona('chiudi','piccola')}</button></li>`)}</ul>`:html`<div class="avviso-inline attenzione">${icona('attenzione')}<div class="corpo">Nessun file allegato: il documento esiste come scadenza ma la scansione non è ancora nell'archivio.</div></div>`}
  ${files.length?html`<button class="pulsante piccolo mt" data-azione="doc-aggiungi-file" data-doc="${d.id}">${icona('carica','piccola')}Allega un altro file</button>`:html`<div class="zona-drop mt" data-azione="doc-aggiungi-file" data-doc="${d.id}" data-drop-doc="${d.id}">${icona('carica')}Trascina qui la scansione o clicca per allegare un file</div>`}
  <div id="anteprima-doc" class="mt"></div>`;
  apriPannello({titolo:(t?t.nome:'Documento')+' · '+nomeSoggettoDoc(d),largo:!!files.length,corpo:meta,piede:html`<button class="pulsante primario" data-azione="documento-modifica" data-id="${d.id}">${icona('modifica')}Modifica</button><button class="pulsante" data-azione="documento-duplica" data-id="${d.id}" title="Crea il rinnovo: stesso tipo e soggetto, date nuove">${icona('aggiorna')}Rinnovo</button><span class="spazio"></span><button class="pulsante pericolo" data-azione="documento-elimina" data-id="${d.id}">${icona('elimina')}Elimina</button>`});
  if(files.length){const a=await htmlAnteprimaFile(files[0].id);const c=el('#anteprima-doc');if(c)c.innerHTML=a}
}
AZIONI['doc-anteprima-file']=async d=>{const c=el('#anteprima-doc');if(c){c.innerHTML=html`<div class="anteprima-nessuna">Caricamento…</div>`;c.innerHTML=await htmlAnteprimaFile(d.id);c.scrollIntoView({behavior:'smooth'})}};
AZIONI['doc-rimuovi-file']=async d=>{const m=fileMeta(d.id);if(!(await conferma(`Togliere «${m?m.nome:''}» da questo documento? Il file resta nel cestino per 30 giorni.`)))return;esegui('Tolto file dal documento',s=>{const doc=s.documenti.find(x=>x.id===d.doc);doc.file=doc.file.filter(f=>f!==d.id);cestinaFileOrfani(s)});apriDocumento(d.doc)};
AZIONI['doc-aggiungi-file']=async d=>{const fs=await scegliFile({accetta:'.pdf,image/*'});if(fs.length)await allegaFilesADocumento(d.doc,fs)};
AZIONI['documento-nuovo']=d=>dialogoDocumento({soggettoTipo:d.soggettoTipo||null,soggettoId:d.soggettoId||null});
AZIONI['documento-modifica']=d=>dialogoDocumento(perId('documenti',d.id));
AZIONI['documento-duplica']=d=>{const o=perId('documenti',d.id);dialogoDocumento({soggettoTipo:o.soggettoTipo,soggettoId:o.soggettoId,tipoId:o.tipoId,titolo:o.titolo,rinnovoDi:o.id})};
AZIONI['documento-elimina']=async d=>{const doc=perId('documenti',d.id);const t=tipoDoc(doc.tipoId);if(!(await conferma(`Eliminare «${t?t.nome:'documento'}» di ${nomeSoggettoDoc(doc)}? I file allegati restano nel cestino 30 giorni.`,{pericolo:true,ok:'Elimina'})))return;chiudiPannello();esegui('Eliminato documento '+(t?t.nome:''),s=>{s.documenti=s.documenti.filter(x=>x.id!==d.id);cestinaFileOrfani(s)})};
async function allegaFilesADocumento(docId,files){
  const esiti=await acquisisciConAnteprima(files); if(!esiti) return;
  esegui('Allegati '+esiti.length+' file',s=>{const doc=s.documenti.find(x=>x.id===docId);for(const e of esiti){if(!doc.file.includes(e.rec.id))doc.file.push(e.rec.id)}},{senzaRender:true});
  apriDocumento(docId); render();
}
// Acquisisce file con avanzamento e mostra prima/dopo della compressione (con possibilità di tenere l'originale)
async function acquisisciConAnteprima(files,opz){
  opz=opz||{};
  const prog=dialogoAvanzamento('Acquisizione documenti',{annullabile:true,testo:'Compressione e archiviazione…'});
  const esiti=[];
  try{
    for(let i=0;i<files.length;i++){
      if(prog.annullato) break;
      await prog.aggiorna(i,files.length,files[i].name);
      const r=await acquisisciFile(files[i],{compressione:{obiettivo:(stato.impostazioni.obiettivoKb||300)*1024},senzaCompressione:stato.impostazioni.compressioneImmagini===false});
      esiti.push(Object.assign({file:files[i]},r));
    }
  }catch(e){prog.chiudi();segnalaErrore(e,'Acquisizione non riuscita');return null}
  prog.chiudi();
  if(!esiti.length) return null;
  const compressi=esiti.filter(e=>e.compressione);const avvisi=esiti.filter(e=>e.avviso);const duplicati=esiti.filter(e=>e.duplicato);
  if(compressi.length||avvisi.length||duplicati.length){
    const urls=[];
    const corpo=html`${duplicati.length?html`<div class="avviso-inline info">${icona('info')}<div class="corpo">${plurale(duplicati.length,'file era già','file erano già')} nell'archivio: non occupano spazio due volte.</div></div>`:''}
    ${avvisi.map(e=>html`<div class="avviso-inline attenzione">${icona('attenzione')}<div class="corpo"><b>${e.file.name}</b>: ${e.avviso}</div></div>`)}
    ${compressi.length?html`<p>Immagini ricompresse per l'archivio (documenti da leggere, non fotografie). Se la qualità non basta, tieni l'originale.</p>`:''}
    ${compressi.map((e,i)=>{const u1=URL.createObjectURL(e.compressione.originale);urls.push(u1);return html`<div class="scheda mb-s"><div class="riga stretta"><b class="spazio taglia">${e.file.name}</b><label class="spunta piccolo"><input type="checkbox" data-originale="${i}"> Tieni l'originale</label></div><div class="confronto-immagini mt-s"><figure><img src="${u1}" alt="prima"><figcaption>Prima: ${fPeso(e.compressione.prima)}</figcaption></figure><figure><img data-dopo="${i}" alt="dopo"><figcaption>Dopo: ${fPeso(e.compressione.dopo)} · ${e.compressione.larghezza}×${e.compressione.altezza}</figcaption></figure></div></div>`})}`;
    const scelte=await dialogo({titolo:'Controllo acquisizione',largo:true,corpo,pulsanti:[{testo:'Ok',classe:'primario',primario:true,fn:v=>tutti('[data-originale]:checked',v).map(x=>+x.dataset.originale)}],alMontaggio:async v=>{for(let i=0;i<compressi.length;i++){const u=await urlFile(compressi[i].rec.hash);const img=v.querySelector(`[data-dopo="${i}"]`);if(img)img.src=u}}});
    urls.forEach(u=>URL.revokeObjectURL(u));
    if(scelte&&scelte.length){
      for(const i of scelte){ const e=compressi[i]; const {rec}=await salvaFile(e.compressione.originale,{nome:e.file.name}); e.rec=rec; }
    }
  }
  return esiti;
}

// ---- dialogo documento (nuovo/modifica) ----
async function dialogoDocumento(d,filesIniziali){
  const nuovo=!d.id;
  d=Object.assign({soggettoTipo:null,soggettoId:null,tipoId:null,titolo:'',dataEmissione:null,dataScadenza:null,senzaScadenza:false,verificato:false,note:'',file:[]},d);
  const soggettoFisso=!!(d.soggettoTipo&&d.soggettoId)&&!nuovo?true:false;
  const soggetti=[{v:'azienda:azienda',t:stato.azienda.ragioneSociale},...stato.persone.filter(p=>p.attivo||p.id===d.soggettoId).map(p=>({v:'persona:'+p.id,t:nomePersona(p)})),...stato.cantieri.map(c=>({v:'cantiere:'+c.id,t:'Cantiere '+c.nome})),...stato.clienti.map(c=>({v:'cliente:'+c.id,t:'Cliente '+c.ragioneSociale})),...stato.mezzi.map(m=>({v:'mezzo:'+m.id,t:'Mezzo '+nomeMezzo(m)}))];
  const filesNuovi=filesIniziali?Array.from(filesIniziali):[];
  // proposta di tipo dai nomi file
  if(!d.tipoId&&filesNuovi.length){const prop=classificaFile(filesNuovi[0].percorso||filesNuovi[0].name);if(prop.tipoId)d.tipoId=prop.tipoId;if(prop.data&&!d.dataEmissione)d.dataEmissione=prop.data;if(!d.soggettoId&&prop.personaId){d.soggettoTipo='persona';d.soggettoId=prop.personaId}if(!d.soggettoId&&prop.azienda){d.soggettoTipo='azienda';d.soggettoId='azienda'}}
  // proposta di date lette nel testo del documento (es. "scade il ..."): mai inventate, solo trovate scritte
  if(filesNuovi.length===1&&(!d.dataScadenza||!d.dataEmissione)){
    const proposte=await proponiDateDaFile(filesNuovi[0]);
    if(proposte){ if(proposte.dataScadenza&&!d.dataScadenza)d.dataScadenza=proposte.dataScadenza; if(proposte.dataEmissione&&!d.dataEmissione)d.dataEmissione=proposte.dataEmissione; }
  }
  const ambitoDi=k=>k.startsWith('persona')?'persona':k.startsWith('azienda')?'azienda':k.startsWith('cantiere')?'cantiere':k.startsWith('mezzo')?'mezzo':'cliente';
  const campi=[
    {nome:'soggetto',etichetta:'Soggetto',tipo:'select',obbligatorio:true,opzioni:soggetti,sola:soggettoFisso},
    {nome:'tipoId',etichetta:'Tipo di documento',tipo:'select',obbligatorio:true,opzioni:stato.tipiDocumento.map(t=>({v:t.id,t:t.nome+(t.ambito==='persona'?'':' ('+t.ambito+')')}))},
    {nome:'titolo',etichetta:'Titolo (se diverso dal tipo)',largo:true},
    {nome:'dataEmissione',etichetta:'Data di emissione',tipo:'data'},{nome:'dataScadenza',etichetta:'Data di scadenza',tipo:'data',aiuto:'Si precompila dalla validità tipica: la data sul documento prevale'},
    {nome:'ente',etichetta:'Ente formatore / emittente (per attestati)'},{nome:'senzaScadenza',tipo:'spunta',testo:'Senza scadenza'},
    {nome:'note',etichetta:'Note',tipo:'textarea',largo:true},
  ];
  const val=clona(d);val.soggetto=d.soggettoTipo&&d.soggettoId?d.soggettoTipo+':'+d.soggettoId:'';
  const listaFile=()=>html`<div class="sezione-titolo">File</div><ul class="elenco-piatto" id="dlg-file-lista">${(d.file||[]).map(id=>{const m=fileMeta(id);return m?html`<li>${icona('allega','piccola')}<span class="spazio taglia">${m.nome}</span><span class="piccolo secondario">${fPeso(m.dimensione)}</span></li>`:''})}${filesNuovi.map((f,i)=>html`<li>${icona('carica','piccola')}<span class="spazio taglia">${f.name}</span><span class="piccolo secondario">${fPeso(f.size)} · nuovo</span><button class="pulsante piccolo icona" data-togli-nuovo="${i}" aria-label="Togli">${icona('chiudi','piccola')}</button></li>`)}</ul><div class="zona-drop" id="dlg-drop" data-drop-locale>${icona('carica')}Trascina qui o clicca per aggiungere file</div>`;
  const ris=await dialogoModulo(nuovo?'Nuovo documento':'Modifica documento',campi,val,{coda:listaFile(),alMontaggio:v=>{
    const form=v.querySelector('form');
    const sel=form.querySelector('[name=soggetto]'),tipoSel=form.querySelector('[name=tipoId]'),em=form.querySelector('[name=dataEmissione]'),sc=form.querySelector('[name=dataScadenza]'),ss=form.querySelector('[name=senzaScadenza]');
    const filtraTipi=()=>{const amb=sel.value?ambitoDi(sel.value):null;tutti('option',tipoSel).forEach(o=>{const t=tipoDoc(o.value);o.hidden=!!(t&&amb&&t.ambito!==amb&&!(amb==='cliente'&&t.ambito==='cantiere'))})};
    const stimaScadenza=()=>{const t=tipoDoc(tipoSel.value);if(!t||!em.value||sc.value)return;if(t.validitaMesi)sc.value=aggiungiMesi(em.value,t.validitaMesi);else if(t.validitaGiorni)sc.value=aggiungiGiorni(em.value,t.validitaGiorni);if(!t.validitaMesi&&!t.validitaGiorni&&!sc.value&&!d.dataScadenza)ss.checked=true};
    sel.addEventListener('change',filtraTipi);filtraTipi();
    tipoSel.addEventListener('change',()=>{sc.value='';stimaScadenza()});em.addEventListener('change',stimaScadenza);
    ss.addEventListener('change',()=>{sc.disabled=ss.checked});sc.disabled=ss.checked;
    const zona=v.querySelector('#dlg-drop');
    const rinfresca=()=>{v.querySelector('#dlg-file-lista').outerHTML=listaFile().s.match(/<ul[\s\S]*<\/ul>/)[0];tutti('[data-togli-nuovo]',v).forEach(b=>b.onclick=()=>{filesNuovi.splice(+b.dataset.togliNuovo,1);rinfresca()})};
    tutti('[data-togli-nuovo]',v).forEach(b=>b.onclick=()=>{filesNuovi.splice(+b.dataset.togliNuovo,1);rinfresca()});
    zona.addEventListener('click',async()=>{const fs=await scegliFile({accetta:'.pdf,image/*'});filesNuovi.push(...fs);rinfresca()});
    zona.addEventListener('dragover',e=>{e.preventDefault();zona.classList.add('sopra');if(e.dataTransfer)e.dataTransfer.dropEffect='copy'});zona.addEventListener('dragleave',()=>zona.classList.remove('sopra'));
    zona.addEventListener('drop',async e=>{e.preventDefault();e.stopPropagation();zona.classList.remove('sopra');const fs=await fileDaDrop(e.dataTransfer);filesNuovi.push(...fs);rinfresca()});
  },validaTutto:v=>{if(v.dataEmissione&&v.dataScadenza&&v.dataScadenza<v.dataEmissione)return 'La scadenza precede l\'emissione';const t=tipoDoc(v.tipoId);if(t&&v.soggetto&&t.ambito!==ambitoDi(v.soggetto)&&!(ambitoDi(v.soggetto)==='cliente'))return 'Il tipo «'+t.nome+'» non è adatto a questo soggetto';return null}});
  if(!ris) return;
  const [st,sid]=ris.soggetto.split(':');delete ris.soggetto;
  if(nuovo&&!d.rinnovoDi){
    const gemelli=stato.documenti.filter(x=>x.soggettoTipo===st&&x.soggettoId===sid&&x.tipoId===ris.tipoId&&infoDocumento(x).stato!=='scaduto');
    if(gemelli.length){const t=tipoDoc(ris.tipoId);if(!(await conferma(`Esiste gi\u00e0 ${gemelli.length>1?gemelli.length+' documenti':'un documento'} \u00ab${t?t.nome:'di questo tipo'}\u00bb per ${nomeSoggettoDoc({soggettoTipo:st,soggettoId:sid})} ancora in corso di validit\u00e0. Aggiungerne un altro?`,{ok:'Aggiungi lo stesso'})))return}
  }
  let esiti=[];
  if(filesNuovi.length){esiti=await acquisisciConAnteprima(filesNuovi)||[]}
  const nuoviId=esiti.map(e=>e.rec.id);
  if(nuovo){
    const id=nuovoId('d');
    esegui('Aggiunto documento '+(tipoDoc(ris.tipoId)||{}).nome,s=>{s.documenti.push(Object.assign({id,soggettoTipo:st,soggettoId:sid,file:nuoviId,creato:new Date().toISOString()},ris));if(d.rinnovoDi){const v=s.documenti.find(x=>x.id===d.rinnovoDi);if(v)v.note=(v.note?v.note+' ':'')+'Rinnovato: vedi documento successivo.'}});
    apriDocumento(id);
  } else {
    esegui('Modificato documento '+(tipoDoc(ris.tipoId)||{}).nome,s=>{const x=s.documenti.find(x=>x.id===d.id);Object.assign(x,ris,{soggettoTipo:st,soggettoId:sid});x.file=unici([...(x.file||[]),...nuoviId])});
    apriDocumento(d.id);
  }
}

// ---- acquisizione rapida: file trascinati sulla finestra ----
AZIONI['carica-documento-globale']=async()=>{const fs=await scegliFile({accetta:'.pdf,image/*'});if(fs.length)acquisizioneRapida(fs)};
async function acquisizioneRapida(files){
  const conCartelle=files.some(f=>(f.percorso||'').includes('/'));
  if(files.length>3||conCartelle){ ui.caricamentoFiles=files; vai('documenti/caricamento'); if(leggiRotta().sezione==='documenti'&&leggiRotta().id==='caricamento') render(); return; }
  // se siamo sulla scheda di una persona o cantiere, il soggetto è quello
  const r=leggiRotta();
  const pre={};
  if(r.sezione==='operai'&&r.id&&persona(r.id)){pre.soggettoTipo='persona';pre.soggettoId=r.id}
  if(r.sezione==='cantieri'&&r.id&&cantiere(r.id)){pre.soggettoTipo='cantiere';pre.soggettoId=r.id}
  // buste paga? se il nome sembra una busta paga vai allo smistamento
  if(files.every(f=>/busta|cedolino|paga|lul/i.test(f.name))){ ui.busteFiles=files; vai('documenti/buste'); return; }
  dialogoDocumento(pre,files);
}

// ---- classificatore per nome e percorso ----
function classificaFile(percorso){
  const p=normalizzaTesto(percorso.replace(/\.[a-z0-9]+$/i,''));
  const segmenti=percorso.split('/');const nomeFile=segmenti[segmenti.length-1];
  const out={personaId:null,azienda:false,tipoId:null,data:null,fiducia:0,motivi:[]};
  let fidPersona=0,fidTipo=0;
  // persona: qualsiasi ordine cognome/nome, maiuscole incoerenti; basta un nome distintivo
  let migliore=null;
  for(const per of stato.persone){
    const toks=[per.cognome,per.nome].flatMap(x=>normalizzaTesto(x).split(' ')).filter(t=>t.length>2);
    const trovati=toks.filter(t=>p.includes(t));
    if(!trovati.length) continue;
    const punteggio=trovati.length/toks.length+(segmenti.slice(0,-1).some(sg=>trovati.some(t=>normalizzaTesto(sg).includes(t)))?0.3:0);
    if(!migliore||punteggio>migliore.punteggio) migliore={per,punteggio,trovati};
  }
  if(migliore){out.personaId=migliore.per.id;fidPersona=Math.min(1,migliore.punteggio);out.motivi.push((fidPersona>=0.8?'nome ':'solo ')+'«'+migliore.trovati.join(' ')+'» nel percorso'+(fidPersona<0.8?': da confermare':''))}
  const cartelle=normalizzaTesto(segmenti.slice(0,-1).join('/'));
  if(!out.personaId&&(/(^|\s)azienda|societa|ditta|impresa/.test(cartelle)||/durc|visura|patente|dvr|nomina rspp|nomina medico|cciaa|camerale|rspp/.test(p))){out.azienda=true;fidPersona=0.9;out.motivi.push('cartella o parola chiave aziendale')}
  // tipo: parole chiave, dalle più specifiche
  const regole=[
    [/durc/,'durc'],[/visura|camerale|cciaa/,'visura'],[/patente/,'patente_crediti'],[/dvr|valutazione dei rischi|rischio chimico|rumore|vibrazion|stress|incendio/,'dvr'],[/nomina medico|medico competente/,'nomina_medico'],[/nomina rspp/,'nomina_rspp'],[/aggiornamento rspp|rspp/,'rspp_datore'],
    [/\bpsc\b|piano di sicurezza e coordinamento/,'psc'],[/\bpos\b|piano operativo/,'pos'],[/apertura cantiere|denuncia/,'denuncia_apertura'],[/dichiarazione|autocertif/,'dichiarazione'],
    [/busta|cedolino|\blul\b/,'busta_paga'],[/visita medica|visitra medica|visita|idoneita/,'visita_medica'],[/unilav|assunzione|indeterminato|determinato/,'unilav'],[/permesso|soggiorno|questura/,'permesso_soggiorno'],[/passaporto/,'passaporto'],[/carta identita|carta-identita|identita|documenti|documento/,'carta_identita'],
    [/nomina|elezione/,'nomina_persona'],[/preposto/,'corso_preposto'],[/\brls\b/,'corso_rls'],[/primo soccorso|pronto soccorso|\bps\b|p s\b/,'primo_soccorso'],[/antincendio/,'antincendio_2'],[/aggiornamento/,'aggiornamento_rischio_alto'],[/rischio alto|sicurezza|formazione|16h|16 ore/,'rischio_alto_16'],[/\bple\b|piattaform/,'ple'],[/pimus|ponteggi/,'pimus'],[/\bdpi\b/,'consegna_dpi'],[/comunicazione inail|inail/,'altro_persona'],
  ];
  for(const [re,tipo] of regole){ if(re.test(p)){out.tipoId=tipo;fidTipo=1;out.motivi.push('parola chiave «'+re.source.split('|')[0].replace(/\\b/g,'')+'»');break} }
  if(!out.tipoId&&/corsi/.test(cartelle)){out.tipoId='rischio_alto_16';fidTipo=0.4;out.motivi.push('cartella «corsi» senza altre indicazioni: corso da verificare')}
  if(out.tipoId==='nomina_persona'&&/elezione/.test(p)){out.tipoId='corso_rls';out.motivi.push('«elezione» → RLS')}
  // date nei nomi: AA.MM.GG o AA.MM (26.07.01 = 1 luglio 2026), oppure gg-mm-aa
  const m=/(\d{2})\.(\d{2})(?:\.(\d{2}))?/.exec(nomeFile);
  if(m){out.data=interpretaData(m[0]);if(out.data)out.motivi.push('data '+m[0]+' nel nome')}
  const m2=/(\d{2})-(\d{2})-(\d{2,4})/.exec(nomeFile);if(!out.data&&m2){out.data=interpretaData(m2[0]);if(out.data)out.motivi.push('data '+m2[0]+' nel nome')}
  if(!out.personaId&&!out.azienda){out.motivi.push('soggetto non riconosciuto')}
  if(!out.tipoId){out.motivi.push('tipo non riconosciuto')}
  out.fiducia=Math.max(0,Math.min(1,fidPersona*0.5+fidTipo*0.5));
  return out;
}

// Cerca una data vicino a una parola chiave nel testo di un documento (es. "scade il 31/12/2026").
// Restituisce la prima trovata, o null: non si inventa mai, si propone solo quello che è scritto.
function estraiDataDaTesto(testo,parole){
  if(!testo) return null;
  const dataRe=/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
  for(const parola of parole){
    const re=new RegExp(parola,'gi'); let m;
    while((m=re.exec(testo))){
      const finestra=testo.slice(m.index,m.index+60);
      const dm=dataRe.exec(finestra);
      if(dm){ const data=interpretaData(dm[0]); if(data) return data; }
    }
  }
  return null;
}
async function proponiDateDaFile(file){
  if(!ePdf(file.type,file.name)) return null;
  try{
    const testo=(await estraiTestoPdf(file)).testo;
    return {
      dataScadenza:estraiDataDaTesto(testo,['scaden\\w*','valid[oa]\\s+(?:fino|sino)','validit[aà]\\s+(?:fino|sino)']),
      dataEmissione:estraiDataDaTesto(testo,['emess[oa]\\s+il','rilasciat[oa]\\s+il','data\\s+di\\s+emissione']),
    };
  }catch(e){ return null; }
}

// ---- assistente per documenti di un'altra azienda: copri intestazioni, aggiungi timbro/firma e dati del legale rappresentante ----
// Su richiesta di Edoardo: solo assistenza manuale, niente riconoscimento automatico. L'utente
// posiziona a mano quello che serve (in percentuale, quindi indipendente dalla risoluzione), poi
// stampa, condivide o archivia il risultato come un documento qualsiasi.
function testoLegaleRappresentante(){
  const a=stato.azienda;const leg=persona(a.legaleRappresentanteId);
  return [a.ragioneSociale,leg?'Il Legale Rappresentante: '+nomePersona(leg):'',leg&&leg.cf?'C.F. '+leg.cf:'',indirizzoTesto(a.indirizzo),a.piva?'P.IVA '+a.piva:''].filter(Boolean).join('\n');
}
// ---- caricamento iniziale ----
function vistaCaricamento(){
  const files=ui.caricamentoFiles||[];
  if(!files.length) return html`<div class="scheda"><h3>Caricamento iniziale dell'archivio</h3><p>Trascina qui le cartelle dei documenti (per operaio, con le sottocartelle) oppure scegli una cartella. L'applicazione propone per ogni file a chi appartiene e che tipo di documento è; tu rivedi e confermi. Rilanciare la procedura non duplica quello che c'è già: i file identici vengono riconosciuti dall'impronta.</p>
    <div class="zona-drop" data-azione="caricamento-scegli" data-drop-caricamento>${icona('cartella')}Trascina cartelle o file qui, oppure clicca per scegliere una cartella</div>
    <p class="piccolo secondario mt">Su iPhone e iPad non si possono trascinare cartelle: usa «Scegli file» per selezionare più documenti insieme. <button class="pulsante piccolo" data-azione="caricamento-scegli-file">Scegli file</button></p>
    <div class="mt"><b>Come vengono interpretati i nomi:</b> le date <span class="mono">AA.MM.GG</span> o <span class="mono">AA.MM</span> (es. <span class="mono">26.07.01</span> = 1 luglio 2026); i nomi degli operai in qualsiasi ordine; le parole chiave <i>visita medica, corsi, sicurezza, unilav, documenti, preposto, antincendio, rls, primo soccorso, rischio alto, nomina, durc, visura, patente, dvr, pos, psc</i>.</div></div>`;
  if(!ui.caricamentoRighe||ui.caricamentoRighe.files!==files){
    ui.caricamentoRighe={files,righe:files.map((f,i)=>{const c=classificaFile(f.percorso||f.name);return {i,f,...c,soggetto:c.personaId?'persona:'+c.personaId:c.azienda?'azienda:azienda':'',escludi:false,esistente:null}})};
    // proposta di aggancio ai documenti esistenti senza file (stesso soggetto e tipo)
    for(const r of ui.caricamentoRighe.righe){ if(r.soggetto&&r.tipoId){const [st,sid]=r.soggetto.split(':');const cand=stato.documenti.filter(d=>d.soggettoTipo===st&&d.soggettoId===sid&&d.tipoId===r.tipoId&&!(d.file||[]).length);if(cand.length===1)r.esistente=cand[0].id;else if(cand.length>1){const perData=cand.find(d=>d.dataEmissione&&r.data&&d.dataEmissione===r.data);r.esistente=(perData||cand[0]).id}} }
    verificaDuplicatiCaricamento();
  }
  const righe=ui.caricamentoRighe.righe.slice().sort((a,b)=>a.fiducia-b.fiducia);
  const soggetti=[{v:'azienda:azienda',t:stato.azienda.ragioneSociale},...stato.persone.map(p=>({v:'persona:'+p.id,t:nomePersona(p)})),...stato.cantieri.map(c=>({v:'cantiere:'+c.id,t:'Cantiere '+c.nome}))];
  const incerti=righe.filter(r=>r.fiducia<0.75&&!r.escludi).length;const dup=righe.filter(r=>r.duplicato).length;
  return html`<div class="scheda"><h3>Revisione delle proposte <span class="azioni"><button class="pulsante piccolo" data-azione="caricamento-annulla">Annulla</button><button class="pulsante piccolo primario" data-azione="caricamento-applica">${icona('spunta')}Applica ${righe.filter(r=>!r.escludi&&!r.duplicato).length} file</button></span></h3>
  <div class="avviso-inline ${incerti?'attenzione':'info'}">${icona(incerti?'attenzione':'ok')}<div class="corpo">${files.length} file letti. ${incerti?html`<b>${incerti} righe incerte</b> sono in cima: controlla soggetto e tipo prima di applicare.`:'Tutte le proposte hanno buona fiducia.'} ${dup?html`<br>${dup} file sono già nell'archivio (stessa impronta) e verranno saltati.`:''}</div></div>
  <div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>Fiducia</th><th>File</th><th>Soggetto</th><th>Tipo</th><th>Data</th><th>Allega a</th><th>Escludi</th></tr></thead><tbody>
  ${righe.map(r=>html`<tr class="${r.duplicato?'silenzioso':''} ${r.fiducia<0.75?'riga-scadenza':''}"><td><span class="pillola ${r.duplicato?'neutro':r.fiducia>=0.75?'valido':r.fiducia>=0.45?'pianificare':'scaduto'}" title="${r.motivi.join('; ')}">${r.duplicato?'già presente':Math.round(r.fiducia*100)+'%'}</span></td>
    <td><span class="taglia" style="display:block;max-width:300px" title="${r.f.percorso||r.f.name}">${r.f.percorso||r.f.name}</span><span class="piccolo secondario">${fPeso(r.f.size)}${eImmagine(r.f.type,r.f.name)?' · immagine (verrà compressa)':''}</span></td>
    <td><select data-caricamento="soggetto" data-i="${r.i}" ${r.duplicato?'disabled':''}><option value="">— scegli —</option>${soggetti.map(s=>html`<option value="${s.v}" ${s.v===r.soggetto?'selected':''}>${s.t}</option>`)}</select></td>
    <td><select data-caricamento="tipoId" data-i="${r.i}" ${r.duplicato?'disabled':''}><option value="">— scegli —</option>${stato.tipiDocumento.map(t=>html`<option value="${t.id}" ${t.id===r.tipoId?'selected':''}>${t.nome}</option>`)}</select></td>
    <td><input type="date" value="${r.data||''}" data-caricamento="data" data-i="${r.i}" ${r.duplicato?'disabled':''} style="min-width:140px"></td>
    <td class="piccolo">${r.esistente?html`<span class="pillola valido" title="Il file verrà allegato a questo documento già registrato">${icona('collegamento','piccola')}${(tipoDoc((perId('documenti',r.esistente)||{}).tipoId)||{}).nome||''} ${fData((perId('documenti',r.esistente)||{}).dataEmissione)||''}</span>`:html`<span class="secondario">nuovo documento</span>`}</td>
    <td><input type="checkbox" data-caricamento="escludi" data-i="${r.i}" ${r.escludi?'checked':''} aria-label="Escludi"></td></tr>`)}
  </tbody></table></div></div>`;
}
async function verificaDuplicatiCaricamento(){
  const righe=ui.caricamentoRighe.righe;const hashNoti=new Set(stato.file.filter(f=>!f.cestinato).map(f=>f.hash));
  for(const r of righe){ try{ r.hash=await impronta(r.f); r.duplicato=hashNoti.has(r.hash); }catch(e){} }
  if(leggiRotta().id==='caricamento') render();
}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.caricamento||!ui.caricamentoRighe)return;const r=ui.caricamentoRighe.righe.find(x=>x.i===+t.dataset.i);if(!r)return;const k=t.dataset.caricamento;if(k==='escludi')r.escludi=t.checked;else{r[k]=t.value;r.fiducia=Math.max(r.fiducia,0.9);r.motivi.push('confermato a mano');if(k==='soggetto'||k==='tipoId'){const [st,sid]=(r.soggetto||'').split(':');const cand=stato.documenti.filter(d=>d.soggettoTipo===st&&d.soggettoId===sid&&d.tipoId===r.tipoId&&!(d.file||[]).length);r.esistente=cand.length?cand[0].id:null}}});
AZIONI['caricamento-scegli']=async()=>{const fs=await scegliFile({cartella:true});if(fs.length){ui.caricamentoFiles=fs;ui.caricamentoRighe=null;render()}};
AZIONI['caricamento-scegli-file']=async()=>{const fs=await scegliFile({});if(fs.length){ui.caricamentoFiles=fs;ui.caricamentoRighe=null;render()}};
AZIONI['caricamento-annulla']=()=>{ui.caricamentoFiles=null;ui.caricamentoRighe=null;render()};
AZIONI['caricamento-applica']=async()=>{
  const righe=ui.caricamentoRighe.righe.filter(r=>!r.escludi&&!r.duplicato);
  const senza=righe.filter(r=>!r.soggetto||!r.tipoId);
  if(senza.length){ if(!(await conferma(`${senza.length} file non hanno soggetto o tipo: verranno saltati. Continuare con gli altri ${righe.length-senza.length}?`))) return; }
  const daFare=righe.filter(r=>r.soggetto&&r.tipoId);
  if(!daFare.length) return avviso('Niente da importare');
  await istantanea('prima del caricamento iniziale');
  const prog=dialogoAvanzamento('Caricamento in corso',{annullabile:true});
  let n=0,allegati=0,nuovi=0;const nuoviDoc=[];const alleg=[];
  try{
    for(let i=0;i<daFare.length;i++){
      const r=daFare[i]; if(prog.annullato) break;
      await prog.aggiorna(i,daFare.length,r.f.name);
      const es=await acquisisciFile(r.f,{compressione:{obiettivo:(stato.impostazioni.obiettivoKb||300)*1024},dentroEsegui:false});
      const [st,sid]=r.soggetto.split(':');
      if(r.esistente&&!nuoviDoc.find(x=>x.id===r.esistente)){alleg.push({docId:r.esistente,fileId:es.rec.id});allegati++}
      else {const id=nuovoId('d');const t=tipoDoc(r.tipoId);nuoviDoc.push({id,soggettoTipo:st,soggettoId:sid,tipoId:r.tipoId,titolo:'',dataEmissione:r.data||null,dataScadenza:(r.data&&t&&t.validitaMesi)?null:null,senzaScadenza:!!(t&&!t.validitaMesi&&!t.validitaGiorni),file:[es.rec.id],verificato:false,note:'Caricato da: '+(r.f.percorso||r.f.name),creato:new Date().toISOString()});nuovi++}
      n++;
    }
  }catch(e){prog.chiudi();segnalaErrore(e,'Caricamento interrotto');}
  prog.chiudi();
  esegui(`Caricamento iniziale: ${n} file (${nuovi} documenti nuovi, ${allegati} allegati a documenti esistenti)`,s=>{for(const d of nuoviDoc)s.documenti.push(d);for(const a of alleg){const d=s.documenti.find(x=>x.id===a.docId);if(d&&!d.file.includes(a.fileId))d.file.push(a.fileId)}},{senzaRender:true});
  ui.caricamentoFiles=null;ui.caricamentoRighe=null;
  vai('documenti');
};

// ---- buste paga ----
function interpretaNomeBusta(nome){
  const n=normalizzaTesto(nome.replace(/\.[a-z0-9]+$/i,''));const raw=nome;
  const out={personaId:null,anno:null,mese:null,motivi:[],fiducia:0};
  // regole apprese: segno → persona
  const toks=n.split(' ').filter(t=>t.length>=3&&!/^\d+$/.test(t));
  for(const reg of stato.regoleBuste||[]){ if(toks.includes(reg.segno)){out.personaId=reg.personaId;out.fiducia+=0.8;out.motivi.push('regola appresa «'+reg.segno+'»');break} }
  if(!out.personaId){ const c=classificaFile(nome); if(c.personaId){out.personaId=c.personaId;out.fiducia+=0.6;out.motivi.push(...c.motivi.filter(m=>m.includes('nome')))} }
  // anno e mese in tutte le forme comuni
  let m;
  const mesiRe=new RegExp('('+NOMI_MESI.join('|')+'|'+NOMI_MESI_BREVI.join('|')+')\\s*(\\d{4}|\\d{2})','i');
  if((m=/(20\d{2})[-_. ]?(0[1-9]|1[0-2])(?!\d)/.exec(raw))){out.anno=+m[1];out.mese=+m[2]}
  else if((m=/(?<!\d)(0[1-9]|1[0-2])[-_. ]?(20\d{2})/.exec(raw))){out.anno=+m[2];out.mese=+m[1]}
  else if((m=mesiRe.exec(n))){const mi=NOMI_MESI.indexOf(m[1].toLowerCase());out.mese=(mi>=0?mi:NOMI_MESI_BREVI.indexOf(m[1].toLowerCase().slice(0,3)))+1;out.anno=m[2].length===2?2000+ +m[2]:+m[2]}
  else if((m=/(?<!\d)(0[1-9]|1[0-2])(\d{2})(?!\d)/.exec(raw))){out.mese=+m[1];out.anno=2000+ +m[2]}
  else if((m=/(?<!\d)(\d{2})(0[1-9]|1[0-2])(?!\d)/.exec(raw))){out.anno=2000+ +m[1];out.mese=+m[2]}
  if(out.anno&&out.mese){out.fiducia+=0.4;out.motivi.push('periodo '+pad2(out.mese)+'/'+out.anno)}
  out.fiducia=Math.min(1,out.fiducia);
  return out;
}
function vistaBustePaga(r){
  const pid=r.query.persona||ui.filtri.bustePersona||null;
  const coda=ui.busteCoda||[];
  const daAssegnare=stato.bustePaga.filter(b=>!b.personaId||!b.anno||!b.mese);
  const persone=stato.persone.filter(p=>p.inLibroPresenze||stato.bustePaga.some(b=>b.personaId===p.id));
  const p=pid?persona(pid):null;
  const buste=p?stato.bustePaga.filter(b=>b.personaId===p.id):[];
  const anni=unici([...buste.map(b=>b.anno),new Date().getFullYear()]).sort((a,b)=>b-a);
  const oggiD=new Date();
  return html`<div class="griglia due">
    <div class="scheda"><h3>${icona('busta-paga')}Smistamento buste paga</h3><p class="secondario">Trascina qui tutti i PDF del mese: per ciascuno propongo operaio, anno e mese dal nome del file. Le tue correzioni insegnano all'applicazione come leggere i nomi la volta dopo.</p>
      <div class="zona-drop" data-azione="buste-scegli" data-drop-buste>${icona('carica')}Trascina i PDF delle buste paga o clicca per sceglierli</div>
      <button class="pulsante piccolo mt-s" data-azione="buste-smistamento-scegli">${icona('magia','piccola')}Oppure carica un unico PDF con tutte le buste del mese (separate da pagine bianche): le smisto da solo</button>
      ${coda.length?html`<div class="mt"><table class="tabella densa"><thead><tr><th>File</th><th>Operaio</th><th>Anno</th><th>Mese</th><th></th></tr></thead><tbody>${coda.map((c,i)=>html`<tr class="${c.fiducia<0.7?'riga-scadenza':''}"><td><span class="taglia" style="display:block;max-width:220px" title="${c.f.name}">${c.f.name}</span><span class="piccolo secondario">${c.motivi.join('; ')||'nessun indizio'}</span></td><td><select data-busta="personaId" data-i="${i}"><option value="">— da assegnare —</option>${persone.map(pp=>html`<option value="${pp.id}" ${pp.id===c.personaId?'selected':''}>${nomePersona(pp)}</option>`)}</select></td><td><input type="text" inputmode="numeric" value="${c.anno||''}" data-busta="anno" data-i="${i}" style="width:72px"></td><td><select data-busta="mese" data-i="${i}"><option value="">—</option>${NOMI_MESI.map((mn,mi)=>html`<option value="${mi+1}" ${mi+1===c.mese?'selected':''}>${mn}</option>`)}</select></td><td><button class="pulsante piccolo icona" data-azione="buste-togli" data-i="${i}" aria-label="Togli">${icona('chiudi','piccola')}</button></td></tr>`)}</tbody></table><div class="riga mt-s"><span class="piccolo secondario">${coda.filter(c=>!c.personaId||!c.anno||!c.mese).length} senza destinazione completa: finiranno in «da assegnare»</span><span class="spazio"></span><button class="pulsante primario" data-azione="buste-applica">${icona('spunta')}Archivia ${coda.length} buste</button></div></div>`:''}
      ${daAssegnare.length?html`<div class="sezione-titolo">Da assegnare (${daAssegnare.length})</div><ul class="elenco-piatto">${daAssegnare.map(b=>{const m=fileMeta(b.fileId);return html`<li>${icona('attenzione','piccola')}<span class="spazio taglia">${m?m.nome:'file?'}</span><button class="pulsante piccolo" data-azione="busta-apri" data-id="${b.id}">Assegna</button></li>`})}</ul>`:''}
      ${(stato.regoleBuste||[]).length?html`<details class="mt"><summary class="piccolo secondario">Regole apprese (${stato.regoleBuste.length})</summary><ul class="elenco-piatto piccolo">${stato.regoleBuste.map((rg,i)=>html`<li><span class="mono">${rg.segno}</span> → ${nomePersona(persona(rg.personaId))}<span class="spazio"></span><button class="pulsante piccolo icona" data-azione="busta-regola-elimina" data-i="${i}" aria-label="Elimina regola">${icona('chiudi','piccola')}</button></li>`)}</ul></details>`:''}
    </div>
    <div class="scheda"><h3>Consultazione per operaio</h3>
      <div class="chip-lista mb">${persone.map(pp=>html`<a class="chip ${pid===pp.id?'attiva':''}" href="#/documenti/buste?persona=${pp.id}">${nomePersona(pp)} <span class="piccolo secondario">${stato.bustePaga.filter(b=>b.personaId===pp.id).length}</span></a>`)}</div>
      ${p?anni.map(anno=>html`<div class="sezione-titolo">${anno}</div><div class="griglia-mesi">${Array.from({length:12},(_,i)=>i+1).map(mm=>{const b=buste.find(x=>x.anno===anno&&x.mese===mm);const futuro=anno>oggiD.getFullYear()||(anno===oggiD.getFullYear()&&mm>oggiD.getMonth());const lavorato=!!(meseP(anno,mm)&&meseP(anno,mm).persone[p.id]);return html`<div class="mese-cella ${b?'presente':futuro?'futuro':lavorato?'mancante':''}" ${b?html`data-azione="busta-apri" data-id="${b.id}"`:''} title="${b?'Busta presente':lavorato&&!futuro?'Mese lavorato senza busta':''}">${NOMI_MESI_BREVI[mm-1]}${b?html`<br>${icona('ok','piccola')}`:lavorato&&!futuro?html`<br>${icona('attenzione','piccola')}`:''}</div>`})}</div>`):html`<p class="secondario">Scegli una persona per vedere le buste per anno e mese, con i mesi mancanti evidenziati.</p>`}
    </div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.busta||!ui.busteCoda)return;const c=ui.busteCoda[+t.dataset.i];if(!c)return;const k=t.dataset.busta;const v=t.value;if(k==='personaId'){c.personaId=v||null;c.corretto=true}else if(k==='anno')c.anno=v?+v:null;else if(k==='mese')c.mese=v?+v:null});
AZIONI['buste-scegli']=async()=>{const fs=await scegliFile({accetta:'.pdf'});if(fs.length)accodaBuste(fs)};
AZIONI['buste-togli']=d=>{ui.busteCoda.splice(+d.i,1);render()};
AZIONI['busta-regola-elimina']=d=>esegui('Eliminata regola buste paga',s=>{s.regoleBuste.splice(+d.i,1)});
function accodaBuste(files){ui.busteCoda=(ui.busteCoda||[]).concat(files.map(f=>Object.assign({f},interpretaNomeBusta(f.name))));render()}
// ---- smistamento di un unico PDF con più buste separate da pagine bianche ----
AZIONI['buste-smistamento-scegli']=async()=>{const fs=await scegliFile({multipli:false,accetta:'.pdf'});if(fs.length)await smistaBustaPdf(fs[0])};
async function smistaBustaPdf(file){
  const oggiD=new Date();
  const periodo=await dialogoModulo('Periodo delle buste nel PDF',[{nome:'anno',etichetta:'Anno',tipo:'numero',decimali:0,obbligatorio:true},{nome:'mese',etichetta:'Mese',tipo:'select',vuoto:false,obbligatorio:true,opzioni:NOMI_MESI.map((mn,i)=>({v:i+1,t:mn}))}],{anno:oggiD.getFullYear(),mese:oggiD.getMonth()+1},{ok:'Continua'});
  if(!periodo) return;
  const prog=dialogoAvanzamento('Lettura del PDF',{testo:'Estraggo il testo dalle pagine…'});
  let pagine;
  try{ pagine=(await estraiTestoPdf(file,(i,n)=>prog.aggiorna(i,n,'pagina '+i+' di '+n))).pagine; }
  catch(e){ prog.chiudi(); segnalaErrore(e,'Non sono riuscito a leggere il PDF'); return; }
  prog.chiudi();
  if(!pagine||!pagine.length) return avviso('Il PDF non ha pagine leggibili (forse una scansione senza testo)',{tipo:'errore'});
  // Le pagine bianche non separano un operaio dall'altro: nel PDF del commercialista busta e pagina
  // bianca si alternano sempre, e chi ha più fogli li ha comunque separati da una bianca. L'unica
  // cosa che dice di chi è una pagina è il nome scritto sopra: si raggruppa per quello.
  const compatta=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'');
  const trovaPersona=testo=>{
    const q=compatta(testo);
    return stato.persone.find(p=>{
      const cog=compatta(p.cognome),nom=compatta(p.nome);
      if(p.cf&&q.includes(compatta(p.cf))) return true;
      return cog&&nom&&(q.includes(cog+nom)||q.includes(nom+cog)||(q.includes(cog)&&q.includes(nom)));
    });
  };
  const vuota=t=>t.replace(/\s/g,'').length<40;
  const perPersona=new Map();const orfane=[];
  let ultimo=null;
  pagine.forEach((t,i)=>{
    if(vuota(t)) return;
    const p=trovaPersona(t);
    if(p){ if(!perPersona.has(p.id))perPersona.set(p.id,[]); perPersona.get(p.id).push(i+1); ultimo=p.id; }
    else if(ultimo&&perPersona.has(ultimo)){ perPersona.get(ultimo).push(i+1); } // foglio di seguito senza nome leggibile
    else orfane.push(i+1);
  });
  if(!perPersona.size&&!orfane.length) return avviso('Non ho trovato pagine con contenuto nel PDF',{tipo:'errore'});
  const voci=[];
  for(const [pid,pg] of perPersona){
    const p=persona(pid);
    voci.push({f:file,personaId:pid,anno:+periodo.anno,mese:+periodo.mese,pagine:pg,paginaInizio:pg[0],paginaFine:pg[pg.length-1],fiducia:0.9,
      motivi:['nome trovato sulle pagine: '+nomePersona(p),(pg.length===1?'pag. ':'pagg. ')+pg.join(', ')]});
  }
  voci.sort((a,b)=>a.paginaInizio-b.paginaInizio);
  if(orfane.length) voci.push({f:file,personaId:null,anno:+periodo.anno,mese:+periodo.mese,pagine:orfane,paginaInizio:orfane[0],paginaFine:orfane[orfane.length-1],fiducia:0,motivi:['nessun nome riconosciuto','pagg. '+orfane.join(', ')]});
  ui.busteCoda=(ui.busteCoda||[]).concat(voci);
  render();
  const pagTot=voci.reduce((a,v)=>a+(v.pagine?v.pagine.length:1),0);
  avviso(`${pagTot} pagine di busta raggruppate su ${voci.filter(v=>v.personaId).length} persone${voci.some(v=>!v.personaId)?', più le pagine senza nome riconosciuto da assegnare a mano':''}`);
}
AZIONI['buste-applica']=async()=>{
  const coda=ui.busteCoda||[]; if(!coda.length) return;
  const prog=dialogoAvanzamento('Archiviazione buste paga');
  const nuove=[];const regole=[];
  for(let i=0;i<coda.length;i++){const c=coda[i];await prog.aggiorna(i,coda.length,c.f.name);try{const es=await acquisisciFile(c.f,{senzaCompressione:true});nuove.push({id:nuovoId('b'),personaId:c.personaId||null,anno:c.anno||null,mese:c.mese||null,netto:null,lordo:null,oreRetribuite:null,fileId:es.rec.id,paginaInizio:c.paginaInizio||null,paginaFine:c.paginaFine||null,pagine:c.pagine||null,note:c.pagine?('Smistata da '+c.f.name+', '+(c.pagine.length===1?'pag. ':'pagg. ')+c.pagine.join(', ')):c.paginaInizio?('Smistata da '+c.f.name+', pag. '+c.paginaInizio):('File: '+c.f.name),creato:new Date().toISOString()});
    // apprendimento: se l'utente ha corretto la persona, associa i segni del nome file a quella persona
    if(c.corretto&&c.personaId){const toks=normalizzaTesto(c.f.name.replace(/\.[a-z0-9]+$/i,'')).split(' ').filter(t=>t.length>=3&&!/^\d+$/.test(t)&&!NOMI_MESI.includes(t)&&!/busta|paga|cedolino|pdf|lul/.test(t));const per=persona(c.personaId);const nomi=[per.cognome,per.nome].flatMap(x=>normalizzaTesto(x).split(' '));for(const t of toks){if(!nomi.includes(t)&&!(stato.regoleBuste||[]).find(r=>r.segno===t))regole.push({segno:t,personaId:c.personaId})}}
  }catch(e){segnalaErrore(e,'Busta non archiviata: '+c.f.name)}}
  prog.chiudi();
  esegui(`Archiviate ${nuove.length} buste paga`,s=>{s.bustePaga.push(...nuove);for(const r of regole)if(!s.regoleBuste.find(x=>x.segno===r.segno))s.regoleBuste.push(r)});
  ui.busteCoda=[];
  if(regole.length) avviso('Imparate '+regole.length+' nuove regole dai nomi dei file',{silenzioso:false});
};
AZIONI['busta-apri']=async d=>{
  const b=perId('bustePaga',d.id); if(!b) return;
  const m=fileMeta(b.fileId);
  apriPannello({titolo:'Busta paga '+(b.anno&&b.mese?fMeseAnno(b.anno,b.mese):'da assegnare')+(b.personaId?' · '+nomePersona(persona(b.personaId)):''),largo:true,corpo:html`<div class="campi"><div class="campo"><span class="etichetta-campo">File</span><div>${m?m.nome:'?'}${b.paginaInizio?html` <span class="piccolo secondario">(pag. ${b.paginaInizio}${b.paginaFine>b.paginaInizio?'–'+b.paginaFine:''} di un file condiviso)</span>`:''}</div></div><div class="campo"><span class="etichetta-campo">Netto</span><div>${b.netto!=null?fEuro(b.netto):html`<span class="silenzioso">—</span>`}</div></div><div class="campo"><span class="etichetta-campo">Lordo</span><div>${b.lordo!=null?fEuro(b.lordo):html`<span class="silenzioso">—</span>`}</div></div><div class="campo"><span class="etichetta-campo">Ore retribuite</span><div>${b.oreRetribuite!=null?fOre(b.oreRetribuite):html`<span class="silenzioso">—</span>`}</div></div></div><div id="anteprima-busta" class="mt"></div>`,piede:html`<button class="pulsante primario" data-azione="busta-modifica" data-id="${b.id}">${icona('modifica')}Modifica</button><button class="pulsante" data-azione="file-condividi" data-id="${b.fileId}">${icona('condividi')}Condividi</button><span class="spazio"></span><button class="pulsante pericolo" data-azione="busta-elimina" data-id="${b.id}">${icona('elimina')}Elimina</button>`});
  const a=await htmlAnteprimaFile(b.fileId,b.paginaInizio);const c=el('#anteprima-busta');if(c)c.innerHTML=a;
};
AZIONI['busta-modifica']=async d=>{const b=perId('bustePaga',d.id);const v=await dialogoModulo('Busta paga',[{nome:'personaId',etichetta:'Persona',tipo:'select',obbligatorio:true,opzioni:stato.persone.map(p=>({v:p.id,t:nomePersona(p)}))},{nome:'anno',etichetta:'Anno',tipo:'numero',decimali:0,obbligatorio:true},{nome:'mese',etichetta:'Mese',tipo:'select',obbligatorio:true,opzioni:NOMI_MESI.map((m,i)=>({v:i+1,t:m}))},{nome:'netto',etichetta:'Netto',tipo:'euro'},{nome:'lordo',etichetta:'Lordo',tipo:'euro'},{nome:'oreRetribuite',etichetta:'Ore retribuite',tipo:'ore'},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}],b);if(!v)return;v.mese=+v.mese;const vecchia=b.personaId;esegui('Modificata busta paga',s=>{Object.assign(s.bustePaga.find(x=>x.id===b.id),v);if(vecchia!==v.personaId){const m=fileMeta(b.fileId);if(m){const toks=normalizzaTesto(m.nome.replace(/\.[a-z0-9]+$/i,'')).split(' ').filter(t=>t.length>=3&&!/^\d+$/.test(t)&&!NOMI_MESI.includes(t)&&!/busta|paga|cedolino|pdf|lul/.test(t));const per=s.persone.find(p=>p.id===v.personaId);const nomi=[per.cognome,per.nome].flatMap(x=>normalizzaTesto(x).split(' '));for(const t of toks)if(!nomi.includes(t)&&!s.regoleBuste.find(r=>r.segno===t))s.regoleBuste.push({segno:t,personaId:v.personaId})}}});AZIONI['busta-apri']({id:b.id})};
AZIONI['busta-elimina']=async d=>{if(!(await conferma('Eliminare questa busta paga? Il file resta nel cestino 30 giorni.',{pericolo:true,ok:'Elimina'})))return;chiudiPannello();esegui('Eliminata busta paga',s=>{s.bustePaga=s.bustePaga.filter(x=>x.id!==d.id);cestinaFileOrfani(s)})};


// ---- modelli ----
function vistaModelli(r){
  const sotto=ui.filtri.modelli||'dichiarazioni';
  return html`${linguette('modelli',[{id:'dichiarazioni',testo:'Dichiarazioni'},{id:'pos',testo:'Testo POS'},{id:'carta',testo:'Carta intestata e firme'}],sotto)}
  ${sotto==='dichiarazioni'?html`<div class="scheda"><h3>Modelli di dichiarazione <span class="azioni"><button class="pulsante piccolo" data-azione="modello-nuovo">${icona('piu')}Nuovo</button></span></h3><p class="secondario piccolo">Clicca <b>Compila</b> per averla pronta da stampare in pochi secondi: si riempie da sola con i dati dell'azienda e, se scegli un cantiere, anche i suoi.</p>
    <input type="search" placeholder="Cerca un modello" value="${ui.filtri.cercaModelli||''}" data-cambio="filtro-modelli-cerca" aria-label="Cerca modello" class="mb-s" style="max-width:320px">
    ${tabella({righe:stato.modelli.dichiarazioni.filter(m=>!ui.filtri.cercaModelli||normalizzaTesto(m.nome).includes(normalizzaTesto(ui.filtri.cercaModelli))),onRiga:m=>dialogoModello(m),colonne:[{chiave:'nome',titolo:'Documento',principale:true,formatta:m=>html`<b>${m.nome}</b>${m.firmatario?html`<br><span class="piccolo secondario">Firma: ${m.firmatario}</span>`:''}`},{chiave:'az',titolo:'',classe:'azioni',formatta:m=>html`<button class="pulsante piccolo primario" data-azione="dichiarazione-compila" data-modello="${m.id}">${icona('stampa','piccola')}Compila</button>`}],vuoto:vuoto({icona:'firma',titolo:'Nessun modello trovato',testo:'Prova un altro termine di ricerca.'})})}</div>`:''}
  ${sotto==='pos'?vistaModelloPos():''}
  ${sotto==='carta'?html`<div class="griglia due"><div class="scheda"><h3>Carta intestata</h3><p class="secondario piccolo">Righe di testo accanto al logo, su ogni pagina dei documenti.</p><ol>${(stato.azienda.cartaIntestata.righe||[]).map(x=>html`<li>${x}</li>`)}</ol><button class="pulsante" data-azione="carta-modifica">${icona('modifica')}Modifica righe</button><div class="mt"><img src="${IMMAGINI.logo}" alt="Logo" style="height:60px"></div></div>
    <div class="scheda"><h3>Firme e timbro</h3><div class="griglia tre">${[['firmaTimbro','Timbro e firma (documenti)'],['firmaLegale','Firma Legale Rappresentante'],['firmaRspp','Firma RSPP'],['firmaRls','Firma RLS']].map(([k,t])=>html`<div><div class="etichetta-campo">${t}</div><div class="riquadro-firma"><img src="${immagineAzienda(k)}" alt="${t}"></div><div class="mt-s"><button class="pulsante piccolo" data-azione="immagine-sostituisci" data-chiave="${k}">${icona('carica','piccola')}Sostituisci</button>${stato.azienda['img_'+k]?html` <button class="pulsante piccolo" data-azione="immagine-ripristina" data-chiave="${k}">Originale</button>`:''}</div></div>`)}</div><p class="piccolo secondario mt">La firma grafica non sostituisce la firma digitale: dove un documento la richiede, l'applicazione prepara il PDF e lo segnala.</p></div></div>`:''}`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-linguetta="modelli"]');if(b){e.stopImmediatePropagation();ui.filtri.modelli=b.dataset.valore;render()}},true);
AZIONI['filtro-modelli-cerca']=(d,t)=>{ui.filtri.cercaModelli=t.value;render();setTimeout(()=>{const i=el('[data-cambio="filtro-modelli-cerca"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
document.addEventListener('input',debounce(e=>{const t=e.target;if(t.matches&&t.matches('[data-cambio="filtro-modelli-cerca"]'))AZIONI['filtro-modelli-cerca']({},t)},250));
function immagineAzienda(chiave){return (stato.azienda['img_'+chiave])||IMMAGINI[chiave]}
AZIONI['immagine-sostituisci']=async d=>{const fs=await scegliFile({multipli:false,accetta:'image/*'});if(!fs.length)return;const c=await comprimiImmagine(fs[0],{maxLato:900,obiettivo:120*1024});const du=await leggiComeDataUrl(fs[0].type==='image/png'&&fs[0].size<200000?fs[0]:c.blob);esegui('Sostituita immagine '+d.chiave,s=>{s.azienda['img_'+d.chiave]=du})};
AZIONI['immagine-ripristina']=d=>esegui('Ripristinata immagine originale',s=>{delete s.azienda['img_'+d.chiave]});
AZIONI['carta-modifica']=async()=>{const v=await chiediTesto('Righe della carta intestata',{multiriga:true,valore:(stato.azienda.cartaIntestata.righe||[]).join('\n'),aiuto:'Una riga per ogni linea'});if(v==null)return;esegui('Modificata carta intestata',s=>{s.azienda.cartaIntestata.righe=v.split('\n').map(x=>x.trim()).filter(Boolean)})};
AZIONI['modello-nuovo']=()=>dialogoModello(null);
// I campi che si riempiono da soli. Ogni voce ha un nome in italiano: chi scrive un modello clicca
// "Nome del cantiere", non deve sapere che dietro c'è {{cantiere.nome}}. La sintassi resta valida
// per chi la conosce, ma non è più necessario conoscerla.
const SEGNAPOSTO_GRUPPI=[
  ['Azienda',[['azienda.ragioneSociale','Ragione sociale'],['azienda.sede','Sede'],['azienda.piva','Partita IVA'],['azienda.cf','Codice fiscale'],['azienda.pec','PEC'],['azienda.telefono','Telefono'],['azienda.email','Email'],['azienda.inail','Codice INAIL'],['azienda.rea','Numero REA']]],
  ['Legale rappresentante',[['legale.nome','Nome e cognome'],['legale.natoA','Luogo di nascita'],['legale.natoIl','Data di nascita'],['legale.residenza','Residenza'],['legale.cf','Codice fiscale']]],
  ['Cantiere',[['cantiere.nome','Nome del cantiere'],['cantiere.indirizzo','Indirizzo del cantiere'],['cantiere.comune','Comune'],['cantiere.cap','CAP'],['cantiere.descrizione','Descrizione dei lavori'],['cantiere.lavorazioni','Lavorazioni (una riga)'],['cantiere.lavorazioniElenco','Lavorazioni (elenco numerato)']]],
  ['Committente e affidataria',[['committente.nome','Committente'],['committente.indirizzo','Indirizzo del committente'],['affidataria.nome','Impresa affidataria'],['affidataria.indirizzo','Indirizzo dell\'affidataria']]],
  ['Figure della sicurezza',[['cse.nome','Coordinatore (CSE)'],['rspp.nome','RSPP'],['rls.nome','RLS'],['medico.nome','Medico competente'],['preposto.nome','Preposto'],['preposto.cf','Codice fiscale del preposto'],['preposto.natoIl','Data di nascita del preposto'],['preposto.corsoData','Data del corso preposto']]],
  ['Operai del cantiere',[['operai.elenco','Elenco degli operai'],['operai.tabella','Tabella degli operai con i dati'],['addettiAntincendio.elenco','Addetti antincendio'],['addettiPrimoSoccorso.elenco','Addetti primo soccorso']]],
  ['In fondo al documento',[['oggi','Data di compilazione'],['luogoData','Luogo, data e firma'],['preposto.accettazione','Firma per accettazione del preposto'],['addettiAntincendio.accettazione','Firma degli addetti antincendio'],['addettiPrimoSoccorso.accettazione','Firma degli addetti primo soccorso']]],
];
function dialogoModello(m){
  const nuovo=!m; m=m||{nome:'',testo:'# TITOLO\n\nIl sottoscritto {{legale.nome}}…\n\n{{luogoData}}',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante'};
  const picker=html`<div class="segnaposto-picker">${SEGNAPOSTO_GRUPPI.map(([g,voci])=>html`<div class="gruppo"><b class="piccolo">${g}</b><div class="chip-lista">${voci.map(([k,et])=>html`<button type="button" class="chip" data-segnaposto="${k}" title="Inserisce ${et.toLowerCase()} nel punto in cui stai scrivendo">${et}</button>`)}</div></div>`)}</div>`;
  return dialogoModulo(nuovo?'Nuovo modello':'Modello: '+m.nome,[{nome:'nome',etichetta:'Nome del documento',obbligatorio:true,largo:true},{nome:'firmatario',etichetta:'Dicitura firmatario'},{nome:'cartaIntestata',tipo:'spunta',testo:'Su carta intestata'},{nome:'firma',tipo:'spunta',testo:'Va firmato'},{nome:'timbro',tipo:'spunta',testo:'Va timbrato'},{nome:'soloConSubappalto',tipo:'spunta',testo:'Solo se ci sono subappaltatori'},{nome:'testo',etichetta:'Testo del documento',tipo:'textarea',righe:18,largo:true,obbligatorio:true,aiuto:'Si scrive normalmente. # titolo, ## sottotitolo, - elenco, **grassetto**, tabelle con |'}],m,
    {intro:html`<p class="piccolo secondario">Scrivi il testo come lo diresti. Dove serve un dato che l'applicazione conosce già, clicca il campo qui sotto e lo inserisce dove sei arrivato a scrivere: si riempirà da solo con i dati dell'azienda, del legale rappresentante e del cantiere. Quello che manca esce in rosso, non viene mai inventato.</p>${picker}<p class="piccolo"><button type="button" class="pulsante piccolo" id="mod-anteprima">${icona('occhio','piccola')}Vedi com'è compilato</button></p>`,
    alMontaggio:v=>{
      const ta=v.querySelector('[name=testo]');
      let fine=ta.value.length,inizio=fine;
      ta.addEventListener('blur',()=>{inizio=ta.selectionStart;fine=ta.selectionEnd});
      tutti('[data-segnaposto]',v).forEach(b=>b.addEventListener('click',()=>{
        const t='{{'+b.dataset.segnaposto+'}}';
        ta.value=ta.value.slice(0,inizio)+t+ta.value.slice(fine);
        inizio=fine=inizio+t.length;
        ta.focus();ta.setSelectionRange(inizio,fine);
      }));
      v.querySelector('#mod-anteprima').addEventListener('click',()=>anteprimaModello(Object.assign({},m,{nome:v.querySelector('[name=nome]').value||m.nome||'Modello',testo:ta.value,firma:v.querySelector('[name=firma]').checked,cartaIntestata:v.querySelector('[name=cartaIntestata]').checked})));
    },
    pulsantiExtra:nuovo?[]:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare il modello «'+m.nome+'»?',{pericolo:true,ok:'Elimina'})){esegui('Eliminato modello',s=>{s.modelli.dichiarazioni=s.modelli.dichiarazioni.filter(x=>x.id!==m.id)});return null}return false}}]}).then(v=>{if(!v)return;if(nuovo)esegui('Nuovo modello '+v.nome,s=>{s.modelli.dichiarazioni.push(Object.assign({id:nuovoId('mod')},v))});else esegui('Modificato modello '+v.nome,s=>{Object.assign(s.modelli.dichiarazioni.find(x=>x.id===m.id),v)})});
}
// Anteprima del modello con i dati veri di un cantiere: è il modo più corto per capire cosa fa un
// campo senza doverne leggere il nome tecnico.
async function anteprimaModello(m){
  const c=stato.cantieri.find(x=>x.stato==='attivo')||stato.cantieri[0]||null;
  anteprimaStampa({titolo:m.nome+(c?' · esempio su '+c.nome:' · esempio'),doc:docDichiarazione(m,c,{data:oggi()}),registra:false});
}
function vistaModelloPos(){
  const testo=posTestoCorrente();
  const macch=posMacchineCorrenti();
  return html`<div class="scheda"><h3>Testo standard del POS</h3><p class="secondario piccolo">Travasato integralmente da <span class="mono">${testo.origine}</span>. Le sezioni si possono correggere; le tabelle che dipendono dal cantiere si riempiono da sole. Le schede delle lavorazioni e delle macchine sono collegate alle lavorazioni: includere una lavorazione porta dentro le sue schede.</p>
  <table class="tabella densa reattiva"><thead><tr><th>N.</th><th>Sezione</th><th>Blocchi</th><th></th></tr></thead><tbody>${testo.sezioni.map((sz,i)=>html`<tr><td data-etichetta="N.">${sz.numero||''}</td><td data-etichetta="Sezione" class="principale">${sz.titolo}</td><td data-etichetta="Blocchi">${sz.blocchi.length}${sz.schede?' · '+sz.schede.length+' schede':''}</td><td class="azioni"><button class="pulsante piccolo" data-azione="pos-sezione-modifica" data-i="${i}">${icona('modifica','piccola')}Testo</button></td></tr>`)}</tbody></table>
  <div class="sezione-titolo">Schede macchine e lavorazioni collegate</div><table class="tabella densa reattiva"><thead><tr><th>Macchina</th><th>Lavorazioni</th></tr></thead><tbody>${macch.map((m,i)=>html`<tr><td data-etichetta="Macchina" class="principale">${m.titolo}</td><td data-etichetta="Lavorazioni"><div class="chip-lista">${stato.lavorazioni.map(l=>html`<label class="chip ${m.lavorazioni.includes(l.id)?'attiva':''}"><input type="checkbox" data-cambio="pos-macchina-lav" data-i="${i}" data-lav="${l.id}" ${m.lavorazioni.includes(l.id)?'checked':''}>${l.breve}</label>`)}</div></td></tr>`)}</tbody></table>
  ${stato.modelli.posTesto?html`<p class="mt"><button class="pulsante piccolo pericolo" data-azione="pos-testo-ripristina">Ripristina il testo originale del modello</button></p>`:''}</div>`;
}
function posTestoCorrente(){return stato.modelli.posTesto||POS_TESTO}
function posMacchineCorrenti(){const base=(posTestoCorrente().sezioni.find(s=>s.id==='macchine')||{}).schede||[];const mappa=stato.modelli.posMacchine||{};return base.map(m=>({...m,lavorazioni:mappa[m.id]||m.lavorazioni}))}
AZIONI['pos-macchina-lav']=(d,t)=>{const macch=posMacchineCorrenti();const m=macch[+d.i];const lav=+d.lav;const nuove=t.checked?unici([...m.lavorazioni,lav]):m.lavorazioni.filter(x=>x!==lav);esegui('Collegamento macchina «'+m.titolo+'»',s=>{s.modelli.posMacchine=s.modelli.posMacchine||{};s.modelli.posMacchine[m.id]=nuove},{senzaRender:true,silenzioso:true})};
AZIONI['pos-testo-ripristina']=async()=>{if(!(await conferma('Ripristinare il testo originale del modello? Le tue modifiche al testo del POS andranno perse.',{pericolo:true})))return;esegui('Ripristinato testo POS originale',s=>{s.modelli.posTesto=null})};
AZIONI['pos-sezione-modifica']=async d=>{
  const testo=clona(posTestoCorrente());const sz=testo.sezioni[+d.i];
  // editor semplice: i paragrafi e le voci di elenco come righe di testo; le tabelle restano intatte
  const righe=sz.blocchi.map((b,i)=>b.t==='p'||b.t==='li'||b.t==='h'?{i,testo:b.testo!==undefined?b.testo:(b.r||[]).map(x=>x[0]).join('')}:null).filter(Boolean);
  const v=await dialogo({titolo:'Sezione '+(sz.numero||'')+' · '+sz.titolo,enorme:true,corpo:html`<p class="piccolo secondario">Modifica il testo dei paragrafi. Le tabelle e le immagini non sono modificabili qui. Le modifiche valgono per i POS generati da ora in poi.</p>${righe.map(r=>html`<div class="campo mb-s"><label class="piccolo">${sz.blocchi[r.i].t==='h'?'Titolo':sz.blocchi[r.i].t==='li'?'Voce elenco':'Paragrafo'} ${r.i+1}</label><textarea data-blocco="${r.i}" rows="${Math.min(8,Math.max(1,Math.ceil(r.testo.length/110)))}">${r.testo}</textarea></div>`)}`,pulsanti:[{testo:'Annulla',valore:null},{testo:'Salva',classe:'primario',primario:true,fn:v=>tutti('[data-blocco]',v).map(t=>({i:+t.dataset.blocco,testo:t.value}))}]});
  if(!v) return;
  for(const r of v){const b=sz.blocchi[r.i];if(b.testo!==undefined){b.testo=r.testo}else{b.r=[[r.testo,'']];}}
  esegui('Modificato testo POS: '+sz.titolo,s=>{s.modelli.posTesto=testo});
};

// ---- documenti generati ----
function vistaGenerati(){
  const gen=ordina(stato.generati||[],'quando','desc');
  return html`<div class="scheda"><h3>Documenti generati</h3><p class="secondario piccolo">Ogni documento stampato dall'applicazione resta qui, ristampabile identico.</p>${tabella({righe:gen,colonne:[{chiave:'quando',titolo:'Quando',principale:true,formatta:g=>fDataOra(g.quando)},{chiave:'titolo',titolo:'Documento'},{chiave:'rif',titolo:'Riferimento',formatta:g=>g.riferimento||''},{chiave:'az',titolo:'',classe:'azioni',formatta:g=>html`<button class="pulsante piccolo" data-azione="generato-ristampa" data-id="${g.id}">${icona('stampa','piccola')}Ristampa</button> <button class="pulsante piccolo pericolo icona" data-azione="generato-elimina" data-id="${g.id}" aria-label="Elimina">${icona('elimina','piccola')}</button>`}],vuoto:vuoto({icona:'stampa',titolo:'Nessun documento generato',testo:'Stampa uno scadenzario, una dichiarazione o un POS: resterà qui.'})})}</div>`;
}
AZIONI['generato-ristampa']=d=>{const g=perId('generati',d.id);if(g)anteprimaStampa({titolo:g.titolo,pagineHtml:g.pagine,orientamento:g.orientamento,giaRegistrato:true})};
AZIONI['generato-elimina']=async d=>{if(!(await conferma('Eliminare questo documento generato?',{pericolo:true})))return;esegui('Eliminato documento generato',s=>{s.generati=s.generati.filter(x=>x.id!==d.id)})};
