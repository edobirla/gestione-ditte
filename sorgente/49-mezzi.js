// ---------------------------------------------------------------------
// MEZZI: parco automezzi con documenti a scadenza (assicurazione, revisione, bollo, libretto).
// I documenti vivono nell'archivio trasversale (soggettoTipo 'mezzo'), come per persone e cantieri.
// ---------------------------------------------------------------------
const TIPI_MEZZO=['Furgone','Autocarro','Auto','Rimorchio','Macchina operatrice','Altro'];
function documentoPiuCriticoMezzo(m){
  const docs=documentiDi('mezzo',m.id).map(d=>({d,info:infoDocumento(d)}));
  const ord=['scaduto','scadenza','pianificare','valido','riferimento'];
  docs.sort((a,b)=>ord.indexOf(a.info.stato)-ord.indexOf(b.info.stato)||(a.info.giorni||0)-(b.info.giorni||0));
  const peggio=docs[0];
  if(!peggio) return {stato:'riferimento',testo:'Nessun documento'};
  const t=tipoDoc(peggio.d.tipoId);
  return {stato:peggio.info.stato,testo:(t?t.nome:'')+(peggio.info.data?' · '+fData(peggio.info.data):''),info:peggio.info,doc:peggio.d};
}
VISTE.mezzi=function(r){
  if(r.query.nuovo){setTimeout(()=>dialogoMezzo(null),0);history.replaceState(null,'','#/mezzi')}
  if(r.id) return vistaMezzo(r.id);
  const righe=stato.mezzi.map(m=>({m,crit:documentoPiuCriticoMezzo(m)}));
  return html`<div class="testata"><div><h1>Mezzi</h1><div class="sotto">${plurale(stato.mezzi.length,'mezzo','mezzi')} · ${righe.filter(r=>r.crit.stato==='scaduto').length} con documenti scaduti</div></div>
    <div class="azioni"><button class="pulsante primario" data-azione="mezzo-nuovo">${icona('piu')}Nuovo mezzo</button></div></div>
  ${tabella({id:'mezzi',righe,chiaveOrd:'targa',href:r=>'#/mezzi/'+r.m.id,classeRiga:r=>'riga-'+r.crit.stato,colonne:[
    {chiave:'targa',titolo:'Targa',principale:true,formatta:r=>html`<b>${r.m.targa||daCompilare()}</b>`},
    {chiave:'tipo',titolo:'Tipo',valore:r=>r.m.tipo||''},
    {chiave:'modello',titolo:'Marca e modello',valore:r=>[r.m.marca,r.m.modello].filter(Boolean).join(' ')},
    {chiave:'assegnato',titolo:'Assegnato a',formatta:r=>r.m.assegnatoA?nomePersona(persona(r.m.assegnatoA)):html`<span class="silenzioso">—</span>`},
    {chiave:'critico',titolo:'Documento più critico',valore:r=>STATI_DOC[r.crit.stato]?STATI_DOC[r.crit.stato].ordine:9,formatta:r=>html`${pillola(r.crit.stato,undefined,{stimata:r.crit.info&&r.crit.info.stimata})}<br><span class="piccolo secondario">${r.crit.testo}</span>`},
  ],vuoto:vuoto({icona:'mezzo',titolo:'Nessun mezzo',testo:'Aggiungi i mezzi aziendali per seguire assicurazione, revisione e bollo.',azione:{testo:'Nuovo mezzo',azione:'mezzo-nuovo'}})})}`;
};
AZIONI['mezzo-nuovo']=()=>dialogoMezzo(null);
AZIONI['mezzo-modifica']=d=>dialogoMezzo(perId('mezzi',d.id));
function vistaMezzo(id){
  const m=perId('mezzi',id); if(!m) return html`<div class="vuoto">${icona('attenzione')}<h3>Mezzo non trovato</h3><a class="pulsante" href="#/mezzi">Torna all'elenco</a></div>`;
  const ling=linguettaAttiva('mezzo:'+m.id,'documenti');
  const docs=documentiDi('mezzo',m.id);
  const nDocCritici=docs.filter(d=>['scaduto','scadenza'].includes(infoDocumento(d).stato)).length;
  return html`<div class="briciole"><a href="#/mezzi">Mezzi</a> › ${nomeMezzo(m)}</div>
  <div class="testata"><div><h1>${nomeMezzo(m)}</h1><div class="sotto">${m.tipo||''}${m.assegnatoA?' · assegnato a '+nomePersona(persona(m.assegnatoA)):''}</div></div>
    <div class="azioni"><button class="pulsante" data-azione="documento-nuovo" data-soggetto-tipo="mezzo" data-soggetto-id="${m.id}">${icona('allega')}Aggiungi documento</button><button class="pulsante" data-azione="mezzo-modifica" data-id="${m.id}">${icona('modifica')}Modifica</button></div></div>
  ${linguette('mezzo:'+m.id,[{id:'documenti',testo:'Documenti',icona:'documenti',contatore:nDocCritici||null,critico:nDocCritici>0},{id:'dati',testo:'Dati',icona:'mezzo'}],ling)}
  ${ling==='documenti'?schedaDocumentiMezzo(m):schedaDatiMezzo(m)}`;
}
function schedaDocumentiMezzo(m){
  const docs=documentiDi('mezzo',m.id).map(d=>({d,info:infoDocumento(d),tipo:tipoDoc(d.tipoId)}));
  const ord=['scaduto','scadenza','pianificare','valido','riferimento'];
  docs.sort((a,b)=>ord.indexOf(a.info.stato)-ord.indexOf(b.info.stato)||(a.info.giorni||0)-(b.info.giorni||0));
  return html`<div class="zona-drop mb" data-azione="documento-nuovo" data-soggetto-tipo="mezzo" data-soggetto-id="${m.id}" data-drop-soggetto="mezzo:${m.id}">${icona('carica')}Trascina qui una scansione o un PDF, oppure clicca per aggiungere un documento</div>
  ${tabella({id:'docmezzo',righe:docs,onRiga:r=>apriDocumento(r.d.id),classeRiga:r=>'riga-'+r.info.stato,colonne:[
    {chiave:'tipo',titolo:'Documento',principale:true,valore:r=>r.tipo?r.tipo.nome:'',formatta:r=>html`<b>${r.tipo?r.tipo.nome:'[tipo?]'}</b>${r.d.titolo?html`<br><span class="piccolo secondario">${r.d.titolo}</span>`:''}${!(r.d.file||[]).length?html`<br><span class="piccolo da-compilare">nessun file allegato</span>`:''}`},
    {chiave:'emissione',titolo:'Emissione',valore:r=>r.d.dataEmissione||'',formatta:r=>r.d.dataEmissione?fData(r.d.dataEmissione):html`<span class="silenzioso">—</span>`},
    {chiave:'scadenza',titolo:'Scadenza',valore:r=>r.info.data||'',formatta:r=>r.info.data?html`<span class="${r.info.stimata?'stimata':''}">${fData(r.info.data)}${r.info.stimata?' ~':''}</span>`:r.d.senzaScadenza?html`<span class="silenzioso">nessuna</span>`:daCompilare('data?')},
    {chiave:'stato',titolo:'Stato',valore:r=>ord.indexOf(r.info.stato),formatta:r=>pillolaDocumento(r.info)},
    {chiave:'file',titolo:'File',valore:r=>(r.d.file||[]).length,formatta:r=>html`${(r.d.file||[]).map(f=>{const mm=fileMeta(f);return mm?html`<span class="etichetta-tag" title="${mm.nome}">${icona(ePdf(mm.mime,mm.nome)?'pdf':'immagine','piccola')} ${fPeso(mm.dimensione)}</span> `:''})}`},
  ],vuoto:vuoto({icona:'documenti',titolo:'Nessun documento',testo:'Trascina qui le scansioni o aggiungi il primo documento.',azione:{testo:'Aggiungi documento',azione:'documento-nuovo',dati:{'soggetto-tipo':'mezzo','soggetto-id':m.id}}})})}`;
}
function schedaDatiMezzo(m){
  const campo=(et,v,fmt)=>html`<div class="campo"><span class="etichetta-campo">${et}</span><div>${valoreODaCompilare(v,fmt)}</div></div>`;
  return html`<div class="scheda"><h3>${icona('mezzo')}Dati del mezzo</h3><div class="campi">
    ${campo('Targa',m.targa)}${campo('Tipo',m.tipo)}${campo('Marca',m.marca)}${campo('Modello',m.modello)}${campo('Anno',m.anno)}
    <div class="campo"><span class="etichetta-campo">Assegnato a</span><div>${m.assegnatoA?nomePersona(persona(m.assegnatoA)):daCompilare('nessuno')}</div></div>
  </div></div>
  ${m.note?html`<div class="scheda mt"><h3>${icona('info')}Note</h3><p>${m.note}</p></div>`:''}`;
}
function dialogoMezzo(m){
  const nuovo=!m; m=m||{tipo:'Furgone'};
  const campi=[{nome:'targa',etichetta:'Targa',obbligatorio:true,maiuscolo:true},{nome:'tipo',etichetta:'Tipo',tipo:'select',vuoto:false,opzioni:TIPI_MEZZO.map(t=>({v:t,t}))},{nome:'marca',etichetta:'Marca'},{nome:'modello',etichetta:'Modello'},{nome:'anno',etichetta:'Anno immatricolazione',tipo:'numero'},{nome:'assegnatoA',etichetta:'Assegnato a',tipo:'select',opzioni:personeAttive().map(p=>({v:p.id,t:nomePersona(p)}))},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}];
  return dialogoModulo(nuovo?'Nuovo mezzo':'Modifica '+nomeMezzo(m),campi,m,{pulsantiExtra:nuovo?[]:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare il mezzo '+nomeMezzo(m)+'? I documenti collegati restano nell\'archivio, ma senza mezzo.',{pericolo:true})){esegui('Eliminato mezzo '+nomeMezzo(m),s=>{s.mezzi=s.mezzi.filter(x=>x.id!==m.id)});vai('mezzi');return null}return false}}]}).then(v=>{
    if(!v)return;if(v.anno)v.anno=+v.anno;
    if(nuovo){const id=nuovoId('mz');esegui('Nuovo mezzo '+v.targa,s=>{s.mezzi.push(Object.assign({id},v))});vai('mezzi/'+id)}
    else esegui('Modificato mezzo '+v.targa,s=>{Object.assign(s.mezzi.find(x=>x.id===m.id),v)});
  });
}
