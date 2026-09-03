// ---------------------------------------------------------------------
// CANTIERI: elenco per stato, diagramma temporale, scheda con le sei figure, squadra, documenti,
// checklist della committenza, economia, diario e invii.
// ---------------------------------------------------------------------
const FIGURE_CANTIERE=[
  {chiave:'committenteId',ruolo:'Committente',tipo:'cliente',ruoloCliente:'committente'},
  {chiave:'affidatariaId',ruolo:'Impresa affidataria',tipo:'cliente',ruoloCliente:'affidataria',aiuto:'Chi ha subappaltato direttamente a Pavimass: non coincide col committente finale'},
  {chiave:'progettistaId',ruolo:'Progettista',tipo:'professionista',ruoloProf:'progettista'},
  {chiave:'direttoreLavoriId',ruolo:'Direttore dei lavori',tipo:'professionista',ruoloProf:'direttoreLavori'},
  {chiave:'cseId',ruolo:'Coordinatore sicurezza in esecuzione (CSE)',tipo:'professionista',ruoloProf:'cse'},
  {chiave:'cspId',ruolo:'Coordinatore sicurezza in progettazione (CSP)',tipo:'professionista',ruoloProf:'csp'},
];
function testoFigura(c,f){
  const id=c[f.chiave]; if(!id) return null;
  if(f.tipo==='cliente'){const cl=cliente(id);return cl?{nome:cl.ragioneSociale,righe:[indirizzoTesto(cl.indirizzo),cl.telefono?'Tel. '+cl.telefono:'',cl.pec?'PEC '+cl.pec:cl.email||'',cl.piva?'P.IVA '+cl.piva:''].filter(Boolean),href:'#/clienti/'+cl.id}:null}
  const p=professionista(id);return p?{nome:[p.titolo,p.nome].filter(Boolean).join(' '),righe:[indirizzoTesto(p.indirizzo),(p.telefoni||[]).join(' / '),p.email||'',p.cf?'C.F. '+p.cf:''].filter(Boolean),href:null}:null;
}
function personeQualificatePreposto(ids){
  const t=tipoDoc('corso_preposto');
  return stato.persone.filter(p=>p.attivo&&(!ids||ids.includes(p.id))).filter(p=>{const docs=documentiPersona(p.id).filter(d=>d.tipoId==='corso_preposto');const m=migliorDocumento(docs,t,oggi(),soglie());return m&&!['scaduto'].includes(m.info.stato)});
}
// ---- checklist della committenza ----
function checklistCantiere(c){
  const voci=[];const oggiIso=oggi();const s=soglie();
  const aggiungi=(v)=>voci.push(v);
  // documenti d'impresa obbligatori
  for(const t of stato.tipiDocumento.filter(t=>t.ambito==='azienda'&&t.obbligatorio==='si')){
    const docs=documentiAzienda().filter(d=>d.tipoId===t.id);
    const m=migliorDocumento(docs,t,oggiIso,s);
    let stato_='richiedere',motivo='';
    if(m){ if(m.info.stato==='scaduto'){stato_='scaduto';motivo='scaduto il '+fData(m.info.data)} else if(!(m.doc.file||[]).length){stato_='senzafile';motivo='registrato ma senza file'} else {stato_='ok'} if(t.recenteMesi&&m.doc.dataEmissione&&giorniTra(m.doc.dataEmissione,oggiIso)>t.recenteMesi*31){stato_='scaduto';motivo='più vecchia di '+t.recenteMesi+' mesi'} }
    aggiungi({gruppo:'Impresa',nome:t.nome,tipo:t,soggetto:stato.azienda.ragioneSociale,soggettoTipo:'azienda',doc:m?m.doc:null,info:m?m.info:null,stato:stato_,motivo});
  }
  // per ogni operaio assegnato
  const operai=(c.operai||[]).map(id=>persona(id)).filter(Boolean);
  for(const p of operai){
    const visti=new Set();
    for(const t of stato.tipiDocumento.filter(t=>t.ambito==='persona'&&t.obbligatorio!=='no')){
      if(!tipoApplicabile(t,p)) continue;
      const gruppo=gruppoAlternativo(t.id);const k=gruppo?gruppo.join('|'):t.id; if(visti.has(k)) continue; visti.add(k);
      const tipi=gruppo?stato.tipiDocumento.filter(x=>gruppo.includes(x.id)):[t];
      let best=null;for(const tt of tipi){const m=migliorDocumento(documentiPersona(p.id).filter(d=>d.tipoId===tt.id),tt,oggiIso,s);if(m&&(!best||confrontoStato(m.info,best.info)>0))best={...m,tipo:tt}}
      const nome=gruppo?tipi.map(x=>x.nome).join(' o '):t.nome;
      let stato_='richiedere',motivo='';
      if(best){ if(best.info.stato==='scaduto'){stato_='scaduto';motivo='scaduto il '+fData(best.info.data)} else if(!(best.doc.file||[]).length){stato_='senzafile';motivo='registrato ma senza file'} else stato_='ok' }
      else if(t.obbligatorio==='ruolo'&&!(p.qualifiche||[]).length){stato_='na';motivo='nessun ruolo'}
      aggiungi({gruppo:'Operai',nome,tipo:best?best.tipo:t,soggetto:nomePersona(p),soggettoTipo:'persona',persona:p,doc:best?best.doc:null,info:best?best.info:null,stato:stato_,motivo,bloccante:!!(t.bloccaIdoneita)});
    }
  }
  // sicurezza del cantiere
  const hasPos=stato.pos.find(x=>x.cantiereId===c.id)||(c.documentiProdotti||[]).find(d=>d.tipo==='POS'&&d.fileId);
  aggiungi({gruppo:'Sicurezza cantiere',nome:'POS del cantiere',soggetto:c.nome,stato:hasPos?'ok':'preparare',motivo:hasPos?'':'da generare con la procedura guidata',azione:'pos'});
  aggiungi({gruppo:'Sicurezza cantiere',nome:'PSC ricevuto',soggetto:c.nome,stato:c.psc&&c.psc.fileId?'ok':'richiedere',motivo:c.psc&&c.psc.fileId?'':'chiedere al coordinatore'});
  if(c.prepostoId) aggiungi({gruppo:'Sicurezza cantiere',nome:'Nomina preposto di cantiere',soggetto:nomePersona(persona(c.prepostoId)),stato:(c.documentiProdotti||[]).find(d=>/preposto/i.test(d.titolo||''))?'ok':'preparare',motivo:'',azione:'dichiarazione:nomina_preposto_cantiere'});
  // dichiarazioni ricorrenti
  for(const m of stato.modelli.dichiarazioni){ if(m.soloConSubappalto) continue; if(['regolarita_fiscale','corretta_posa','nomina_preposto_cantiere','nomina_antincendio_cantiere','nomina_primo_soccorso_cantiere'].includes(m.id)) continue; const fatta=(c.documentiProdotti||[]).find(d=>d.modelloId===m.id); aggiungi({gruppo:'Dichiarazioni',nome:m.nome,soggetto:stato.azienda.ragioneSociale,stato:fatta?'ok':'preparare',motivo:fatta?'compilata il '+fData(fatta.data):'si compila dai dati del cantiere',azione:'dichiarazione:'+m.id,modelloId:m.id}); }
  // voci aggiunte dalla lista della committenza
  for(const v of c.checklistExtra||[]){ const t=v.tipoId?tipoDoc(v.tipoId):null; let stato_=v.stato||'richiedere';let doc=null,info=null; if(t){ const docs=t.ambito==='azienda'?documentiAzienda().filter(d=>d.tipoId===t.id):[]; const m=migliorDocumento(docs,t,oggiIso,s); if(m){doc=m.doc;info=m.info;stato_=m.info.stato==='scaduto'?'scaduto':(m.doc.file||[]).length?'ok':'senzafile'} } aggiungi({gruppo:'Richieste dalla committenza',nome:v.nome,tipo:t,soggetto:v.soggetto||stato.azienda.ragioneSociale,stato:stato_,motivo:v.motivo||'',doc,info,extra:true,id:v.id}); }
  const totale=voci.filter(v=>v.stato!=='na').length;
  const pronti=voci.filter(v=>v.stato==='ok').length;
  const urgenti=voci.filter(v=>v.stato==='scaduto'||(v.stato==='richiedere'&&v.bloccante));
  return {voci,totale,pronti,urgenti};
}
const STATI_CHECKLIST={ok:{t:'Presente e valido',cl:'valido',ic:'ok'},scaduto:{t:'Presente ma scaduto',cl:'scaduto',ic:'errore'},senzafile:{t:'Registrato, manca il file',cl:'scadenza',ic:'attenzione'},richiedere:{t:'Da richiedere',cl:'mancante',ic:'blocco'},preparare:{t:'Da preparare',cl:'pianificare',ic:'modifica'},na:{t:'Non applicabile',cl:'neutro',ic:'meno'}};

