// ---------------------------------------------------------------------
// POS: procedura guidata (PSC → dati → operai → preposto → lavorazioni → figure → anteprima)
// e composizione del documento dal testo standard (POS_TESTO) con le regole dell'azienda:
// solo le lavorazioni selezionate, figure una riga per dato, revisioni a tre colonne, copertina,
// indice generato, data di emissione uguale ovunque.
// ---------------------------------------------------------------------
const ELENCO_MACCHINE_POS=[['Aspirapolvere',[1,2,3,4,5,6,7]],['Betoniera',[1,2,5]],['Piastra vibrante',[1]],['Sega circolare',[3,4,6]],['Monospazzole',[2,5]],['Motosega',[3,4]],['Pompa per massetti',[1]],['Pompa per massetti in cls cellulare',[1]],['Martello elettrico',[1,2,5]],['Flessibili',[1,2,3,4,5,6,7]],['Pistola sparachiodi',[3,4,6]],['Livella laser',[1,2,3,4,5,6,7]],['Autocarro con gru',[1,2,3,4,5,6,7]],['Attrezzatura minuta',[1,2,3,4,5,6,7]],['Spianatrice massetti',[1]],['Taglia Piastrelle',[2,5,6]]];
const DPI_DOTAZIONE_POS=[['Tuta lavoro',null],['Scarpe antinfortunistiche',null],['Guanti',null],['Occhiali di protezione',null],['Mascherine antipolvere',null],['Otoprotettori',null],['Casco',null],['Cinture di sicurezza',[4,7]],['Ginocchiere',null]];