VISTE.cantieri=function(r){
  if(r.query.nuovo){setTimeout(()=>dialogoCantiere(null),0);history.replaceState(null,'','#/cantieri')}
  if(r.id&&r.sotto==='pos') return vistaPosWizard(cantiere(r.id),r);
  if(r.id&&r.sotto==='pacchetto') return vistaPacchetto(cantiere(r.id),r);
  if(r.id) return vistaCantiere(r.id,r);
  const vista=r.query.vista||ui.filtri.cantieriVista||'elenco';
  const testa=html`<div class="testata"><div><h1>Cantieri</h1><div class="sotto">${stato.cantieri.filter(c=>c.stato==='attivo').length} attivi · ${stato.cantieri.length} totali</div></div><div class="azioni"><div class="gruppo-pulsanti"><button class="pulsante ${vista==='elenco'?'attivo':''}" data-azione="cantieri-vista" data-valore="elenco">${icona('elenco')}Elenco</button><button class="pulsante ${vista==='tempo'?'attivo':''}" data-azione="cantieri-vista" data-valore="tempo">${icona('tempo')}Diagramma</button></div><button class="pulsante primario" data-azione="cantiere-nuovo">${icona('piu')}Nuovo cantiere</button></div></div>`;
  if(vista==='tempo'){
    const righe=stato.cantieri.filter(c=>c.stato!=='archiviato').map(c=>({etichetta:c.nome,inizio:c.dataInizio,fine:c.dataFine||(c.stato==='attivo'?oggi():null),classe:c.stato,href:'#/cantieri/'+c.id,testo:(c.operai||[]).length?c.operai.length+' operai':''}));
    const senza=stato.cantieri.filter(c=>!c.dataInizio&&c.stato!=='archiviato');
    return html`${testa}<div class="scheda"><h3>Diagramma temporale</h3><p class="secondario piccolo">Ogni barra è un cantiere sull'asse dei mesi; la linea rossa è oggi. Le sovrapposizioni mostrano dove la squadra è impegnata due volte.</p>${graficoTemporale(righe.filter(r=>r.inizio))}<div class="legenda"><span><i></i>attivo</span><span><i class="s4"></i>chiuso</span><span><i class="s3"></i>sospeso</span></div>${senza.length?html`<div class="sezione-titolo">Senza date</div><div class="chip-lista">${senza.map(c=>html`<a class="chip" href="#/cantieri/${c.id}">${c.nome} <span class="secondario piccolo">${c.periodoTesto||'date da compilare'}</span></a>`)}</div>`:''}</div>`;
  }
  const CHIUSI=['chiuso','archiviato'];
  const f=Object.assign({stato:'attivi',anno:'',comune:''},ui.filtri.cantieri);
  let cantieriF=stato.cantieri.slice();
  if(f.stato==='attivi') cantieriF=cantieriF.filter(c=>!CHIUSI.includes(c.stato));
  if(f.stato==='chiusi') cantieriF=cantieriF.filter(c=>CHIUSI.includes(c.stato));
  if(f.anno) cantieriF=cantieriF.filter(c=>String(c.anno)===f.anno);
  if(f.comune) cantieriF=cantieriF.filter(c=>(c.indirizzo&&c.indirizzo.comune||'')===f.comune);
  const anni=[...new Set(stato.cantieri.map(c=>c.anno).filter(Boolean))].sort((a,b)=>b-a);
  const comuni=[...new Set(stato.cantieri.map(c=>c.indirizzo&&c.indirizzo.comune).filter(Boolean))].sort();
  const barra=html`<div class="strumenti-tabella"><div class="gruppo-pulsanti">${[['attivi','In corso'],['chiusi','Chiusi'],['tutti','Tutti']].map(([v,t])=>html`<button class="pulsante piccolo ${f.stato===v?'attivo':''}" data-azione="filtro-cantieri-stato" data-valore="${v}">${t}</button>`)}</div><select data-cambio="filtro-cantieri" data-campo="anno" aria-label="Anno"><option value="">Tutti gli anni</option>${anni.map(a=>html`<option value="${a}" ${String(a)===f.anno?'selected':''}>${a}</option>`)}</select><select data-cambio="filtro-cantieri" data-campo="comune" aria-label="Località"><option value="">Tutte le località</option>${comuni.map(cm=>html`<option value="${cm}" ${cm===f.comune?'selected':''}>${cm}</option>`)}</select><span class="conteggio">${cantieriF.length} cantieri</span></div>`;
  const gruppi=['attivo','sospeso','preventivo','chiuso','archiviato'];
  const righe=cantieriF.map(c=>{const ck=checklistCantiere(c);const eco=economiaCantiere(c.id,stato.movimenti);return {c,ck,eco}});
  return html`${testa}${barra}${gruppi.map(g=>{const rr=righe.filter(x=>x.c.stato===g);if(!rr.length)return '';return html`<div class="sezione-titolo">${STATI_CANTIERE[g]} · ${rr.length}</div>${tabella({id:'cant'+g,righe:rr,href:x=>'#/cantieri/'+x.c.id,colonne:[
    {chiave:'nome',titolo:'Cantiere',principale:true,valore:x=>x.c.nome,formatta:x=>html`<b>${x.c.nome}</b><br><span class="piccolo secondario">${[x.c.indirizzo.comune,x.c.indirizzo.provincia?'('+x.c.indirizzo.provincia+')':''].filter(Boolean).join(' ')||''}</span>`},
    {chiave:'comm',titolo:'Committente / affidataria',formatta:x=>html`${nomeCliente(x.c.committenteId)||daCompilare()}<br><span class="piccolo secondario">${nomeCliente(x.c.affidatariaId)||''}</span>`},
    {chiave:'periodo',titolo:'Periodo',valore:x=>x.c.dataInizio||'',formatta:x=>x.c.dataInizio?html`${fData(x.c.dataInizio)} → ${x.c.dataFine?fData(x.c.dataFine):'…'}`:html`<span class="secondario">${x.c.periodoTesto||daCompilare()}</span>`},
    {chiave:'operai',titolo:'Squadra',formatta:x=>(x.c.operai||[]).length?html`${x.c.operai.length} operai${x.c.prepostoId?html` · preposto ${nomePersona(persona(x.c.prepostoId)).split(' ')[0]}`:''}`:html`<span class="silenzioso">—</span>`},
    {chiave:'doc',titolo:'Documenti',formatta:x=>html`${x.ck.pronti}/${x.ck.totale}${x.ck.urgenti.length?html` <span class="pillola scaduto">${icona('attenzione','piccola')}${x.ck.urgenti.length}</span>`:''}`},
    {chiave:'margine',titolo:'Margine',num:true,valore:x=>x.eco.margine,formatta:x=>(x.eco.entrate||x.eco.uscite)?html`<span class="${x.eco.margine<0?'da-compilare':''}">${fEuro(x.eco.margine,0)}</span>`:html`<span class="silenzioso">—</span>`},
  ]})}`})}${stato.cantieri.length?(cantieriF.length?'':vuoto({icona:'cantieri',titolo:'Nessun cantiere con questi filtri',testo:'Prova a cambiare stato, anno o località.'})):vuoto({icona:'cantieri',titolo:'Nessun cantiere',testo:'Crea il primo cantiere: da lì partono POS, checklist e pacchetto per la committenza.',azione:{testo:'Nuovo cantiere',azione:'cantiere-nuovo'}})}`;
};
AZIONI['cantieri-vista']=d=>{ui.filtri.cantieriVista=d.valore;render()};
AZIONI['filtro-cantieri-stato']=d=>{ui.filtri.cantieri=Object.assign({stato:'attivi',anno:'',comune:''},ui.filtri.cantieri,{stato:d.valore});render()};
AZIONI['filtro-cantieri']=(d,t)=>{ui.filtri.cantieri=Object.assign({stato:'attivi',anno:'',comune:''},ui.filtri.cantieri,{[d.campo]:t.value});render()};
AZIONI['cantiere-nuovo']=()=>dialogoCantiere(null);
AZIONI['cantiere-modifica']=d=>dialogoCantiere(cantiere(d.id));