function vistaPosWizard(c,r){
  if(!c) return html`<div class="vuoto">${icona('attenzione')}<h3>Cantiere non trovato</h3></div>`;
  let w=ui.posWizard;
  if(!w||w.cantiereId!==c.id){
    const ultimo=stato.pos.filter(p=>p.cantiereId===c.id).sort((a,b)=>b.revisione-a.revisione)[0];
    w=ui.posWizard={cantiereId:c.id,passo:1,dati:{operai:ultimo?ultimo.operai.slice():(c.operai||[]).slice(),prepostoId:ultimo?ultimo.prepostoId:c.prepostoId,lavorazioni:[],tipi:ultimo&&ultimo.tipi?ultimo.tipi.slice():(c.tipi||(ultimo?TIPI_LAVORAZIONE.filter(t=>ultimo.lavorazioni.includes(t.cat)).map(t=>t.id):tipiCantiere(c).map(t=>t.id))).slice(),uominiGiorno:c.uominiGiorno,dataInizio:c.dataInizio,dataFine:c.dataFine,orari:c.orari,importo:c.importoContratto,tipoAppalto:ultimo?ultimo.tipoAppalto:'esecutrice',organizzazione:ultimo?ultimo.organizzazione:'nonRealizzata',revisione:ultimo?ultimo.revisione+1:0,dataEmissione:ultimo?ultimo.dataEmissione:oggi(),dataRevisione:oggi(),descrizioneRevisione:ultimo?'':'Emissione iniziale',revisioniPrecedenti:ultimo?[...(ultimo.revisioni||[])]:[],psc:{}}};
    if(r.query.da){const p=perId('pos',r.query.da);if(p){w.dati.revisione=p.revisione+1;w.dati.revisioniPrecedenti=[...(p.revisioni||[]),{n:p.revisione,data:p.dataRevisione||p.dataEmissione,descrizione:p.descrizioneRevisione}];w.dati.dataEmissione=p.dataEmissione}}
  }
  const passi=['PSC','Dati del cantiere','Operai','Preposto','Lavorazioni','Figure','Anteprima'];
  dopoRender(montaWizard);
  return html`<div class="briciole"><a href="#/cantieri">Cantieri</a> › <a href="#/cantieri/${c.id}">${c.nome}</a> › POS</div>
  <div class="testata"><div><h1>Piano Operativo di Sicurezza</h1><div class="sotto">${c.nome} · revisione ${w.dati.revisione} · ${w.dati.revisione?'data di revisione':'data di emissione'} ${fData(w.dati.revisione?w.dati.dataRevisione:w.dati.dataEmissione)}</div></div><div class="azioni"><button class="pulsante" data-azione="pos-annulla">Esci</button></div></div>
  <div class="passi">${passi.map((p,i)=>html`<span class="passo ${w.passo===i+1?'attivo':w.passo>i+1?'fatto':''}" data-azione="pos-vai-passo" data-passo="${i+1}" style="cursor:pointer"><span class="n">${i+1}</span>${p}</span>`)}</div>
  <div class="scheda" id="pos-passo">${[posPasso1,posPasso2,posPasso3,posPasso4,posPasso5,posPasso6,posPasso7][w.passo-1](c,w)}</div>
  <div class="riga mt"><button class="pulsante" data-azione="pos-passo-indietro" ${w.passo===1?'disabled':''}>${icona('sinistra')}Indietro</button><span class="spazio"></span>${w.passo<7?html`<button class="pulsante primario" data-azione="pos-passo-avanti">Avanti ${icona('destra')}</button>`:html`<button class="pulsante primario" data-azione="pos-genera">${icona('stampa')}Genera e stampa il POS</button>`}</div>`;
}
function montaWizard(){const w=ui.posWizard;if(!w)return;const box=el('#pos-passo');if(!box)return;attivaChip(box);}
function leggiPassoCorrente(){
  const w=ui.posWizard;const box=el('#pos-passo');if(!box||!w)return;
  const d=w.dati;
  const val=n=>{const e=box.querySelector(`[name="${n}"]`);return e?e.value.trim():undefined};
  if(w.passo===1){for(const k of ['committente','affidataria','indirizzo','comune','provincia','cap','progettista','direttoreLavori','cse','csp','dataPsc','redattore','prescrizioni']){const v=val('psc_'+k);if(v!==undefined)d.psc[k]=v}}
  if(w.passo===2){d.dataInizio=val('dataInizio')||null;d.dataFine=val('dataFine')||null;d.orari=val('orari');d.importo=leggiNumero(val('importo'));d.uominiGiorno=leggiNumero(val('uominiGiorno'));d.tipoAppalto=val('tipoAppalto');d.organizzazione=val('organizzazione');d.revisione=+val('revisione')||0;d.dataEmissione=val('dataEmissione')||oggi();d.dataRevisione=val('dataRevisione')||oggi();d.descrizioneRevisione=val('descrizioneRevisione')}
  if(w.passo===3){d.operai=tutti('[name=operai]:checked',box).map(x=>x.value)}
  if(w.passo===4){const p=box.querySelector('[name=prepostoId]:checked');d.prepostoId=p?p.value:null}
  if(w.passo===5){d.tipi=tutti('[name=tipi]:checked',box).map(x=>x.value)}
}
AZIONI['pos-annulla']=()=>{const w=ui.posWizard;ui.posWizard=null;vai('cantieri/'+(w?w.cantiereId:''))};
AZIONI['pos-vai-passo']=d=>{leggiPassoCorrente();const w=ui.posWizard;const n=+d.passo;if(n>w.passo){const err=validaPasso(w);if(err)return avviso(err,{tipo:'errore'})}w.passo=n;render()};
AZIONI['pos-passo-indietro']=()=>{leggiPassoCorrente();ui.posWizard.passo=Math.max(1,ui.posWizard.passo-1);render()};
AZIONI['pos-passo-avanti']=()=>{leggiPassoCorrente();const w=ui.posWizard;const err=validaPasso(w);if(err)return avviso(err,{tipo:'errore',durata:6000});salvaPassoNelCantiere(w);w.passo=Math.min(7,w.passo+1);render()};
function validaPasso(w){
  const d=w.dati;
  if(w.passo===2){if(!d.uominiGiorno)return 'Serve l\'entità presunta uomini/giorno: è il numero di operai dell’impresa in cantiere, non si prende dal PSC';if(d.dataInizio&&d.dataFine&&d.dataFine<d.dataInizio)return 'La fine lavori precede l\'inizio'}
  if(w.passo===3&&!d.operai.length)return 'Seleziona almeno un operaio';
  if(w.passo===4){if(!d.prepostoId)return 'Serve un preposto con il corso in corso di validità: la procedura non può continuare senza'}
  if(w.passo===5&&!d.tipi.length)return 'Seleziona le lavorazioni che si eseguono davvero in questo cantiere';
  return null;
}
// I dati confermati nella procedura si salvano subito nella scheda del cantiere
function salvaPassoNelCantiere(w){
  const d=w.dati;const c=cantiere(w.cantiereId);
  esegui('POS: passo '+w.passo+' di '+c.nome,s=>{const x=s.cantieri.find(y=>y.id===w.cantiereId);
    if(w.passo===1){const p=d.psc;if(p.indirizzo)x.indirizzo.via=p.indirizzo;if(p.comune)x.indirizzo.comune=p.comune;if(p.provincia)x.indirizzo.provincia=p.provincia;if(p.cap)x.indirizzo.cap=p.cap;if(p.dataPsc)x.psc.data=p.dataPsc;if(p.redattore)x.psc.redattore=p.redattore;if(p.prescrizioni)x.psc.prescrizioni=p.prescrizioni;
      for(const [k,ch] of [['committente','committenteId'],['affidataria','affidatariaId']]){if(p[k]&&!x[ch])x[ch]=clienteDaNome(s,{nuovo:p[k]},k)}
      for(const [k,ch,ruolo] of [['progettista','progettistaId','progettista'],['direttoreLavori','direttoreLavoriId','direttoreLavori'],['cse','cseId','cse'],['csp','cspId','csp']]){if(p[k]&&!x[ch])x[ch]=professionistaDaNome(s,{nuovo:p[k]},ruolo)}}
    if(w.passo===2){x.dataInizio=d.dataInizio;x.dataFine=d.dataFine;x.orari=d.orari;x.importoContratto=d.importo;x.uominiGiorno=d.uominiGiorno}
    if(w.passo===3){x.operai=d.operai.filter(id=>id!==s.azienda.legaleRappresentanteId||x.operai.includes(id))}
    if(w.passo===4){x.prepostoId=d.prepostoId}
    if(w.passo===5){x.tipi=d.tipi.slice();x.lavorazioni=unici(TIPI_LAVORAZIONE.filter(t=>d.tipi.includes(t.id)).map(t=>t.cat))}

  },{senzaRender:true,silenzioso:true});
}
function posPasso1(c,w){
  const p=w.dati.psc;
  const inp=(k,et,v,prop)=>html`<div class="campo"><label>${et}${prop?html` <span class="pillola valido" title="Letto dal PSC: è una proposta, correggila se serve">${icona('magia','piccola')}dal PSC</span>`:''}</label><input type="text" name="psc_${k}" value="${p[k]!==undefined?p[k]:(v||'')}"></div>`;
  return html`<h3>1. PSC del cantiere</h3><p class="secondario">Carica il PSC: viene archiviato nel cantiere. Se il PDF ha un livello di testo, ne estraggo committente, indirizzo, comune, CAP, figure e date e te li <b>propongo</b>: ogni campo resta correggibile. Se è una scansione senza testo, compila i dati a mano.</p>
  <div class="riga mb">${c.psc.fileId?html`<span class="pillola valido">${icona('ok')}PSC archiviato: ${(fileMeta(c.psc.fileId)||{}).nome||''}</span><button class="pulsante piccolo" data-azione="pos-psc-estrai" data-id="${c.id}">${icona('magia','piccola')}Estrai i dati dal PSC</button><button class="pulsante piccolo" data-azione="pos-psc-carica" data-id="${c.id}">Sostituisci</button>`:html`<button class="pulsante primario" data-azione="pos-psc-carica" data-id="${c.id}">${icona('carica')}Carica il PSC (PDF)</button><span class="secondario piccolo">oppure salta e compila a mano</span>`}</div>
  ${w.pscEsito?html`<div class="avviso-inline ${w.pscEsito.tipo}">${icona('info')}<div class="corpo">${w.pscEsito.testo}</div></div>`:''}
  <div class="campi">${inp('committente','Committente',nomeCliente(c.committenteId),p._prop&&p._prop.committente)}${inp('affidataria','Impresa affidataria',nomeCliente(c.affidatariaId),p._prop&&p._prop.affidataria)}${inp('indirizzo','Indirizzo del cantiere',c.indirizzo.via,p._prop&&p._prop.indirizzo)}${inp('comune','Comune',c.indirizzo.comune,p._prop&&p._prop.comune)}${inp('provincia','Provincia',c.indirizzo.provincia,p._prop&&p._prop.provincia)}${inp('cap','CAP',c.indirizzo.cap,p._prop&&p._prop.cap)}${inp('progettista','Progettista',nomeProfessionista(c.progettistaId),p._prop&&p._prop.progettista)}${inp('direttoreLavori','Direttore dei lavori',nomeProfessionista(c.direttoreLavoriId),p._prop&&p._prop.direttoreLavori)}${inp('cse','Coordinatore in esecuzione',nomeProfessionista(c.cseId),p._prop&&p._prop.cse)}${inp('csp','Coordinatore in progettazione',nomeProfessionista(c.cspId),p._prop&&p._prop.csp)}<div class="campo"><label>Data del PSC${p._prop&&p._prop.dataPsc?html` <span class="pillola valido">${icona('magia','piccola')}dal PSC</span>`:''}</label><input type="date" name="psc_dataPsc" value="${p.dataPsc!==undefined?p.dataPsc:(c.psc.data||'')}"></div>${inp('redattore','Redattore del PSC',c.psc.redattore,p._prop&&p._prop.redattore)}<div class="campo largo"><label>Prescrizioni particolari del PSC</label><textarea name="psc_prescrizioni" rows="3">${p.prescrizioni!==undefined?p.prescrizioni:(c.psc.prescrizioni||'')}</textarea></div></div>`;
}
AZIONI['pos-psc-carica']=async d=>{const fs=await scegliFile({multipli:false,accetta:'.pdf'});if(!fs.length)return;const es=await acquisisciFile(fs[0],{});esegui('Caricato PSC',s=>{s.cantieri.find(x=>x.id===d.id).psc.fileId=es.rec.id},{senzaRender:true});await AZIONI['pos-psc-estrai']({id:d.id})};
AZIONI['pos-psc-estrai']=async d=>{
  const c=cantiere(d.id);const w=ui.posWizard;leggiPassoCorrente();
  const b=await leggiFile((fileMeta(c.psc.fileId)||{}).hash);if(!b)return avviso('PSC non trovato nell\'archivio',{tipo:'errore'});
  const prog=dialogoAvanzamento('Lettura del PSC',{testo:'Estraggo il testo dal PDF…'});
  let testo='';try{testo=(await estraiTestoPdf(b,(i,n)=>prog.aggiorna(i,n,'pagina '+i+' di '+n))).testo}catch(e){prog.chiudi();w.pscEsito={tipo:'attenzione',testo:'Non sono riuscito a leggere il PDF ('+(e.message||e)+'): compila i dati a mano.'};render();return}
  prog.chiudi();
  if(!testo||testo.replace(/\s/g,'').length<200){w.pscEsito={tipo:'attenzione',testo:'Il PDF non ha un livello di testo leggibile (probabilmente è una scansione): compila i dati a mano.'};render();return}
  const prop=proponiDatiDaPsc(testo);
  const trovati=Object.keys(prop).filter(k=>prop[k]);
  w.dati.psc._prop={};for(const k of trovati){w.dati.psc[k]=prop[k];w.dati.psc._prop[k]=true}
  w.pscEsito={tipo:trovati.length?'info':'attenzione',testo:trovati.length?`Dal PSC ho proposto: ${trovati.join(', ')}. Sono proposte: controlla e correggi prima di andare avanti.`:'Ho letto il testo del PSC ma non ho riconosciuto i campi: compila a mano. Puoi cercare nel testo estratto.'};
  w.testoPsc=testo;
  render();
};
function posPasso2(c,w){
  const d=w.dati;
  return html`<h3>2. Dati non ricavabili dal PSC</h3><p class="secondario">Date e orari dei lavori dell’impresa, importo, e l'<b>entità presunta uomini/giorno</b>: è il numero di operai dell’impresa in cantiere e non si prende mai dal PSC.</p>
  <div class="campi"><div class="campo"><label>Inizio lavori dell’impresa</label><input type="date" name="dataInizio" value="${d.dataInizio||''}"></div><div class="campo"><label>Fine lavori dell’impresa</label><input type="date" name="dataFine" value="${d.dataFine||''}"></div><div class="campo"><label>Orari di lavoro</label><input type="text" name="orari" value="${d.orari||''}" placeholder="lun-ven 08:00–12:00 / 13:00–17:00"></div><div class="campo"><label>Importo lavori dell’impresa</label><input type="text" inputmode="decimal" name="importo" value="${d.importo!=null?fNum(d.importo,2):''}"></div><div class="campo"><label>Entità presunta uomini/giorno <span class="obbl">*</span></label><input type="text" inputmode="numeric" name="uominiGiorno" value="${d.uominiGiorno||''}"></div>
  <div class="campo"><label>I lavori sono</label><select name="tipoAppalto"><option value="diretto" ${d.tipoAppalto==='diretto'?'selected':''}>appalto diretto dal committente o responsabile dei lavori</option><option value="affidataria" ${d.tipoAppalto==='affidataria'?'selected':''}>subappalto da impresa affidataria</option><option value="esecutrice" ${d.tipoAppalto==='esecutrice'?'selected':''}>subappalto da impresa esecutrice</option></select></div>
  <div class="campo"><label>Organizzazione generale del cantiere (PSC)</label><select name="organizzazione"><option value="nonRealizzata" ${d.organizzazione==='nonRealizzata'?'selected':''}>non è realizzata dalla presente impresa</option><option value="realizzata" ${d.organizzazione==='realizzata'?'selected':''}>è realizzata completamente dalla presente impresa</option></select></div>
  <div class="campo"><label>Numero di revisione</label><input type="text" inputmode="numeric" name="revisione" value="${d.revisione}"></div><div class="campo"><label>Data di emissione</label><input type="date" name="dataEmissione" value="${d.dataEmissione||''}"><div class="aiuto">Compare in copertina, nella riga 00 delle revisioni, nella testata e in fondo: sempre la stessa</div></div>${d.revisione>0?html`<div class="campo"><label>Data di questa revisione</label><input type="date" name="dataRevisione" value="${d.dataRevisione||''}"></div><div class="campo largo"><label>Descrizione della revisione</label><input type="text" name="descrizioneRevisione" value="${d.descrizioneRevisione||''}" placeholder="es. aggiunti orari di lavoro"></div>`:html`<input type="hidden" name="dataRevisione" value="${d.dataEmissione||''}"><input type="hidden" name="descrizioneRevisione" value="Emissione iniziale">`}</div>`;
}
function posPasso3(c,w){
  const d=w.dati;const leg=(legaleRappresentante()||{}).id;
  const persone=stato.persone.filter(p=>(p.attivo&&p.inCantiere!==false)||p.id===leg);
  return html`<h3>3. Operai in cantiere</h3><p class="secondario">Seleziona dall'elenco: mai nomi scritti a mano. Accanto a ciascuno lo stato dei documenti, così chi ha qualcosa di scaduto emerge prima di procedere.</p><div class="scelta-lista">${persone.map(p=>{const i=idoneita(p);const on=d.operai.includes(p.id);return html`<label class="${on?'attiva':''}"><input type="checkbox" name="operai" value="${p.id}" ${on?'checked':''}><span><b>${nomePersona(p)}</b> <span class="secondario">${p.id===leg?'Legale Rappresentante':p.mansione||''}${(p.qualifiche||[]).length?' · '+p.qualifiche.map(q=>QUALIFICHE[q]||q).join(', '):''}</span><div class="desc">${i.idonea?html`<span class="pillola valido">${icona('ok','piccola')}documenti in regola</span>`:html`<span class="pillola scaduto">${icona('blocco','piccola')}${i.motivi.join('; ')}</span>`}${i.avvisi.length?html` <span class="pillola pianificare">${icona('info','piccola')}manca: ${i.avvisi.map(x=>x.split(':')[0]).join(', ')}</span>`:''}</div></span></label>`})}</div>`;
}
function posPasso4(c,w){
  const d=w.dati;const q=personeQualificatePreposto(d.operai);
  return html`<h3>4. Preposto</h3><p class="secondario">Solo fra gli operai selezionati che hanno il corso preposto in corso di validità.</p>${q.length?html`<div class="scelta-lista">${q.map(p=>{const doc=migliorDocumento(documentiPersona(p.id).filter(x=>x.tipoId==='corso_preposto'),tipoDoc('corso_preposto'),oggi(),soglie());return html`<label class="${d.prepostoId===p.id?'attiva':''}"><input type="radio" name="prepostoId" value="${p.id}" ${d.prepostoId===p.id?'checked':''}><span><b>${nomePersona(p)}</b><div class="desc">Corso preposto del ${fData(doc.doc.dataEmissione)}, valido fino al ${fData(doc.info.data)}${doc.info.stimata?' (stimato)':''}</div></span></label>`})}</div>`:html`<div class="avviso-inline critico">${icona('blocco')}<div class="corpo"><b>Nessuno degli operai selezionati ha il corso preposto in corso di validità.</b> La procedura si ferma qui: torna indietro e aggiungi una persona qualificata, oppure registra l'attestato del corso preposto.</div></div>`}`;
}
function posPasso5(c,w){
  const d=w.dati;
  return html`<h3>5. Lavorazioni</h3><p class="secondario">Scegli solo i tipi che fai davvero in questo cantiere (per esempio solo livellina, solo gres). Il POS conterrà solo le schede, le attrezzature e i DPI di questi tipi.</p>${stato.lavorazioni.filter(l=>TIPI_LAVORAZIONE.some(t=>t.cat===l.id)).map(l=>html`<div class="sezione-titolo">${l.breve}</div><div class="chip-lista">${TIPI_LAVORAZIONE.filter(t=>t.cat===l.id).map(t=>{const on=d.tipi.includes(t.id);return html`<label class="chip ${on?'attiva':''}"><input type="checkbox" name="tipi" value="${t.id}" ${on?'checked':''}>${t.breve}${SCHEDE_TIPO[t.id]?'':html` <span class="silenzioso">·</span>`}</label>`})}</div>`)}`;
}
function posPasso6(c,w){
  const cc=cantiere(c.id);
  return html`<h3>6. Figure del cantiere</h3><p class="secondario">Sono quelle della scheda del cantiere: per aggiungerle o correggerle (anche codice fiscale, telefono, email) usa «Modifica il cantiere». Quelle che non hai restano vuote nel POS, senza segnalazioni.</p>
  <div class="figure">${FIGURE_CANTIERE.map(f=>{const t=testoFigura(cc,f);return html`<div class="figura"><small>${f.ruolo}</small><b>${t?t.nome:'—'}</b>${t?t.righe.map(x=>html`<span>${x}</span>`):''}</div>`})}</div>
  <button class="pulsante mt" data-azione="cantiere-modifica" data-id="${c.id}">${icona('modifica','piccola')}Modifica il cantiere</button>`;
}
function posPasso7(c,w){
  const d=w.dati;const cc=cantiere(c.id);
  const figure=FIGURE_CANTIERE.map(f=>({f,t:testoFigura(Object.assign({},cc,d),f)}));
  return html`<h3>7. Riepilogo e stampa</h3><div class="griglia due"><div><div class="sezione-titolo">Cantiere</div><p><b>${cc.nome}</b><br>${indirizzoTesto(cc.indirizzo)||daCompilare()}<br>Lavori dal ${d.dataInizio?fData(d.dataInizio):daCompilare()} al ${d.dataFine?fData(d.dataFine):daCompilare()} · ${d.uominiGiorno||'?'} uomini/giorno · ${d.orari||daCompilare('orari')}</p>
    <div class="sezione-titolo">Lavorazioni (${d.tipi.length})</div><ol>${TIPI_LAVORAZIONE.filter(t=>d.tipi.includes(t.id)).map(t=>html`<li>${t.nome}</li>`)}</ol>
    <div class="sezione-titolo">Operai (${d.operai.length})</div><p>${d.operai.map(id=>nomePersona(persona(id))).join(', ')} · preposto <b>${nomePersona(persona(d.prepostoId))}</b></p></div>
    <div><div class="sezione-titolo">Figure</div>${figure.map(x=>html`<div class="figura-riga"><span class="ruolo">${x.f.ruolo}</span><span>${x.t?x.t.nome:'—'}</span><span></span></div>`)}
    <div class="sezione-titolo">Revisione</div><p>Rev. ${d.revisione} · emissione ${fData(d.dataEmissione)}${d.revisione?' · revisione '+fData(d.dataRevisione)+' — '+(d.descrizioneRevisione||daCompilare('descrizione')):''}</p></div></div>
  <div class="avviso-inline info mt">${icona('info')}<div class="corpo">Alla generazione il POS resta nel cantiere con la sua revisione e la sua data, ristampabile identico. Prima di consegnare, l'anteprima elenca ogni segnaposto rimasto con la frase che lo contiene.</div></div>`;
}
AZIONI['pos-genera']=async()=>{
  leggiPassoCorrente();const w=ui.posWizard;const err=validaPasso(w);if(err)return avviso(err,{tipo:'errore'});
  salvaPassoNelCantiere(w);
  const c=cantiere(w.cantiereId);const d=w.dati;
  const pos={id:nuovoId('pos'),cantiereId:c.id,revisione:d.revisione,dataEmissione:d.dataEmissione,dataRevisione:d.revisione?d.dataRevisione:d.dataEmissione,descrizioneRevisione:d.revisione?d.descrizioneRevisione:'Emissione iniziale',revisioni:d.revisioniPrecedenti||[],lavorazioni:unici(TIPI_LAVORAZIONE.filter(t=>d.tipi.includes(t.id)).map(t=>t.cat)),tipi:d.tipi.slice(),operai:d.operai.slice(),prepostoId:d.prepostoId,uominiGiorno:d.uominiGiorno,tipoAppalto:d.tipoAppalto,organizzazione:d.organizzazione,generato:new Date().toISOString(),generatoId:null};
  // le nomine si impaginano prima di aprire l'anteprima del POS (usano lo stesso spazio di stampa)
  const nomine=generaNomineCantiere(c.id,pos.revisione?pos.dataRevisione:pos.dataEmissione);
  const doc=docPos(pos,c);
  const ris=anteprimaStampa({titolo:'POS '+c.nome+' rev '+pos.revisione,doc,riferimento:c.nome,dopoRegistrazione:(s,g)=>{pos.generatoId=g.id;s.pos.push(pos)}});
  ui.posWizard=null;
  setTimeout(()=>{if(leggiRotta().sotto==='pos')vai('cantieri/'+c.id)},100);
  avvisoNomine(nomine);
};
AZIONI['pos-ristampa']=d=>{const p=perId('pos',d.id);const g=p&&perId('generati',p.generatoId);if(g)anteprimaStampa({titolo:g.titolo,pagineHtml:g.pagine,giaRegistrato:true});else if(p){anteprimaStampa({titolo:'POS '+nomeCantiere(p.cantiereId)+' rev '+p.revisione,doc:docPos(p,cantiere(p.cantiereId)),giaRegistrato:true})}};
AZIONI['pos-nuova-revisione']=d=>{const p=perId('pos',d.id);ui.posWizard=null;vai('cantieri/'+p.cantiereId+'/pos?da='+p.id)};