function vistaCantiere(id,r){
  const c=cantiere(id); if(!c) return html`<div class="vuoto">${icona('attenzione')}<h3>Cantiere non trovato</h3><a class="pulsante" href="#/cantieri">Elenco</a></div>`;
  const ling=linguettaAttiva('cantiere','scheda');
  const ck=checklistCantiere(c);
  return html`<div class="briciole"><a href="#/cantieri">Cantieri</a> › ${c.nome}</div>
  <div class="testata"><div><h1>${c.nome}</h1><div class="sotto">${pillolaGenerica(STATI_CANTIERE[c.stato]||c.stato,c.stato==='attivo'?'valido':'neutro')} ${c.anno} · ${indirizzoTesto(c.indirizzo)||daCompilare('indirizzo')}</div></div>
    <div class="azioni"><a class="pulsante" href="#/cantieri/${c.id}/pos">${icona('scudo')}Genera POS</a><a class="pulsante" href="#/cantieri/${c.id}/pacchetto">${icona('pacchetto')}Pacchetto committenza</a><button class="pulsante primario" data-azione="cantiere-modifica" data-id="${c.id}">${icona('modifica')}Modifica</button></div></div>
  ${ck.urgenti.length?html`<div class="avviso-inline critico">${icona('errore')}<div class="corpo"><b>Prima dell'ingresso in cantiere:</b> ${ck.urgenti.map(v=>html`${v.soggetto}: ${v.nome}${v.motivo?' ('+v.motivo+')':''}`).reduce((a,b)=>html`${a} · ${b}`)}</div></div>`:''}
  ${linguette('cantiere',[{id:'scheda',testo:'Scheda',icona:'cantieri'},{id:'squadra',testo:'Squadra e lavorazioni',icona:'operai'},{id:'documenti',testo:'Documenti',icona:'documenti'},{id:'checklist',testo:'Checklist committenza',icona:'spunta',contatore:ck.totale-ck.pronti||null,critico:ck.urgenti.length>0},{id:'economia',testo:'Economia',icona:'euro'},{id:'diario',testo:'Diario e invii',icona:'orologio'}],ling)}
  ${ling==='scheda'?schedaCantiereAnagrafica(c):ling==='squadra'?schedaCantiereSquadra(c):ling==='documenti'?schedaCantiereDocumenti(c):ling==='checklist'?schedaCantiereChecklist(c,ck):ling==='economia'?schedaCantiereEconomia(c):schedaCantiereDiario(c)}`;
}
function schedaCantiereAnagrafica(c){
  const campo=(et,v,fmt)=>html`<div class="campo"><span class="etichetta-campo">${et}</span><div>${valoreODaCompilare(v,fmt)}</div></div>`;
  return html`<div class="griglia due"><div class="scheda"><h3>Dati del cantiere</h3><div class="campi">
    ${campo('Descrizione dell\'opera',c.descrizione)}${campo('Indirizzo',c.indirizzo.via)}${campo('Comune',c.indirizzo.comune)}${campo('Provincia',c.indirizzo.provincia)}${campo('CAP',c.indirizzo.cap)}
    ${campo('Inizio lavori Pavimass',c.dataInizio,fData)}${campo('Fine lavori Pavimass',c.dataFine,fData)}${c.periodoTesto?campo('Periodo (testo)',c.periodoTesto):''}
    ${campo('Importo di contratto',c.importoContratto,fEuro)}${campo('Orari di lavoro',c.orari)}${campo('Entità presunta uomini/giorno',c.uominiGiorno)}
    </div>
    <div class="sezione-titolo">PSC</div><div class="campi">${campo('Data PSC',c.psc.data||c.psc.periodoTesto,v=>dataValida(v)?fData(v):v)}${campo('Redattore',c.psc.redattore)}<div class="campo largo"><span class="etichetta-campo">Prescrizioni</span><div>${c.psc.prescrizioni||html`<span class="silenzioso">—</span>`}</div></div><div class="campo"><span class="etichetta-campo">File</span><div>${c.psc.fileId?html`<button class="pulsante piccolo" data-azione="file-apri" data-id="${c.psc.fileId}">${icona('pdf','piccola')}Apri PSC</button>`:html`<button class="pulsante piccolo" data-azione="cantiere-psc-carica" data-id="${c.id}">${icona('carica','piccola')}Carica PSC</button>`}</div></div></div>
    <div class="sezione-titolo">Denuncia di apertura cantiere</div><div class="campi">${campo('Data',c.denuncia.data,fData)}${campo('Periodo',c.denuncia.dal?fData(c.denuncia.dal)+' → '+fData(c.denuncia.al):null)}${campo('Importo complessivo lavori',c.denuncia.importoComplessivo,fEuro)}${campo('Importo Pavimass',c.denuncia.importoPavimass,fEuro)}</div>
    ${c.note?html`<div class="sezione-titolo">Note</div><p>${c.note}</p>`:''}</div>
  <div class="scheda"><h3>Le sei figure <span class="azioni"><button class="pulsante piccolo" data-azione="cantiere-modifica" data-id="${c.id}">${icona('modifica','piccola')}Modifica</button></span></h3><p class="piccolo secondario">Progettista e direttore dei lavori non sono mai facoltativi.</p>
    ${FIGURE_CANTIERE.map(f=>{const t=testoFigura(c,f);return html`<div class="figura-riga"><span class="ruolo">${f.ruolo}</span><span>${t?html`<b>${t.href?html`<a href="${t.href}">${t.nome}</a>`:t.nome}</b>${t.righe.map(x=>html`<br><span class="piccolo secondario">${x}</span>`)}`:daCompilare()}</span><span></span></div>`})}</div></div>`;
}
function schedaCantiereSquadra(c){
  const operai=(c.operai||[]).map(id=>persona(id)).filter(Boolean);
  const qualificati=personeQualificatePreposto();
  return html`<div class="griglia due"><div class="scheda"><h3>Lavorazioni previste</h3>${(c.lavorazioni||[]).length?html`<ol>${c.lavorazioni.map(id=>{const l=stato.lavorazioni.find(x=>x.id===id);return html`<li>${l?l.nome:id}</li>`})}</ol>`:html`<p>${daCompilare('lavorazioni da scegliere')}</p>`}
    <div class="campi mt"><div class="campo"><span class="etichetta-campo">Uomini/giorno</span><div>${valoreODaCompilare(c.uominiGiorno)}</div></div><div class="campo"><span class="etichetta-campo">Orari</span><div>${valoreODaCompilare(c.orari)}</div></div></div></div>
  <div class="scheda"><h3>Squadra <span class="azioni"><button class="pulsante piccolo" data-azione="cantiere-modifica" data-id="${c.id}">${icona('modifica','piccola')}Modifica</button></span></h3>
    <div class="campo mb"><span class="etichetta-campo">Preposto</span><div>${c.prepostoId?html`<b>${nomePersona(persona(c.prepostoId))}</b>${qualificati.find(p=>p.id===c.prepostoId)?html` <span class="pillola valido">${icona('ok')}corso preposto valido</span>`:html` <span class="pillola scaduto">${icona('errore')}corso preposto non valido</span>`}`:daCompilare('preposto')}${qualificati.length?'':html`<div class="avviso-inline critico mt-s">${icona('errore')}<div class="corpo">Nessuna persona ha il corso preposto in corso di validità: non si può designare un preposto.</div></div>`}</div></div>
    <ul class="elenco-piatto">${operai.map(p=>{const i=idoneita(p);return html`<li class="link" data-azione="vai" data-href="operai/${p.id}">${avatar(p)}<span class="spazio"><b>${nomePersona(p)}</b><br><span class="piccolo secondario">${p.mansione||''}</span></span>${i.idonea?html`<span class="pillola valido">${icona('ok')}Idoneo</span>`:html`<span class="pillola scaduto" title="${i.motivi.join('; ')}">${icona('blocco')}${tronca(i.motivi[0],40)}</span>`}</li>`})}${operai.length?'':html`<li class="secondario">Nessun operaio assegnato.</li>`}</ul></div></div>`;
}
function schedaCantiereDocumenti(c){
  const prodotti=c.documentiProdotti||[];
  const docsCant=documentiDi('cantiere',c.id);
  const posGen=stato.pos.filter(p=>p.cantiereId===c.id).sort((a,b)=>b.revisione-a.revisione);
  return html`<div class="scheda"><h3>${icona('scudo')}Sicurezza <span class="azioni"><a class="pulsante piccolo" href="#/cantieri/${c.id}/pos">${icona('piu','piccola')}Genera POS</a><button class="pulsante piccolo" data-azione="cantiere-psc-carica" data-id="${c.id}">${icona('carica','piccola')}Carica PSC</button></span></h3>
    <ul class="elenco-piatto">
      <li>${icona('pdf')}<span class="spazio"><b>PSC</b> ${c.psc.data||c.psc.periodoTesto?html`<span class="secondario piccolo">del ${dataValida(c.psc.data)?fData(c.psc.data):(c.psc.periodoTesto||'')}${c.psc.redattore?' · '+c.psc.redattore:''}</span>`:''}</span>${c.psc.fileId?html`<button class="pulsante piccolo" data-azione="file-apri" data-id="${c.psc.fileId}">${icona('occhio','piccola')}Apri</button>`:html`<span class="pillola mancante">${icona('blocco')}non caricato</span>`}</li>
      ${posGen.map(p=>html`<li>${icona('scudo')}<span class="spazio"><b>POS revisione ${p.revisione}</b> <span class="secondario piccolo">emesso ${fData(p.dataEmissione)}${p.dataRevisione&&p.dataRevisione!==p.dataEmissione?' · rev. '+fData(p.dataRevisione):''} · ${p.lavorazioni.length} lavorazioni · ${p.operai.length} operai</span></span><button class="pulsante piccolo" data-azione="pos-ristampa" data-id="${p.id}">${icona('stampa','piccola')}Stampa</button><button class="pulsante piccolo" data-azione="pos-nuova-revisione" data-id="${p.id}">${icona('aggiorna','piccola')}Nuova revisione</button></li>`)}
      ${prodotti.filter(d=>d.tipo==='POS').map(d=>html`<li>${icona('scudo')}<span class="spazio"><b>${d.titolo}</b> <span class="secondario piccolo">${d.dataEmissione?'emesso '+fData(d.dataEmissione)+' · ':''}${d.data?'rev. '+fData(d.data):''}</span>${d.note?html`<br><span class="piccolo secondario">${d.note}</span>`:''}</span>${d.fileId?html`<button class="pulsante piccolo" data-azione="file-apri" data-id="${d.fileId}">${icona('occhio','piccola')}Apri</button>`:html`<button class="pulsante piccolo" data-azione="cantiere-prodotto-file" data-id="${c.id}" data-prod="${d.id}">${icona('carica','piccola')}Allega file</button>`}</li>`)}
    </ul></div>
  <div class="scheda"><h3>${icona('firma')}Dichiarazioni e altri documenti prodotti <span class="azioni"><button class="pulsante piccolo" data-azione="dichiarazione-compila" data-cantiere="${c.id}">${icona('piu','piccola')}Compila dichiarazione</button><button class="pulsante piccolo" data-azione="cantiere-prodotto-nuovo" data-id="${c.id}">${icona('allega','piccola')}Registra documento</button></span></h3>
    ${prodotti.filter(d=>d.tipo!=='POS').length?html`<ul class="elenco-piatto">${prodotti.filter(d=>d.tipo!=='POS').map(d=>html`<li>${icona(d.tipo==='Dichiarazione'?'firma':'file')}<span class="spazio"><b>${d.titolo}</b> <span class="secondario piccolo">${d.tipo} · ${fData(d.data)}${d.revisione?' · rev. '+d.revisione:''}</span>${d.note?html`<br><span class="piccolo secondario">${d.note}</span>`:''}</span>${d.generatoId?html`<button class="pulsante piccolo" data-azione="generato-ristampa" data-id="${d.generatoId}">${icona('stampa','piccola')}Ristampa</button>`:''}${d.fileId?html`<button class="pulsante piccolo" data-azione="file-apri" data-id="${d.fileId}">${icona('occhio','piccola')}Apri</button>`:d.generatoId?'':html`<button class="pulsante piccolo" data-azione="cantiere-prodotto-file" data-id="${c.id}" data-prod="${d.id}">${icona('carica','piccola')}Allega</button>`}<button class="pulsante piccolo icona pericolo" data-azione="cantiere-prodotto-elimina" data-id="${c.id}" data-prod="${d.id}" aria-label="Elimina">${icona('elimina','piccola')}</button></li>`)}</ul>`:html`<p class="secondario">Nessuna dichiarazione ancora. Compilale dai modelli: si riempiono con i dati di questo cantiere.</p>`}</div>
  <div class="scheda"><h3>${icona('documenti')}Documenti archiviati del cantiere <span class="azioni"><button class="pulsante piccolo" data-azione="documento-nuovo" data-soggetto-tipo="cantiere" data-soggetto-id="${c.id}">${icona('piu','piccola')}Aggiungi</button></span></h3>
    <div class="zona-drop mb" data-azione="documento-nuovo" data-soggetto-tipo="cantiere" data-soggetto-id="${c.id}" data-drop-soggetto="cantiere:${c.id}">${icona('carica')}Trascina qui i documenti ricevuti per questo cantiere</div>
    ${docsCant.length?tabella({righe:docsCant,onRiga:d=>apriDocumento(d.id),colonne:[{chiave:'t',titolo:'Documento',principale:true,formatta:d=>html`<b>${(tipoDoc(d.tipoId)||{}).nome||''}</b>${d.titolo?html`<br><span class="piccolo secondario">${d.titolo}</span>`:''}`},{chiave:'d',titolo:'Data',formatta:d=>fData(d.dataEmissione)},{chiave:'f',titolo:'File',formatta:d=>(d.file||[]).length?icona('allega','piccola'):''}]}):''}</div>`;
}
AZIONI['cantiere-psc-carica']=async d=>{const fs=await scegliFile({multipli:false,accetta:'.pdf'});if(!fs.length)return;const es=await acquisisciFile(fs[0],{});esegui('Caricato PSC',s=>{const c=s.cantieri.find(x=>x.id===d.id);c.psc.fileId=es.rec.id});avviso('PSC archiviato. Nella procedura POS potrai estrarne i dati.')};
AZIONI['cantiere-prodotto-file']=async d=>{const fs=await scegliFile({multipli:false,accetta:'.pdf,.docx,image/*'});if(!fs.length)return;const es=await acquisisciFile(fs[0],{});esegui('Allegato file al documento del cantiere',s=>{const c=s.cantieri.find(x=>x.id===d.id);const p=c.documentiProdotti.find(x=>x.id===d.prod);p.fileId=es.rec.id})};
AZIONI['cantiere-prodotto-nuovo']=async d=>{const v=await dialogoModulo('Registra documento prodotto',[{nome:'tipo',etichetta:'Tipo',tipo:'select',vuoto:false,opzioni:['POS','PSC','Dichiarazione','Denuncia apertura cantiere','Nomina','Verbale','Altro'].map(x=>({v:x,t:x}))},{nome:'titolo',etichetta:'Titolo',obbligatorio:true},{nome:'data',etichetta:'Data',tipo:'data',obbligatorio:true},{nome:'revisione',etichetta:'Revisione',tipo:'numero',decimali:0},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}],{data:oggi()});if(!v)return;esegui('Registrato documento '+v.titolo,s=>{s.cantieri.find(x=>x.id===d.id).documentiProdotti.push(Object.assign({id:nuovoId('dp'),fileId:null},v))})};
AZIONI['cantiere-prodotto-elimina']=async d=>{if(!(await conferma('Eliminare questo documento dal cantiere?',{pericolo:true})))return;esegui('Eliminato documento del cantiere',s=>{const c=s.cantieri.find(x=>x.id===d.id);c.documentiProdotti=c.documentiProdotti.filter(x=>x.id!==d.prod);cestinaFileOrfani(s)})};

function schedaCantiereChecklist(c,ck){
  const gruppi=raggruppa(ck.voci,v=>v.gruppo);
  return html`<div class="scheda"><h3>Checklist della committenza <span class="azioni"><button class="pulsante piccolo" data-azione="checklist-lista-incolla" data-id="${c.id}">${icona('incolla','piccola')}Incolla lista ricevuta</button><button class="pulsante piccolo" data-azione="checklist-voce-nuova" data-id="${c.id}">${icona('piu','piccola')}Voce</button><button class="pulsante piccolo" data-azione="checklist-copia" data-id="${c.id}">${icona('copia','piccola')}Copia testo</button><button class="pulsante piccolo" data-azione="checklist-stampa" data-id="${c.id}">${icona('stampa','piccola')}Stampa</button></span></h3>
  <p class="secondario piccolo">Generata dai documenti d'impresa obbligatori e dai documenti obbligatori per ciascun operaio assegnato, più sicurezza e dichiarazioni. <b>${ck.pronti}</b> su ${ck.totale} pronti.</p>
  <div class="progresso mb"><div style="width:${ck.totale?Math.round(ck.pronti/ck.totale*100):0}%"></div></div>
  ${Array.from(gruppi.entries()).map(([g,voci])=>html`<div class="sezione-titolo">${g} · ${voci.filter(v=>v.stato==='ok').length}/${voci.filter(v=>v.stato!=='na').length}</div>${voci.map(v=>{const st=STATI_CHECKLIST[v.stato];return html`<div class="checklist-voce"><span class="pillola ${st.cl}">${icona(st.ic,'piccola')}${st.t}</span><span><b>${v.nome}</b> <span class="secondario">· ${v.soggetto}</span>${v.info&&v.info.data?html` <span class="piccolo ${v.info.stato==='scaduto'?'da-compilare':'secondario'}">${v.info.stato==='scaduto'?'scaduto il':'scade il'} ${fData(v.info.data)}</span>`:''}${v.motivo?html`<br><span class="piccolo secondario">${v.motivo}</span>`:''}</span><span>${v.doc?html`<button class="pulsante piccolo" data-azione="doc-apri" data-id="${v.doc.id}">${icona('occhio','piccola')}</button>`:v.azione==='pos'?html`<a class="pulsante piccolo" href="#/cantieri/${c.id}/pos">Genera</a>`:v.azione&&v.azione.startsWith('dichiarazione:')?html`<button class="pulsante piccolo" data-azione="dichiarazione-compila" data-cantiere="${c.id}" data-modello="${v.azione.split(':')[1]}">Compila</button>`:v.persona?html`<a class="pulsante piccolo" href="#/operai/${v.persona.id}">Vai</a>`:''}${v.extra?html`<button class="pulsante piccolo icona pericolo" data-azione="checklist-voce-elimina" data-id="${c.id}" data-voce="${v.id}" aria-label="Togli">${icona('chiudi','piccola')}</button>`:''}</span></div>`})}`)}</div>`;
}
AZIONI['doc-apri']=d=>apriDocumento(d.id);
AZIONI['checklist-voce-nuova']=async d=>{const v=await dialogoModulo('Voce della checklist',[{nome:'nome',etichetta:'Documento richiesto',obbligatorio:true,largo:true},{nome:'tipoId',etichetta:'Corrisponde al tipo',tipo:'select',opzioni:stato.tipiDocumento.map(t=>({v:t.id,t:t.nome}))},{nome:'soggetto',etichetta:'Soggetto'},{nome:'stato',etichetta:'Stato',tipo:'select',vuoto:false,opzioni:Object.entries(STATI_CHECKLIST).map(([v,x])=>({v,t:x.t}))},{nome:'motivo',etichetta:'Nota / motivo',largo:true}],{stato:'richiedere'});if(!v)return;esegui('Aggiunta voce checklist',s=>{s.cantieri.find(x=>x.id===d.id).checklistExtra.push(Object.assign({id:nuovoId('ck')},v))})};
AZIONI['checklist-voce-elimina']=d=>esegui('Tolta voce checklist',s=>{const c=s.cantieri.find(x=>x.id===d.id);c.checklistExtra=c.checklistExtra.filter(x=>x.id!==d.voce)});
// Riconoscimento della lista richiesta dalla committenza: ogni riga → tipo di documento tramite sinonimi
function riconosciVoceLista(riga){
  const n=normalizzaTesto(riga); if(!n) return null;
  let best=null;
  for(const t of stato.tipiDocumento){ for(const sin of [t.nome,...(t.sinonimi||[])]){ const ns=normalizzaTesto(sin); if(ns&&n.includes(ns)&&(!best||ns.length>best.len)) best={tipo:t,len:ns.length}; } }
  const extra=[[/antimafia/,'antimafia'],[/art\.? ?16|allegato xvii|all\. ?xvii|requisiti tecnico/,'requisiti_art16'],[/art\.? ?14/,'art14'],[/art\.? ?97/,'art97'],[/art\.? ?3 ?c(omma)?\.? ?8|494/,'art3c8'],[/deposito.*dvr|dvr.*deposit/,'deposito_dvr'],[/soggetti coinvolti/,'soggetti_coinvolti'],[/elenco.*(dipendenti|lavoratori|personale)/,'elenco_dipendenti'],[/dico|conformit.*impianto/,'dico']];
  let modello=null;for(const [re,id] of extra) if(re.test(n)){modello=id;break}
  return {tipo:best?best.tipo:null,modello,testo:riga.trim()};
}
AZIONI['checklist-lista-incolla']=async d=>{
  const testo=await chiediTesto('Incolla la lista ricevuta dalla committenza',{multiriga:true,aiuto:'Una richiesta per riga. Riconosco i sinonimi: "idoneità sanitaria" = visita medica, "formazione generale e specifica" = corsi sicurezza, "UNILAV" = comunicazione di assunzione, "DICO" = conformità impianto elettrico, "patente a crediti" = patente edilizia.',ok:'Analizza'});
  if(!testo) return;
  const righe=testo.split(/\n|;|•/).map(x=>x.replace(/^[\s\-–*\d.)]+/,'').trim()).filter(x=>x.length>2);
  const ric=righe.map(riconosciVoceLista).filter(Boolean);
  const c=cantiere(d.id);const ck=checklistCantiere(c);
  const corpo=html`<p>${ric.length} richieste lette. Per ciascuna: come l'ho interpretata e se è già coperta dalla checklist.</p><table class="tabella densa"><thead><tr><th>Richiesta</th><th>Interpretazione</th><th>Coperta</th><th>Aggiungi</th></tr></thead><tbody>${ric.map((x,i)=>{const cop=x.tipo?ck.voci.find(v=>v.tipo&&v.tipo.id===x.tipo.id):x.modello?ck.voci.find(v=>v.modelloId===x.modello):null;return html`<tr><td>${x.testo}</td><td>${x.tipo?html`<span class="pillola valido">${x.tipo.nome}</span>`:x.modello?html`<span class="pillola valido">Dichiarazione: ${(stato.modelli.dichiarazioni.find(m=>m.id===x.modello)||{}).nome||x.modello}</span>`:html`<span class="pillola pianificare">non riconosciuta</span>`}</td><td>${cop?html`<span class="pillola ${STATI_CHECKLIST[cop.stato].cl}">${STATI_CHECKLIST[cop.stato].t}</span>`:html`<span class="secondario">no</span>`}</td><td><input type="checkbox" data-agg="${i}" ${cop?'':'checked'}></td></tr>`})}</tbody></table>`;
  const scelte=await dialogo({titolo:'Lista della committenza',largo:true,corpo,pulsanti:[{testo:'Annulla',valore:null},{testo:'Aggiungi le voci selezionate',classe:'primario',primario:true,fn:v=>tutti('[data-agg]:checked',v).map(x=>ric[+x.dataset.agg])}]});
  if(!scelte||!scelte.length) return;
  esegui('Aggiunte '+scelte.length+' voci dalla lista della committenza',s=>{const cc=s.cantieri.find(x=>x.id===d.id);for(const x of scelte)cc.checklistExtra.push({id:nuovoId('ck'),nome:x.testo,tipoId:x.tipo?x.tipo.id:null,soggetto:x.tipo&&x.tipo.ambito==='persona'?'ogni operaio':'',stato:x.modello?'preparare':'richiedere',motivo:x.modello?'dichiarazione da compilare':(x.tipo?'':'voce non riconosciuta: da valutare')})});
};
AZIONI['checklist-copia']=d=>{copiaNegliAppunti(checklistTesto(cantiere(d.id))).then(()=>avviso('Checklist copiata: incollala nella mail'))};
function checklistTesto(c){const ck=checklistCantiere(c);const g=raggruppa(ck.voci,v=>v.gruppo);let t=`Checklist documenti — ${c.nome}\nCommittente: ${nomeCliente(c.committenteId)||'[DA COMPILARE]'} · Impresa affidataria: ${nomeCliente(c.affidatariaId)||'[DA COMPILARE]'}\nAggiornata al ${fData(oggi())} — ${ck.pronti} su ${ck.totale} pronti\n\n`;for(const [gr,voci] of g){t+=`${gr.toUpperCase()}\n`;for(const v of voci){t+=`  [${v.stato==='ok'?'x':' '}] ${v.nome} — ${v.soggetto} — ${STATI_CHECKLIST[v.stato].t}${v.info&&v.info.data?' ('+(v.info.stato==='scaduto'?'scaduto il ':'scade il ')+fData(v.info.data)+')':''}${v.motivo?' — '+v.motivo:''}\n`}t+='\n'}return t}
function schedaCantiereEconomia(c){
  const eco=economiaCantiere(c.id,stato.movimenti);
  return html`<div class="griglia tre mb"><div class="indicatore" style="cursor:default"><span class="etichetta">Entrate (imponibile)</span><span class="valore md">${fEuro(eco.entrate,0)}</span></div><div class="indicatore" style="cursor:default"><span class="etichetta">Uscite (imponibile)</span><span class="valore md">${fEuro(eco.uscite,0)}</span></div><div class="indicatore ${eco.margine<0?'critico':'ok'}" style="cursor:default"><span class="etichetta">Margine</span><span class="valore md">${fEuro(eco.margine,0)}</span><span class="nota">${eco.marginePct!=null?fPct(eco.marginePct):''}${c.importoContratto?' · contratto '+fEuro(c.importoContratto,0):''}</span></div></div>
  <div class="scheda"><h3>Movimenti collegati <span class="azioni"><button class="pulsante piccolo" data-azione="movimento-nuovo" data-cantiere="${c.id}">${icona('piu','piccola')}Nuovo movimento</button></span></h3>${eco.collegati.length?tabella({righe:eco.collegati,onRiga:x=>dialogoMovimento(x.movimento),colonne:[{chiave:'data',titolo:'Data',principale:true,valore:x=>x.movimento.data,formatta:x=>fData(x.movimento.data)},{chiave:'tipo',titolo:'Tipo',formatta:x=>({entrata:'Entrata',uscita:'Uscita',nota_credito:'Nota di credito'})[x.movimento.tipo]},{chiave:'num',titolo:'N. fattura',formatta:x=>x.movimento.numero||''},{chiave:'cp',titolo:'Controparte',formatta:x=>x.movimento.controparte||nomeCliente(x.movimento.clienteId)},{chiave:'cat',titolo:'Categoria',formatta:x=>CATEGORIE_MOVIMENTO[x.movimento.categoria]||''},{chiave:'q',titolo:'Quota cantiere',num:true,valore:x=>x.quota,formatta:x=>html`${fEuro(x.quota)}${x.movimento.quote&&x.movimento.quote.length>1?html` <span class="piccolo secondario">su ${fEuro(x.movimento.imponibile)}</span>`:''}`}]}):html`<p class="secondario">Nessun movimento assegnato a questo cantiere. Le fatture si registrano in Budget e si assegnano (anche in quota) ai cantieri.</p>`}<p class="piccolo secondario mt">Il cantiere appartiene interamente all'anno in cui è iniziato (${c.anno}); le spese generali non entrano nel margine.</p></div>`;
}
function schedaCantiereDiario(c){
  const eventi=[...(c.diario||[]).map(e=>({data:e.data,testo:e.testo,tipo:'nota'})),...(c.invii||[]).map(i=>({data:i.data.slice(0,10),testo:`Inviato pacchetto a ${i.destinatario||'[destinatario?]'} (${i.mezzo||''}): ${i.contenuto.length} documenti${i.mancanti.length?', mancanti: '+i.mancanti.join(', '):''}`,tipo:'invio',invio:i}))].sort((a,b)=>a.data<b.data?1:-1);
  return html`<div class="scheda"><h3>Diario e invii <span class="azioni"><button class="pulsante piccolo" data-azione="cantiere-diario-nuovo" data-id="${c.id}">${icona('piu','piccola')}Nota</button></span></h3>${eventi.length?html`<ul class="timeline">${eventi.map(e=>html`<li><div class="quando">${fData(e.data)} · ${e.tipo==='invio'?'invio':'nota'}</div><div>${e.testo}${e.invio?html` <button class="pulsante piccolo" data-azione="invio-dettaglio" data-cantiere="${c.id}" data-id="${e.invio.id}">Dettaglio</button>`:''}</div></li>`)}</ul>`:html`<p class="secondario">Nessun evento. Gli invii del pacchetto committenza si registrano qui da soli.</p>`}</div>`;
}
AZIONI['cantiere-diario-nuovo']=async d=>{const v=await dialogoModulo('Nota nel diario',[{nome:'data',etichetta:'Data',tipo:'data',obbligatorio:true},{nome:'testo',etichetta:'Testo',tipo:'textarea',obbligatorio:true,largo:true}],{data:oggi()});if(!v)return;esegui('Nota nel diario',s=>{s.cantieri.find(x=>x.id===d.id).diario.push(v)})};
AZIONI['invio-dettaglio']=d=>{const c=cantiere(d.cantiere);const i=c.invii.find(x=>x.id===d.id);dialogo({titolo:'Invio del '+fDataOra(i.data),largo:true,corpo:html`<p><b>Destinatario:</b> ${i.destinatario||'—'} · <b>Mezzo:</b> ${i.mezzo||'—'}${i.note?html`<br><b>Note:</b> ${i.note}`:''}</p><div class="sezione-titolo">Contenuto (${i.contenuto.length})</div><ul class="piccolo">${i.contenuto.map(x=>html`<li>${x}</li>`)}</ul>${i.mancanti.length?html`<div class="sezione-titolo">Mancava al momento dell'invio</div><ul class="piccolo da-compilare">${i.mancanti.map(x=>html`<li>${x}</li>`)}</ul>`:''}${i.forzati&&i.forzati.length?html`<div class="sezione-titolo">Inclusi forzando</div><ul class="piccolo">${i.forzati.map(x=>html`<li>${x}</li>`)}</ul>`:''}`,pulsanti:[{testo:'Chiudi',valore:true}]})};

// ---- dialogo cantiere ----
function dialogoCantiere(c){
  const nuovo=!c; c=c||{anno:new Date().getFullYear(),stato:'attivo',indirizzo:{},lavorazioni:[],operai:[],psc:{},denuncia:{}};
  const clientiOpz=r=>stato.clienti.filter(x=>(x.ruoli||[]).includes(r)||!x.ruoli.length).map(x=>({v:x.id,t:x.ragioneSociale})).concat(stato.clienti.filter(x=>!(x.ruoli||[]).includes(r)&&x.ruoli.length).map(x=>({v:x.id,t:x.ragioneSociale+' ('+x.ruoli.map(y=>RUOLI_CLIENTE[y]).join(', ')+')'})));
  const profOpz=r=>stato.professionisti.map(p=>({v:p.id,t:[p.titolo,p.nome].filter(Boolean).join(' ')+((p.ruoli||[]).includes(r)?'':' ('+(p.ruoli||[]).map(x=>RUOLI_PROFESSIONISTA[x]||x).join(', ')+')')}));
  const qualificati=personeQualificatePreposto();
  const campi=[
    {nome:'nome',etichetta:'Nome del cantiere',obbligatorio:true},{nome:'anno',etichetta:'Anno',tipo:'numero',decimali:0,obbligatorio:true,aiuto:'Anno di inizio: il cantiere appartiene interamente a questo anno'},{nome:'stato',etichetta:'Stato',tipo:'select',vuoto:false,opzioni:Object.entries(STATI_CANTIERE).map(([v,t])=>({v,t}))},
    {nome:'descrizione',etichetta:'Descrizione dell\'opera',tipo:'textarea',largo:true},
    {nome:'indirizzo.via',etichetta:'Indirizzo',largo:true},{nome:'indirizzo.comune',etichetta:'Comune'},{nome:'indirizzo.provincia',etichetta:'Provincia',maiuscolo:true},{nome:'indirizzo.cap',etichetta:'CAP'},
    {nome:'committenteId',etichetta:'Committente',tipo:'select',opzioni:clientiOpz('committente')},{nome:'affidatariaId',etichetta:'Impresa affidataria',tipo:'select',opzioni:clientiOpz('affidataria'),aiuto:'Chi ha subappaltato a Pavimass'},
    {nome:'progettistaId',etichetta:'Progettista',tipo:'select',opzioni:profOpz('progettista')},{nome:'direttoreLavoriId',etichetta:'Direttore dei lavori',tipo:'select',opzioni:profOpz('direttoreLavori')},{nome:'cseId',etichetta:'Coordinatore in esecuzione (CSE)',tipo:'select',opzioni:profOpz('cse')},{nome:'cspId',etichetta:'Coordinatore in progettazione (CSP)',tipo:'select',opzioni:profOpz('csp')},
    {nome:'dataInizio',etichetta:'Inizio lavori Pavimass',tipo:'data'},{nome:'dataFine',etichetta:'Fine lavori Pavimass',tipo:'data'},{nome:'periodoTesto',etichetta:'Periodo (se le date non sono note)',segnaposto:'es. luglio 2026'},
    {nome:'lavorazioni',etichetta:'Lavorazioni previste',tipo:'chip',largo:true,opzioni:stato.lavorazioni.map(l=>({v:String(l.id),t:l.breve}))},
    {nome:'uominiGiorno',etichetta:'Entità presunta uomini/giorno',tipo:'numero',decimali:0,aiuto:'Operai Pavimass in cantiere: non si prende dal PSC'},{nome:'orari',etichetta:'Orari di lavoro',segnaposto:'lun-ven 08:00–12:00 / 13:00–17:00'},{nome:'importoContratto',etichetta:'Importo di contratto',tipo:'euro'},
    {nome:'operai',etichetta:'Operai assegnati',tipo:'chip',largo:true,opzioni:stato.persone.filter(p=>p.attivo&&p.inCantiere!==false).map(p=>{const i=idoneita(p);return {v:p.id,t:nomePersona(p)+(i.idonea?'':' ⚠')}}),aiuto:'⚠ = documenti scaduti o mancanti'},
    {nome:'prepostoId',etichetta:'Preposto',tipo:'select',opzioni:qualificati.map(p=>({v:p.id,t:nomePersona(p)})),vuotoTesto:qualificati.length?'— scegli —':'nessuno con corso preposto valido',aiuto:qualificati.length?'Solo chi ha il corso preposto in corso di validità':'Nessuna persona qualifica: serve un corso preposto valido'},
    {nome:'psc.data',etichetta:'Data PSC',tipo:'data'},{nome:'psc.periodoTesto',etichetta:'PSC: periodo (se senza data)'},{nome:'psc.redattore',etichetta:'PSC: redattore'},{nome:'psc.prescrizioni',etichetta:'PSC: prescrizioni particolari',tipo:'textarea',largo:true},
    {nome:'denuncia.data',etichetta:'Denuncia apertura: data',tipo:'data'},{nome:'denuncia.dal',etichetta:'Denuncia: dal',tipo:'data'},{nome:'denuncia.al',etichetta:'Denuncia: al',tipo:'data'},{nome:'denuncia.importoComplessivo',etichetta:'Importo complessivo lavori',tipo:'euro'},{nome:'denuncia.importoPavimass',etichetta:'Importo Pavimass',tipo:'euro'},
    {nome:'note',etichetta:'Note',tipo:'textarea',largo:true},
  ];
  const val=clona(c);val.lavorazioni=(c.lavorazioni||[]).map(String);
  return dialogoModulo(nuovo?'Nuovo cantiere':'Modifica '+c.nome,campi,val,{validaTutto:v=>{if(v.dataInizio&&v.dataFine&&v.dataFine<v.dataInizio)return 'La fine lavori precede l\'inizio';if(v.denuncia.dal&&v.denuncia.al&&v.denuncia.al<v.denuncia.dal)return 'Il periodo della denuncia è incoerente';if(v.prepostoId&&!(v.operai||[]).includes(v.prepostoId))return 'Il preposto deve essere fra gli operai assegnati';return null}}).then(v=>{
    if(!v) return;
    v.lavorazioni=(v.lavorazioni||[]).map(Number);v.anno=+v.anno;
    if(nuovo){const id=nuovoId('ca');esegui('Nuovo cantiere '+v.nome,s=>{s.cantieri.push(Object.assign({id,documentiProdotti:[],checklistExtra:[],invii:[],diario:[],creato:new Date().toISOString()},v))});vai('cantieri/'+id)}
    else esegui('Modificato cantiere '+v.nome,s=>{const x=s.cantieri.find(x=>x.id===c.id);Object.assign(x,v);x.psc=Object.assign({},c.psc,v.psc);x.denuncia=Object.assign({},c.denuncia,v.denuncia)});
  });
}