// ---------------------------------------------------------------------
// Composizione del documento
// ---------------------------------------------------------------------
function docPos(pos,c){
  const T=posTestoCorrente();const a=stato.azienda;
  const leg=legaleRappresentante();const nomeLeg=leg?nomeNomeCognome(leg):'[DA COMPILARE: legale rappresentante]';
  const lav=pos.lavorazioni.map(id=>stato.lavorazioni.find(l=>l.id===id)).filter(Boolean);
  const operai=pos.operai.map(id=>persona(id)).filter(Boolean);
  const prep=persona(pos.prepostoId);const rls=persona(a.rlsId);const rspp=persona(a.rsppId);
  const dataE=fData(pos.dataEmissione);const dataR=fData(pos.dataRevisione||pos.dataEmissione);
  const DC=k=>`<span class="da-compilare">[DA COMPILARE${k?': '+h(k):''}]</span>`;
  const v=(x,k)=>(x===null||x===undefined||x==='')?DC(k):h(x);
  const comm=cliente(c.committenteId),aff=cliente(c.affidatariaId);
  // tipi scelti: le schede nuove dove ci sono, il testo standard della categoria per gli altri
  const tipi=pos.tipi?TIPI_LAVORAZIONE.filter(t=>pos.tipi.includes(t.id)):TIPI_LAVORAZIONE.filter(t=>pos.lavorazioni.includes(t.cat));
  const conScheda=tipi.filter(t=>SCHEDE_TIPO[t.id]);const catSenza=unici(tipi.filter(t=>!SCHEDE_TIPO[t.id]).map(t=>t.cat));
  const attrezzature=unici(conScheda.flatMap(t=>SCHEDE_TIPO[t.id].attrezzature)).map(id=>Object.assign({id},ATTREZZATURE_POS[id]));
  const dpiUsati=unici(['scarpe','tuta',...conScheda.flatMap(t=>SCHEDE_TIPO[t.id].dpi),...attrezzature.flatMap(x=>x.dpi),...(catSenza.length?Object.keys(DPI_POS).filter(k=>k!=='anticaduta'||catSenza.some(id=>[4,7].includes(id))):[])]);
  const tags=new Set(conScheda.flatMap(t=>SCHEDE_TIPO[t.id].tag));
  const tuttiTag=catSenza.length>0;// per le categorie senza scheda nuova si tengono tutte le misure generali
  const sezioni=T.sezioni;
  const schedeLav=(sezioni.find(s=>s.id==='analisi_lavorazioni')||{schede:[]}).schede.filter(sc=>sc.lavorazioni.some(id=>catSenza.includes(id)));
  const macch=posMacchineCorrenti().filter(m=>m.lavorazioni.some(id=>catSenza.includes(id)));
  const usatoDa=id=>conScheda.filter(t=>SCHEDE_TIPO[t.id].attrezzature.includes(id)).map(t=>t.breve);
  const testataPos=`<div class="testata-pos"><img src="{{IMG:logo}}" alt=""><div class="tp-dx"><span>Piano operativo di sicurezza</span><b>${h(c.nome)}</b></div></div>`;
  const pie=`<span>POS · ${h(nomeImpresa())} · Rev. ${pad2(pos.revisione)} del ${dataR}</span><span>Pagina <span data-n></span> di <span data-m></span></span>`;
  const blocchi=[];
  // ---- copertina
  const periodo=c.dataInizio?'dal '+fData(c.dataInizio)+(c.dataFine?' al '+fData(c.dataFine):''):(c.periodoTesto||DC('date dei lavori'));
  const cartaFirma=(t,nome,img)=>`<div class="carta-firma"><div class="et">${t}</div><b>${nome}</b><div class="et mt-firma">Firma</div><div class="spazio-firma">${img||''}</div></div>`;
  const chipLav=tipi.length>6?unici(tipi.map(t=>t.cat)).map(id=>`<span>${h((stato.lavorazioni.find(l=>l.id===id)||{}).breve||'')}</span>`).join(''):tipi.length?tipi.map(t=>`<span>${h(t.nome)}</span>`).join(''):DC('lavorazioni');
  blocchi.push({intera:true,senzaIntestazione:true,html:`<div class="cop">
    <div class="cop-alto"><img class="cop-logo" src="{{IMG:logo}}" alt=""><div class="cop-rev"><span>Revisione</span><b>${pad2(pos.revisione)}</b><span>${dataR}</span></div></div>
    <div class="cop-titolo"><div class="cop-sigla">POS</div><div class="cop-nome">Piano operativo di sicurezza</div><div class="cop-norma">Redatto ai sensi del D.Lgs. 81/2008 e s.m.i., art. 89 comma 1 lettera h), art. 96 comma 1 lettera g) e Allegato XV</div></div>
    <div class="cop-cantiere"><div class="et">Cantiere</div><div class="nome">${h(c.nome)}</div><div class="ind">${v(indirizzoTesto(c.indirizzo),'indirizzo del cantiere')}</div><div class="cop-chip">${chipLav}</div></div>
    <div class="cop-griglia"><div><div class="et">Impresa esecutrice</div><b>${h(nomeImpresa())}</b></div><div><div class="et">Committente</div><b>${comm?h(comm.ragioneSociale):DC('committente')}</b></div><div><div class="et">Impresa affidataria</div><b>${aff?h(aff.ragioneSociale):'—'}</b></div><div><div class="et">Periodo dei lavori</div><b>${periodo}</b></div></div>
    <div class="cop-firma"><div class="et">Data di emissione: <b>${dataE}</b></div>${`<div class="firme-pos">${cartaFirma('Datore di lavoro',h(nomeLeg),'<img src="{{IMG:firmaTimbro}}" alt="">')}${cartaFirma('Rappresentante dei lavoratori (RLS)',rls?h(nomePersona(rls)):DC('RLS'),rls&&(rls.firmaIncorporata||rls.firmaId)?'<img src="{{IMG:firmaRls}}" alt="">':'')}</div>`}</div></div>`});
  // ---- firme, revisioni, indice
  const numeri={};let n1=0,n2=0;const corpo=[];for(const s of sezioni){if(s.id==='revisioni'||s.id==='indice')continue;corpo.push(s);
    // sezioni richieste dall'Allegato XV che il testo standard non aveva
    if(s.id==='metodologia'&&conScheda.length)corpo.push({id:'rumore',livello:2,titolo:'Rumore e vibrazioni',blocchi:[]});
    if(s.id==='macchine'&&conScheda.length)corpo.push({id:'sostanze',livello:1,titolo:'Sostanze e preparati pericolosi',blocchi:[]})}
  for(const s of corpo){if(s.livello===1){n1++;n2=0;numeri[s.id]=String(n1)}else{n2++;numeri[s.id]=n1+'.'+n2}}
  const TITOLI={premessa:'Premessa',premessa_uso:'Utilizzo e consultazione',premessa_revisione:'Revisione del piano',descrizione_opera:'Descrizione dell’opera e lavorazioni',anagrafica:'Anagrafica del cantiere',figure:'Figure del cantiere e della sicurezza',dati_impresa:'Dati dell’impresa',dati_impresa_esecutrice:'Impresa esecutrice',mansioni:'Compiti per la sicurezza delle figure nominate',organizzazione:'Organizzazione del cantiere',misure_prevenzione:'Principali misure di prevenzione',formazione:'Formazione',sorveglianza:'Sorveglianza sanitaria',dpi:'Dispositivi di protezione individuale',segnaletica:'Segnaletica di sicurezza',pronto_soccorso:'Pronto soccorso',numeri_utili:'Indirizzi e numeri utili',presidi:'Presidi sanitari',valutazione_rischi:'Valutazione dei rischi',metodologia:'Metodologia adottata',analisi_lavorazioni:'Analisi delle lavorazioni',rumore:'Esito della valutazione di rumore e vibrazioni',sostanze:'Sostanze e preparati pericolosi',macchine:'Macchine e attrezzature',conclusioni:'Conclusioni e firme'};
  const titolo=s=>TITOLI[s.id]||capitalizza(String(s.titolo).toLowerCase());
  const indice=[];let k=0;const segna=()=>'i'+(k++);
  for(const s of corpo){const id=segna();s._ind=id;indice.push({n:numeri[s.id],t:titolo(s),l:s.livello,id});
    if(s.id==='analisi_lavorazioni'){for(const t of conScheda){t._ind=segna();indice.push({n:'',t:t.nome,l:2,id:t._ind})}for(const sc of schedeLav){sc._ind=segna();indice.push({n:'',t:sc.titolo,l:2,id:sc._ind})}}
    if(s.id==='macchine'){for(const x of attrezzature){x._ind=segna();indice.push({n:'',t:x.nome,l:2,id:x._ind})}for(const m of macch){m._ind=segna();indice.push({n:'',t:m.titolo,l:2,id:m._ind})}}}
  blocchi.push({html:`<h2 class="senza-num">Registro delle revisioni</h2>`,tieniConSuccessivo:true});
  const revisioni=[{n:'00',data:dataE,d:'Emissione iniziale'},...(pos.revisioni||[]).filter(r=>r.n>0).map(r=>({n:pad2(r.n),data:fData(r.data),d:r.descrizione})),...(pos.revisione>0?[{n:pad2(pos.revisione),data:dataR,d:pos.descrizioneRevisione||''}]:[])];
  blocchi.push(`<table class="tab-pos"><thead><tr><th style="width:16mm">Rev.</th><th style="width:28mm">Data</th><th>Descrizione delle modifiche</th></tr></thead><tbody>${revisioni.map(r=>`<tr><td>${h(r.n)}</td><td>${h(r.data)}</td><td>${r.d?h(r.d):DC('descrizione revisione')}</td></tr>`).join('')}</tbody></table>`);
  blocchi.push({html:`<h2 class="senza-num">Indice</h2>`,tieniConSuccessivo:true});
  blocchi.push(`<ul class="indice-pos">${indice.map(x=>`<li class="${x.l===2?'l2':''}"><span>${x.n?`<i>${x.n}</i>`:''}${h(x.t)}</span><span class="pun"></span><span data-pag-ind="${x.id}"></span></li>`).join('')}</ul>`);
  // ---- blocchi nuovi
  const badge=r=>`<span class="rischio ${r>=9?'r4':r>=6?'r3':r>=3?'r2':'r1'}">${r}</span>`;
  // immagini nuove (lav_<tipo>, att_<attrezzatura>, dpi_<dpi>) al posto delle vecchie quando ci sono
  const imgDi=(k,vecchia)=>IMMAGINI.pos[k]?k:vecchia;
  const pitto=id=>{const d=Object.assign({},DPI_POS[id],{img:imgDi('dpi_'+id,DPI_POS[id].img)});return `<div class="dpi-pitto">${d.img?`<img src="{{IMG:${d.img}}}" alt="">`:'<span class="dpi-vuoto"></span>'}<span>${h(d.nome)}</span></div>`};
  const tabellaDpi=()=>`<table class="tab-pos dpi-tab"><thead><tr><th style="width:14mm"></th><th>Dispositivo</th><th style="width:34mm">Norma</th><th>Quando si usa</th></tr></thead><tbody>${dpiUsati.map(id=>{const d=Object.assign({},DPI_POS[id],{img:imgDi('dpi_'+id,DPI_POS[id].img)});return `<tr><td>${d.img?`<img src="{{IMG:${d.img}}}" alt="">`:''}</td><td>${h(d.nome)}</td><td>${h(d.norma)}</td><td>${h(d.quando)}</td></tr>`}).join('')}</tbody></table>`;
  const schedaTipo=t=>{const S=Object.assign({},SCHEDE_TIPO[t.id]);S.img=imgDi('lav_'+t.id,S.img);const out=[];
    out.push({html:`<div class="sl-testa"><div><div class="occh">Lavorazione</div><h3 data-ind="${t._ind}">${h(t.nome)}</h3><p>${h(S.descrizione)}</p></div>${S.img?`<img src="{{IMG:${S.img}}}" alt="">`:''}</div>`,tieniConSuccessivo:true});
    out.push({html:'<h4>Fasi di lavoro</h4>',tieniConSuccessivo:true},`<ol class="fasi">${S.fasi.map(f=>`<li>${h(f)}</li>`).join('')}</ol>`);
    out.push({html:'<h4>Attrezzature utilizzate</h4>',tieniConSuccessivo:true},`<div class="chips-pos">${S.attrezzature.map(id=>`<span>${h(ATTREZZATURE_POS[id].nome)}</span>`).join('')}</div>`);
    const rr=S.rischi.map(([r,d,p])=>({r,d,p,v:d*p})).sort((x,y)=>y.v-x.v);
    out.push({html:'<h4>Valutazione dei rischi</h4>',tieniConSuccessivo:true},`<table class="tab-pos rischi"><thead><tr><th>Rischio per il lavoratore</th><th class="c">Danno</th><th class="c">Probabilità</th><th class="c">Rischio</th></tr></thead><tbody>${rr.map(x=>`<tr><td>${h(x.r)}</td><td class="c">D${x.d}</td><td class="c">P${x.p}</td><td class="c">${badge(x.v)}</td></tr>`).join('')}</tbody></table>`);
    out.push({html:'<h4>Misure di prevenzione e protezione</h4>',tieniConSuccessivo:true},`<ul class="spunte">${S.misure.map(m=>`<li>${h(m)}</li>`).join('')}</ul>`);
    out.push({html:'<h4>Dispositivi di protezione individuale</h4>',tieniConSuccessivo:true},`<div class="dpi-griglia">${S.dpi.map(pitto).join('')}</div>`);
    return out};
  const schedaAttr=x=>{x=Object.assign({},x,{img:imgDi('att_'+x.id,x.img)});const out=[];
    out.push({html:`<div class="sa-testa">${x.img?`<img src="{{IMG:${x.img}}}" alt="">`:'<span class="sa-vuoto"></span>'}<div><h3 data-ind="${x._ind}">${h(x.nome)}</h3><p>${h(x.descrizione)}</p><div class="chips-pos rossi">${x.rischi.map(r=>`<span>${h(r)}</span>`).join('')}</div></div></div>`,tieniConSuccessivo:true});
    for(const [et,l] of [['Prima dell’uso',x.prima],['Durante l’uso',x.durante],['Dopo l’uso',x.dopo]])out.push({html:`<h4>${et}</h4>`,tieniConSuccessivo:true},`<ul class="spunte">${l.map(m=>`<li>${h(m)}</li>`).join('')}</ul>`);
    if(x.dpi.length)out.push({html:'<h4>Dispositivi di protezione individuale</h4>',tieniConSuccessivo:true},`<div class="dpi-griglia piccola">${x.dpi.map(pitto).join('')}</div>`);
    return out};
  // paragrafi (titolo h + contenuto fino al prossimo h dello stesso livello) filtrati
  const filtraParagrafi=(bl,tieni)=>{const out=[];let dentro=true;let liv=null;for(const b of bl){if(b.t==='h'&&(liv===null||(b.liv||4)<=liv)){const r=tieni(String(b.testo||(b.r||[]).map(x=>x[0]).join('')).trim());if(r!==null){dentro=r;liv=b.liv||4}}if(dentro)out.push(b)}return out};
  const dinamico=(nome)=>{
    switch(nome){
      case 'tabella_revisioni': { const righe=[{n:'00',data:dataE,d:'Emissione iniziale'},...(pos.revisioni||[]).map(r=>({n:pad2(r.n),data:fData(r.data),d:r.descrizione})),...(pos.revisione>0?[{n:pad2(pos.revisione),data:dataR,d:pos.descrizioneRevisione||''}]:[])]; return `<table><thead><tr><th style="width:14mm">Rev.</th><th style="width:28mm">Data</th><th>Descrizione Modifiche</th></tr></thead><tbody>${righe.map(r=>`<tr><td>${h(r.n)}</td><td>${h(r.data)}</td><td>${r.d?h(r.d):DC('descrizione revisione')}</td></tr>`).join('')}</tbody></table>`; }
      case 'indice': return `<div>${indice.map(x=>`<div class="indice-voce ${x.l===2?'l2':''}"><span>${x.n?x.n+'. ':''}${h(x.t)}</span></div>`).join('')}</div>`;
      case 'tabella_anagrafica': return `<table><tbody><tr><th style="width:45mm">Indirizzo</th><td colspan="3">${v(c.indirizzo.via,'indirizzo')}</td></tr><tr><th>Comune</th><td>${v(c.indirizzo.comune,'comune')}${c.indirizzo.provincia?' ('+h(c.indirizzo.provincia)+')':''}</td><th style="width:20mm">CAP</th><td>${v(c.indirizzo.cap,'CAP')}</td></tr><tr><th>Inizio lavori</th><td colspan="3">${c.dataInizio?h(fData(c.dataInizio)):DC('inizio lavori')}</td></tr><tr><th>Fine lavori</th><td colspan="3">${c.dataFine?h(fData(c.dataFine)):DC('fine lavori')}</td></tr><tr><th>Entità presunta uomini/giorno</th><td colspan="3">${v(pos.uominiGiorno,'uomini/giorno')}</td></tr>${c.orari?`<tr><th>Orari di lavoro</th><td colspan="3">${h(c.orari)}</td></tr>`:''}${c.cig||c.cup?`<tr><th>CIG / CUP</th><td colspan="3">${h([c.cig,c.cup].filter(Boolean).join(' · '))}</td></tr>`:''}</tbody></table>`;
      case 'tabella_figure': { const ord=[FIGURE_CANTIERE[1],FIGURE_CANTIERE[0],FIGURE_CANTIERE[2],FIGURE_CANTIERE[3],FIGURE_CANTIERE[4],FIGURE_CANTIERE[5]]; return `<table><tbody>${ord.map(f=>{const t=testoFigura(c,f);const etic={affidatariaId:'Impresa Affidataria',committenteId:'Committente',progettistaId:'Progettista',direttoreLavoriId:'Direttore dei lavori',cseId:'Resp. Sic. in fase esecuzione',cspId:'Resp. Sic. in fase progettazione'}[f.chiave];return `<tr><th style="width:52mm">${h(etic)}</th><td style="padding:2mm 3mm">${t?'<p class="sx" style="margin:0"><b>'+h(t.nome)+'</b></p>'+t.righe.map(r=>'<p class="sx" style="margin:0">'+h(r)+'</p>').join(''):'<span class="silenzioso">—</span>'}</td></tr>`}).join('')}</tbody></table>`; }
      case 'tabella_affidataria_esecutrice': return `<table style="width:80mm"><tbody><tr><td style="width:8mm;text-align:center">${pos.tipoAppalto==='diretto'?'X':''}</td><td>AFFIDATARIA</td><td style="width:8mm;text-align:center">${pos.tipoAppalto!=='diretto'?'X':''}</td><td>ESECUTRICE</td></tr></tbody></table>`;
      case 'tabella_dati_impresa': return `<table><tbody><tr><th style="width:55mm">RAGIONE SOCIALE</th><td>${h(a.ragioneSociale)}</td></tr><tr><th rowspan="4">SEDE LEGALE</th><td>Indirizzo: ${h(indirizzoTesto(a.indirizzo))}</td></tr><tr><td>Cell. ${h(a.cellulare||'')}</td></tr><tr><td>Tel/Fax: ${h(a.telefono||'')}${a.fax?' / '+h(a.fax):''}</td></tr><tr><td>E-mail: ${h(a.email||'')}${a.pec?' · PEC: '+h(a.pec):''}</td></tr><tr><th rowspan="4">SEDE OPERATIVA</th><td>Indirizzo: ${h(indirizzoTesto(a.indirizzo))}</td></tr><tr><td>Tel. ${h(a.telefono||'')}</td></tr><tr><td>Fax ${h(a.fax||'')}</td></tr><tr><td>E-mail: ${h(a.email||'')}</td></tr><tr><th rowspan="3">POSIZIONI ASSICURATIVE / PREVIDENZIALI</th><td>INAIL: ${v(a.inail,'INAIL')}</td></tr><tr><td>INPS: ${v(a.inps,'INPS')}</td></tr><tr><td>Cassa Edile: ${v(a.cassaEdile,'Cassa Edile')}</td></tr><tr><th>SETTORE PRODUTTIVO</th><td>Edilizia</td></tr><tr><th>CONTRATTO COLLETTIVO NAZIONALE</th><td>Industria</td></tr><tr><th>PARTITA IVA</th><td>${h(a.piva)}</td></tr><tr><th>ANNO INIZIO ATTIVITÀ</th><td>${a.dataCostituzione?h(a.dataCostituzione.slice(0,4)):DC('anno')}</td></tr><tr><th>NOTE</th><td>Patente a crediti ${a.patenteCrediti&&a.patenteCrediti.codice?h(a.patenteCrediti.codice):DC('patente')} · REA ${h(a.rea||'')}</td></tr></tbody></table>`;
      case 'tabella_datore': return `<table><tbody><tr><th style="width:55mm">DATORE DI LAVORO</th><td>${h(nomeLeg)}</td></tr></tbody></table>`;
      case 'tabella_dirigenti_preposti': return `<table><tbody><tr><th rowspan="2" style="width:30mm">DIRIGENTI</th><th style="width:55mm">DIRETTORE TECNICO DI CANTIERE</th><td>${h(nomeLeg)}</td></tr><tr><th>ALTRO (specificare)</th><td></td></tr><tr><th rowspan="2">PREPOSTI</th><th>CAPOCANTIERE</th><td>${h(nomeLeg)}</td></tr><tr><th>PREPOSTO</th><td>${prep?h(nomeNomeCognome(prep)):DC('preposto')}</td></tr></tbody></table>`;
      case 'tabella_spp': return `<table><tbody><tr><td style="width:55mm"></td><th>NOMINATIVO</th></tr><tr><th>RESPONSABILE (R.S.P.P)</th><td>${rspp?h(nomeNomeCognome(rspp)):DC('RSPP')}</td></tr><tr><th rowspan="3">ADDETTI (A.S.P.P)</th><td></td></tr><tr><td></td></tr><tr><td></td></tr></tbody></table>`;
      case 'tabella_medico': return `<table><tbody><tr><th style="width:55mm">MEDICO COMPETENTE</th><td>${a.medicoCompetente&&a.medicoCompetente.nome?h(a.medicoCompetente.nome):DC('medico competente')}</td></tr></tbody></table>`;
      case 'tabella_rls': { const d=rls?migliorDocumento(documentiPersona(rls.id).filter(x=>x.tipoId==='corso_rls'),tipoDoc('corso_rls'),oggi(),soglie()):null; return `<table><tbody><tr><th rowspan="2" style="width:20mm">RLS</th><th style="width:60mm">NOMINATIVO</th><td>${rls?h(nomeNomeCognome(rls)):DC('RLS')}</td></tr><tr><th>CORSO DI FORMAZIONE (ENTE E DATA)</th><td>${d?(enteDoc(d.doc)?h(enteDoc(d.doc))+'<br>':DC('ente formatore')+'<br>')+'Data ultimo aggiornamento: '+h(fData(d.doc.dataEmissione)):DC('corso RLS')}</td></tr><tr><td></td><th colspan="2">RLST</th></tr></tbody></table>`; }
      case 'tabella_emergenze': { const riga=(p,tipo)=>{const d=migliorDocumento(documentiPersona(p.id).filter(x=>x.tipoId===tipo),tipoDoc(tipo),oggi(),soglie());return `<td>${h(nomeNomeCognome(p))}</td><td>${d?(enteDoc(d.doc)?h(enteDoc(d.doc))+' il ':'')+h(fData(d.doc.dataEmissione))+(enteDoc(d.doc)?'':' '+DC('ente')):DC('attestato')}</td>`}; const ant=stato.persone.filter(p=>p.attivo&&(p.qualifiche||[]).includes('antincendio')&&(pos.operai.includes(p.id)||p.id===(leg||{}).id));const ps=stato.persone.filter(p=>p.attivo&&(p.qualifiche||[]).includes('primoSoccorso')&&(pos.operai.includes(p.id)||p.id===(leg||{}).id)); const n1=Math.max(ant.length,1),n2=Math.max(ps.length,1); return `<table><thead><tr><th style="width:50mm"></th><th>NOMINATIVO</th><th>CORSO DI FORMAZIONE (ENTE E DATA)</th></tr></thead><tbody>${(ant.length?ant:[null]).map((p,i)=>`<tr>${i===0?`<th rowspan="${n1}">PREVENZIONE INCENDI, LOTTA ANTINCENDIO E GESTIONE DELLE EMERGENZE</th>`:''}${p?riga(p,'antincendio_2'):`<td colspan="2">${DC('addetti antincendio fra gli operai in cantiere')}</td>`}</tr>`).join('')}${(ps.length?ps:[null]).map((p,i)=>`<tr>${i===0?`<th rowspan="${n2}">PRIMO SOCCORSO</th>`:''}${p?riga(p,'primo_soccorso'):`<td colspan="2">${DC('addetti primo soccorso fra gli operai in cantiere')}</td>`}</tr>`).join('')}</tbody></table>`; }
      case 'tabella_fasi': return `<table class="tab-pos"><thead><tr><th>Lavorazione</th><th style="width:36mm">Inizio previsto</th><th style="width:36mm">Fine prevista</th></tr></thead><tbody>${tipi.map(t=>`<tr><td>${h(t.nome)}</td><td>${c.dataInizio?h(fData(c.dataInizio)):DC('data')}</td><td>${c.dataFine?h(fData(c.dataFine)):DC('data')}</td></tr>`).join('')}</tbody></table>`;
      case 'tabella_tipo_appalto': return `<table><tbody><tr><td style="width:8mm;text-align:center">${pos.tipoAppalto==='diretto'?'X':''}</td><td>appalto diretto dal committente o responsabile dei lavori.</td><td style="width:8mm;text-align:center">${pos.tipoAppalto==='affidataria'?'X':''}</td><td>subappalto da impresa affidataria.</td></tr><tr><td style="text-align:center">${pos.tipoAppalto==='esecutrice'?'X':''}</td><td>subappalto da impresa esecutrice.</td><td></td><td></td></tr></tbody></table>`;
      case 'tabella_lavoratori': return `<table><thead><tr><th>NOMINATIVO</th><th>QUALIFICA</th><th>MANSIONE</th></tr></thead><tbody>${operai.map(p=>`<tr><td>${h(nomeNomeCognome(p))}</td><td>${p.id===(leg||{}).id?'Legale Rappresentante':h(TIPI_PERSONA[p.tipo]||'Operaio')}</td><td>${p.id===(leg||{}).id?'Responsabile Lavori':h(p.mansione||'')}${p.id===pos.prepostoId?' (Preposto)':''}</td></tr>`).join('')}</tbody></table>`;
      case 'tabella_subappalto_imprese': return `<table><thead><tr><th>LAVORAZIONE</th><th>RAGIONE SOCIALE IMPRESA IN SUBAPPALTO</th></tr></thead><tbody><tr><td>Nessuna</td><td>—</td></tr></tbody></table>`;
      case 'tabella_subappalto_autonomi': return `<table><thead><tr><th>NOMINATIVO</th><th>INDIRIZZO</th><th>ATTIVITÀ</th></tr></thead><tbody><tr><td>Nessuno</td><td>—</td><td>—</td></tr></tbody></table>`;
      case 'tabella_formazione': { const ant=operai.filter(p=>(p.qualifiche||[]).includes('antincendio')).map(p=>nomeNomeCognome(p)).join(', ');const ps=operai.filter(p=>(p.qualifiche||[]).includes('primoSoccorso')).map(p=>nomeNomeCognome(p)).join(', '); return `<table><thead><tr><th>Qualifica Lavoratori</th><th>Attività di formazione</th><th>Nominativo</th><th>Svolta</th><th>Programmata</th></tr></thead><tbody><tr><td>RSPP</td><td>Corso per Responsabile del Servizio di Prevenzione e Protezione</td><td>${rspp?h(nomeNomeCognome(rspp)):DC('RSPP')}</td><td rowspan="4">La documentazione attestante le attività formative ed informative sono conservate presso l'archivio della impresa</td><td>Come da D.Lgs. 81/08</td></tr><tr><td rowspan="2">Addetti</td><td>Corso prevenzione incendi</td><td>${ant?h(ant):DC('addetti antincendio')}</td><td>Ogni tre anni</td></tr><tr><td>Corso primo soccorso</td><td>${ps?h(ps):DC('addetti primo soccorso')}</td><td>Ogni tre anni</td></tr><tr><td>RLS</td><td>Corso RLS</td><td>${rls?h(nomeNomeCognome(rls)):DC('RLS')}</td><td>Come da D.Lgs. 81/08</td></tr><tr><td rowspan="3">Lavoratori</td><td colspan="2">Informazione generale sul D. Lgs. 81/2008</td><td rowspan="2"></td><td rowspan="2">Ogni anno</td></tr><tr><td colspan="2">Formazione, informazione ed addestramento uso DPI</td></tr><tr><td colspan="2">Informazione specifica sui rischi di cantiere</td><td></td><td>Per ogni cantiere</td></tr></tbody></table>`; }
      case 'tabella_dpi_dotazione': return tabellaDpi();
      case 'tabella_elenco_macchine': return `<table class="tab-pos"><thead><tr><th>Macchina o attrezzatura</th><th>Usata per</th><th style="width:22mm">Marcata CE</th><th style="width:30mm">Verifiche periodiche</th></tr></thead><tbody>${attrezzature.map(x=>`<tr><td><b>${h(x.nome)}</b></td><td>${h(usatoDa(x.id).join(', '))}</td><td>${x.ce===false?'—':'Sì'}</td><td>${h(x.verifiche||'Prima dell’uso')}</td></tr>`).join('')}${ELENCO_MACCHINE_POS.filter(([n,l])=>l.some(id=>catSenza.includes(id))).map(([n])=>`<tr><td><b>${h(n)}</b></td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>`;
      case 'tabella_firme': return `<table><thead><tr><th style="width:40mm">Figure</th><th>Nominativo</th><th style="width:45mm">Firma</th></tr></thead><tbody><tr><td>Datore di lavoro</td><td>${h(nomeLeg)}</td><td style="text-align:center"><img src="{{IMG:firmaTimbro}}" style="height:16mm" alt=""></td></tr><tr><td>RSPP</td><td>${rspp?h(nomeNomeCognome(rspp)):DC('RSPP')}</td><td style="text-align:center"><img src="{{IMG:firmaRspp}}" style="height:14mm" alt=""></td></tr><tr><td>RLS</td><td>${rls?h(nomeNomeCognome(rls)):DC('RLS')}</td><td style="text-align:center">${rls&&(rls.firmaIncorporata||rls.firmaId)?'<img src="{{IMG:firmaRls}}" style="height:16mm" alt="">':''}</td></tr></tbody></table>`;
      case 'riga_data': return `<p class="sx" style="margin-top:8mm"><b>DATA</b> &nbsp;&nbsp;&nbsp;&nbsp; ${dataE}</p>`;
      case 'organizzazione_scelta': return `<ul><li>[${pos.organizzazione==='nonRealizzata'?'X':' '}] L’organizzazione generale del cantiere, come prevista dal PSC (Piano di Sicurezza e di Coordinamento), non è realizzata dalla presente impresa.</li><li>[${pos.organizzazione==='realizzata'?'X':' '}] L’organizzazione generale del cantiere, come prevista dal PSC, è realizzata completamente dalla presente impresa.</li></ul>`;
      case 'paragrafo_medico': return `<p>L’Azienda è soggetta alla sorveglianza sanitaria (*), pertanto è stato nominato il medico competente nella persona del ${a.medicoCompetente&&a.medicoCompetente.nome?h(a.medicoCompetente.nome):DC('medico competente')} iscritto all’ordine dei medici provinciale.</p>`;
      default: return `<p class="da-compilare">[blocco dinamico sconosciuto: ${h(nome)}]</p>`;
    }
  };
  for(const s of corpo){
    const liv=s.livello===1?'h2':'h3';
    blocchi.push({html:`<${liv} data-ind="${s._ind}"><span class="num">${numeri[s.id]}</span>${h(titolo(s))}</${liv}>`,tieniConSuccessivo:true,nuovaPagina:['analisi_lavorazioni','macchine'].includes(s.id)});
    if(s.id==='descrizione_opera'){blocchi.push(`<p>L’impresa esegue nel cantiere le seguenti lavorazioni:</p>`,tipi.length?`<ul class="spunte">${tipi.map(t=>`<li><b>${h(t.nome)}</b>${SCHEDE_TIPO[t.id]?': '+h(SCHEDE_TIPO[t.id].descrizione.charAt(0).toLowerCase()+SCHEDE_TIPO[t.id].descrizione.slice(1)):''}</li>`).join('')}</ul>`:`<p>${DC('lavorazioni')}</p>`);continue}
    if(s.id==='misure_prevenzione'){const nt=Object.fromEntries(Object.entries(TAG_MISURE_POS).map(([k,x])=>[normalizzaTesto(k),x]));blocchi.push(...renderBlocchiPos(filtraParagrafi(s.blocchi,t=>{const tag=nt[normalizzaTesto(t)];return tag===undefined?true:(tuttiTag||tags.has(tag))}),dinamico));continue}
    if(s.id==='dpi'){blocchi.push(`<p>I dispositivi di protezione individuale elencati di seguito sono stati scelti in base alle lavorazioni e alle attrezzature previste in questo cantiere. Ogni lavoratore li riceve in dotazione personale, è formato e addestrato al loro corretto utilizzo ed è tenuto a conservarli in buono stato.</p>`,tabellaDpi());
      const titoliDpi=Object.entries(TITOLI_DPI_POS);blocchi.push(...renderBlocchiPos(filtraParagrafi(s.blocchi.filter(b=>!(b.t==='dinamico'&&b.nome==='tabella_dpi_dotazione')),t=>{const m=titoliDpi.find(([k])=>normalizzaTesto(t).startsWith(normalizzaTesto(k)));return m?m[1].some(d=>dpiUsati.includes(d)):null}),dinamico));continue}
    if(s.id==='rumore'){blocchi.push(`<p>Fasce di esposizione giornaliera al rumore (D.Lgs. 81/2008, Titolo VIII, Capo II) e alle vibrazioni trasmesse al sistema mano-braccio (Capo III) dei lavoratori addetti a ciascuna lavorazione, come risultano dalla valutazione dei rischi dell’impresa.</p>`,`<table class="tab-pos"><thead><tr><th>Lavorazione</th><th>Rumore (L<sub>EX,8h</sub>)</th><th>Vibrazioni mano-braccio (A(8))</th></tr></thead><tbody>${conScheda.map(t=>{const S=SCHEDE_TIPO[t.id];return `<tr><td>${h(t.nome)}</td><td>${h(RUMORE_POS[S.rumore]||'')}</td><td>${h(VIBRAZIONI_POS[S.vibrazioni]||'')}</td></tr>`}).join('')}</tbody></table>`);continue}
    if(s.id==='sostanze'){const ids=unici(conScheda.flatMap(t=>SCHEDE_TIPO[t.id].sostanze||[]));blocchi.push(ids.length?`<p>Elenco delle sostanze e dei preparati pericolosi usati nel cantiere (Allegato XV, punto 3.2.1, lettera h). Le schede di sicurezza dei prodotti sono disponibili in cantiere; i lavoratori sono informati sui pericoli e sulle misure indicate nelle schede, che vanno sempre rispettate.</p>`:`<p>Nelle lavorazioni previste non si usano sostanze o preparati classificati pericolosi.</p>`);if(ids.length)blocchi.push(`<table class="tab-pos"><thead><tr><th style="width:52mm">Sostanza o preparato</th><th>Pericoli principali</th><th style="width:40mm">Usato per</th></tr></thead><tbody>${ids.map(id=>`<tr><td><b>${h(SOSTANZE_POS[id].nome)}</b></td><td>${h(SOSTANZE_POS[id].pericoli)}</td><td>${h(conScheda.filter(t=>(SCHEDE_TIPO[t.id].sostanze||[]).includes(id)).map(t=>t.breve).join(', '))}</td></tr>`).join('')}</tbody></table>`);continue}
    blocchi.push(...renderBlocchiPos(s.blocchi,dinamico));
    if(s.id==='analisi_lavorazioni'){blocchi.push(`<p>Per ciascuna lavorazione sono riportate le fasi di lavoro, le attrezzature utilizzate, la valutazione dei rischi secondo il metodo descritto al paragrafo ${numeri.metodologia||''} (R = D × P), le misure di prevenzione e protezione e i dispositivi di protezione individuale.</p>`);for(const t of conScheda)blocchi.push(...schedaTipo(t));for(const sc of schedeLav){blocchi.push({html:`<div class="scheda-titolo" data-ind="${sc._ind}">${h(sc.titolo)}</div>`,tieniConSuccessivo:true});blocchi.push(...renderBlocchiPos(sc.blocchi,dinamico))}if(!tipi.length)blocchi.push(`<p>${DC('nessuna lavorazione selezionata')}</p>`)}
    if(s.id==='macchine'){for(const x of attrezzature)blocchi.push(...schedaAttr(x));for(const m of macch){blocchi.push({html:`<div class="scheda-titolo" data-ind="${m._ind}">${h(m.titolo)}</div>`,tieniConSuccessivo:true});blocchi.push(...renderBlocchiPos(m.blocchi,dinamico))}}
  }
  return {titolo:'POS '+c.nome,orientamento:'verticale',intestazione:testataPos,pie,blocchi,classe:'pos'};
}

// Rendering dei blocchi del testo standard (paragrafi, elenchi, titoli, tabelle, immagini, dinamici)
function renderBlocchiPos(blocchi,dinamico){
  const out=[];let lista=null,listaTipo=null;
  const chiudiLista=()=>{if(lista){out.push(`<${listaTipo}>${lista.join('')}</${listaTipo}>`);lista=null}};
  const testoRuns=b=>{if(b.r)return b.r.map(([t,f])=>{let s=h(t).replace(/\t/g,' ').replace(/\n/g,'<br>');if(f.includes('b'))s='<b>'+s+'</b>';if(f.includes('i'))s='<i>'+s+'</i>';if(f.includes('u'))s='<u>'+s+'</u>';return s}).join('');let s=h(b.testo||'').replace(/\t/g,' ').replace(/\n/g,'<br>');if(b.f&&b.f.includes('b'))s='<b>'+s+'</b>';if(b.f&&b.f.includes('i'))s='<i>'+s+'</i>';return s};
  const img=b=>(b.img||[]).map(i=>IMMAGINI.pos[i.src]||stato.azienda['img_'+i.src]?`<img class="inline" src="{{IMG:${h(i.src)}}}" style="width:${i.w*10}mm;max-height:${i.h*10}mm;object-fit:contain" alt="">`:'').join('');
  for(const b of blocchi){
    if(b.t==='li'){const tipo=b.tipo==='numero'?'ol':b.tipo==='lettera'?'ol':'ul';if(lista&&listaTipo!==tipo)chiudiLista();if(!lista){lista=[];listaTipo=tipo}lista.push(`<li ${b.liv?`style="margin-left:${b.liv*6}mm"`:''} ${b.tipo==='lettera'?'style="list-style-type:lower-alpha"':''}>${testoRuns(b)}${img(b)}</li>`);continue}
    chiudiLista();
    if(b.t==='p'){const cls=b.al==='center'?'centro':b.al==='right'?'destra':'sx';out.push(`<p class="${cls}">${testoRuns(b)}${img(b)}</p>`);continue}
    if(b.t==='h'){const l=Math.max(4,b.liv||4);out.push({html:`<h${l}>${testoRuns(b)}</h${l}>`,tieniConSuccessivo:true});continue}
    if(b.t==='dinamico'){out.push(dinamico(b.nome));continue}
    if(b.t==='tab'){const r=renderTabellaPos(b,dinamico);if(Array.isArray(r))out.push(...r);else out.push(r);continue}
  }
  chiudiLista();
  return out;
}
function renderTabellaPos(b,dinamico){
  const pesante=b.righe.some(r=>r.some(c=>c.vm||(c.b||[]).filter(x=>x.t==='li').length>1));
  if(pesante&&(b.grid||[]).length>=2) return b.righe.map(r=>{const celle=r.filter(c=>c.vm!=='continua').map(c=>renderBlocchiPos(c.b||[],dinamico).map(x=>typeof x==='string'?x:x.html).join(''));return celle.some(x=>x.replace(/<[^>]+>/g,'').trim())?`<div class="riga-flusso">${celle.map((x,i)=>`<div class="${i?'rf-c':'rf-t'}">${x}</div>`).join('')}</div>`:''}).filter(Boolean);
  const grid=b.grid||[];const tot=grid.reduce((a,x)=>a+x,0)||1;
  const rowspanDa=[];// per colonna: cella che ha aperto un vMerge
  const righe=b.righe.map((r,ri)=>{let col=0;const celle=[];for(const c of r){const span=c.span||1;if(c.vm==='continua'){const ap=rowspanDa[col];if(ap)ap.rs++;col+=span;continue}const cella={c,col,span,rs:1};if(c.vm==='restart')rowspanDa[col]=cella;else rowspanDa[col]=null;celle.push(cella);col+=span}return celle});
  const contenutoCella=c=>{const parti=renderBlocchiPos(c.b||[],dinamico).map(x=>typeof x==='string'?x:x.html);return parti.join('')||''};
  const w=(col,span)=>{const s=grid.slice(col,col+span).reduce((a,x)=>a+x,0);return s?` style="width:${(s/tot*100).toFixed(1)}%"`:''};
  const intestazione=b.righe.length>1&&b.righe[0].every(c=>c.fill)&&b.righe.length>3;
  const rowsHtml=righe.map((celle,ri)=>'<tr>'+celle.map(x=>{const c=x.c;const fill=c.fill?` background:#${h(c.fill)};`:'';const bold=(c.b||[]).every(bb=>bb.f&&bb.f.includes('b'))&&(c.b||[]).length?' cella-b':'';const tag=(ri===0&&intestazione)?'th':'td';return `<${tag} class="${bold}"${x.span>1?` colspan="${x.span}"`:''}${x.rs>1?` rowspan="${x.rs}"`:''} style="${fill}${ri===0?w(x.col,x.span).replace(' style="','').replace('"',''):''}">${contenutoCella(c)}</${tag}>`}).join('')+'</tr>');
  if(intestazione) return `<table><thead>${rowsHtml[0]}</thead><tbody>${rowsHtml.slice(1).join('')}</tbody></table>`;
  return `<table><tbody>${rowsHtml.join('')}</tbody></table>`;
}
