// ---------------------------------------------------------------------
// CANTIERI: elenco per stato, diagramma temporale, scheda con le sei figure, squadra, documenti,
// checklist della committenza, economia, diario e invii.
// ---------------------------------------------------------------------
const FIGURE_CANTIERE=[
  {chiave:'committenteId',ruolo:'Committente',tipo:'cliente',ruoloCliente:'committente'},
  {chiave:'affidatariaId',ruolo:'Impresa affidataria',tipo:'cliente',ruoloCliente:'affidataria',aiuto:'Chi ha subappaltato direttamente all’impresa: non coincide col committente finale'},
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
// Quando la committenza ha mandato la sua lista, la checklist si restringe a quello che ha chiesto:
// prima elencava sempre tutto, e su un cantiere dove chiedono quattro carte ne comparivano quaranta.
// Non si tolgono mai i documenti che bloccano l'ingresso in cantiere e la sicurezza del cantiere:
// quelli sono obbligo di legge, non una richiesta del cliente.
function checklistCantiere(c,opz){
  const voci=[];const oggiIso=oggi();const s=soglie();
  const lista=(!(opz&&opz.tutto)&&c.listaRicevuta)?c.listaRicevuta:null;
  const chiesto=(v)=>{
    if(!lista) return true;
    if(v.bloccante||v.gruppo==='Sicurezza cantiere'||v.gruppo==='Richieste dalla committenza') return true;
    if(v.tipo&&(lista.tipiId||[]).includes(v.tipo.id)) return true;
    if(v.modelloId&&(lista.modelliId||[]).includes(v.modelloId)) return true;
    return false;
  };
  const aggiungi=(v)=>{if(chiesto(v))voci.push(v)};
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
  return {voci,totale,pronti,urgenti,lista};
}
const STATI_CHECKLIST={ok:{t:'Presente e valido',cl:'valido',ic:'ok'},scaduto:{t:'Presente ma scaduto',cl:'scaduto',ic:'errore'},senzafile:{t:'Registrato, manca il file',cl:'scadenza',ic:'attenzione'},richiedere:{t:'Da richiedere',cl:'mancante',ic:'blocco'},preparare:{t:'Da preparare',cl:'pianificare',ic:'modifica'},na:{t:'Non applicabile',cl:'neutro',ic:'meno'}};

VISTE.cantieri=function(r){
  if(r.query.nuovo){setTimeout(()=>dialogoCantiere(null),0);history.replaceState(null,'','#/cantieri')}
  if(r.id&&r.sotto==='pos') return vistaPosWizard(cantiere(r.id),r);
  if(r.id&&r.sotto==='pacchetto') return vistaPacchetto(cantiere(r.id),r);
  if(r.id) return vistaCantiere(r.id,r);
  const vista=r.query.vista||ui.filtri.cantieriVista||'elenco';
  const aperti=stato.cantieri.filter(c=>c.stato==='attivo'||c.stato==='sospeso');
  const inRitardo=aperti.filter(c=>{const av=avanzamentoCantiere(c);return av&&av.ritardo}).length;
  const testa=html`<div class="testata"><div><div class="occhiello">Lavori</div><h1>Cantieri</h1><p class="sotto">${plurale(aperti.length,'aperto','aperti')}${inRitardo?html` · <b>${inRitardo} in ritardo</b>`:''} · ${plurale(stato.cantieri.length,'cantiere','cantieri')} in tutto</p></div><div class="azioni"><button class="pulsante primario" data-azione="cantiere-nuovo">Nuovo cantiere<span class="manopola">${icona('piu','piccola')}</span></button></div></div>`;
  const CHIUSI=['chiuso','archiviato'];
  const f=Object.assign({stato:'attivi',anno:'',comune:'',cerca:''},ui.filtri.cantieri);
  let cantieriF=stato.cantieri.slice();
  if(f.stato==='attivi') cantieriF=cantieriF.filter(c=>!CHIUSI.includes(c.stato));
  if(f.stato==='chiusi') cantieriF=cantieriF.filter(c=>CHIUSI.includes(c.stato));
  if(f.anno) cantieriF=cantieriF.filter(c=>String(c.anno)===f.anno);
  if(f.comune) cantieriF=cantieriF.filter(c=>(c.indirizzo&&c.indirizzo.comune||'')===f.comune);
  if(f.cerca){const q=normalizzaTesto(f.cerca);cantieriF=cantieriF.filter(c=>normalizzaTesto([c.nome,c.indirizzo&&c.indirizzo.comune,c.indirizzo&&c.indirizzo.via,nomeCliente(c.committenteId)+' '+nomeCliente(c.affidatariaId),c.commessa].filter(Boolean).join(' ')).includes(q))}
  const anni=[...new Set(stato.cantieri.map(c=>c.anno).filter(Boolean))].sort((a,b)=>b-a);
  const comuni=[...new Set(stato.cantieri.map(c=>c.indirizzo&&c.indirizzo.comune).filter(Boolean))].sort();
  const barra=html`<div class="strumenti-tabella"><div class="gruppo-pulsanti"><button class="pulsante ${vista==='elenco'?'attivo':''}" data-azione="cantieri-vista" data-valore="elenco">Elenco</button><button class="pulsante ${vista==='tempo'?'attivo':''}" data-azione="cantieri-vista" data-valore="tempo">Diagramma</button></div><input type="search" placeholder="Nome, località, committente" value="${f.cerca}" data-cambio="filtro-cantieri" data-campo="cerca" aria-label="Cerca cantieri"><select data-cambio="filtro-cantieri-statosel" aria-label="Stato">${[['attivi','Aperti'],['tutti','Tutti'],['chiusi','Chiusi']].map(([v,t])=>html`<option value="${v}" ${f.stato===v?'selected':''}>${t}</option>`)}</select><select data-cambio="filtro-cantieri" data-campo="anno" aria-label="Anno"><option value="">Tutti gli anni</option>${anni.map(a=>html`<option value="${a}" ${String(a)===f.anno?'selected':''}>${a}</option>`)}</select><select data-cambio="filtro-cantieri" data-campo="comune" aria-label="Località"><option value="">Tutte le località</option>${comuni.map(cm=>html`<option value="${cm}" ${cm===f.comune?'selected':''}>${cm}</option>`)}</select>${pulsanteCancellaFiltri(f.stato!=='attivi'||!!f.anno||!!f.comune||!!f.cerca,'filtro-cantieri-reset')}</div>`;
  if(!stato.cantieri.length) return html`${testa}${vuoto({icona:'cantieri',titolo:'Nessun cantiere',testo:'Crea il primo cantiere: da lì partono POS, checklist e pacchetto per la committenza.',azione:{testo:'Nuovo cantiere',azione:'cantiere-nuovo'}})}`;
  if(!cantieriF.length) return html`${testa}${barra}${vuoto({icona:'cantieri',titolo:'Nessun cantiere con questi filtri',testo:'Prova a cambiare stato, anno o località.'})}`;
  if(vista==='tempo') return html`${testa}${barra}${diagrammaCantieri(cantieriF)}`;
  const righe=cantieriF.map(c=>({c,ck:checklistCantiere(c),eco:economiaCantiere(c.id,stato.movimenti),av:avanzamentoCantiere(c)}));
  const ordineStato={attivo:0,sospeso:1,preventivo:2,chiuso:3,archiviato:4};
  righe.sort((a,b)=>(ordineStato[a.c.stato]??9)-(ordineStato[b.c.stato]??9)||(b.c.dataInizio||'').localeCompare(a.c.dataInizio||''));
  return html`${testa}${barra}<div class="guscio"><div class="scheda scheda-tabella"><table class="tabella"><thead><tr><th>Cantiere</th><th class="nascondi-telefono">Committente</th><th>Avanzamento</th><th class="nascondi-telefono">Squadra</th><th class="num nascondi-telefono">Documenti</th><th class="num">Margine</th></tr></thead><tbody>
  ${righe.map(x=>{const c=x.c;return html`<tr class="cliccabile" data-azione="vai" data-href="cantieri/${c.id}"><td><span class="chi ${coloreCantiere(c)}"><span class="puntino"></span><span><b>${c.nome}</b><span>${[c.indirizzo&&c.indirizzo.comune,(c.lavorazioni||[]).map(id=>(stato.lavorazioni.find(l=>l.id===id)||{}).breve).filter(Boolean).slice(0,2).join(', ')].filter(Boolean).join(' · ')}</span></span></span></td>
    <td class="nascondi-telefono">${nomeCliente(c.committenteId)||nomeCliente(c.affidatariaId)||html`<span class="silenzioso">—</span>`}</td>
    <td style="min-width:170px">${CHIUSI.includes(c.stato)?html`<span class="pillola">${STATI_CANTIERE[c.stato]}${c.dataFine?' il '+fDataBreve(c.dataFine):''}</span>`:x.av?html`<div class="scad-cella"><div class="traccia"><i class="${x.av.ritardo?'tardi':''}" style="width:${Math.min(100,Math.max(3,x.av.fr*100))}%"></i></div><span class="piccolo ${x.av.ritardo?'bad-t':'silenzioso'}">${x.av.ritardo?'in ritardo di '+plurale(x.av.ritardo,'giorno','giorni'):'fine '+fData(c.dataFine)}</span></div>`:html`<span class="piccolo silenzioso">${c.stato==='sospeso'?'sospeso · ':''}${c.periodoTesto||'date da scrivere'}</span>`}</td>
    <td class="nascondi-telefono"><span class="pila">${(c.operai||[]).slice(0,6).map(id=>persona(id)?avatar(persona(id),'mini'):'')}</span></td>
    <td class="num nascondi-telefono"><b>${x.ck.pronti}</b><span class="silenzioso">/${x.ck.totale}</span>${x.ck.urgenti.length?html` <span class="pillola scaduto">${x.ck.urgenti.length}</span>`:''}</td>
    <td class="num">${x.eco.entrate||x.eco.uscite?html`<b class="${x.eco.margine<0?'bad-t':''}">${fEuro(x.eco.margine,0)}</b>`:html`<span class="silenzioso">—</span>`}</td></tr>`})}</tbody></table></div></div>`;
};
// diagramma: una riga per cantiere, una barra colorata dall'inizio alla fine, la linea rossa è oggi
function diagrammaCantieri(cc){
  const conDate=cc.filter(c=>c.dataInizio);const senza=cc.filter(c=>!c.dataInizio);
  if(!conDate.length) return html`<div class="vuoto">${icona('calendario')}<h3>Nessun cantiere con le date</h3><p>Scrivi inizio e fine dei cantieri per vederli sull'asse dei mesi.</p></div>`;
  const oggiD=daIso(oggi());let min=oggiD,max=oggiD;
  for(const c of conDate){const a=daIso(c.dataInizio),b=daIso(c.dataFine||oggi());if(a<min)min=a;if(b>max)max=b}
  min=new Date(min.getFullYear(),min.getMonth(),1);max=new Date(max.getFullYear(),max.getMonth()+1,1);
  const tot=max-min;const pos=d=>Math.max(0,Math.min(100,(d-min)/tot*100));
  const mesi=[];for(let d=new Date(min);d<max;d=new Date(d.getFullYear(),d.getMonth()+1,1))mesi.push(d);
  return html`<div class="guscio"><div class="scheda"><div class="diagramma"><div class="dg-mesi"><span></span><div class="dg-asse">${mesi.map(d=>html`<span style="left:${pos(d)}%">${NOMI_MESI_BREVI[d.getMonth()]}${d.getMonth()===0||d.getTime()===min.getTime()?' '+String(d.getFullYear()).slice(2):''}</span>`)}</div></div>
    ${conDate.sort((a,b)=>a.dataInizio.localeCompare(b.dataInizio)).map(c=>{const a=pos(daIso(c.dataInizio)),b=pos(new Date(daIso(c.dataFine||oggi()).getTime()+86400000));return html`<a class="dg-riga ${coloreCantiere(c)}" href="#/cantieri/${c.id}"><span class="dg-nome"><b>${c.nome}</b><span>${(c.indirizzo&&c.indirizzo.comune)||''}</span></span><span class="dg-barre"><i class="${c.stato==='chiuso'||c.stato==='archiviato'?'chiusa':''} ${c.dataFine?'':'aperta'}" style="left:${a}%;width:${Math.max(1.2,b-a)}%">${nomeCliente(c.committenteId)||nomeCliente(c.affidatariaId)||''}</i></span></a>`})}
    <div class="dg-oggi" style="--x:${pos(oggiD)}"></div></div>
    <p class="piccolo silenzioso mt-s">La linea rossa è oggi. Le barre senza fine arrivano a oggi. Le sovrapposizioni mostrano dove la squadra è impegnata due volte.</p>
    ${senza.length?html`<div class="sezione-titolo">Senza date</div><div class="chip-lista">${senza.map(c=>html`<a class="chip" href="#/cantieri/${c.id}">${c.nome} <span class="secondario piccolo">${c.periodoTesto||'date da scrivere'}</span></a>`)}</div>`:''}</div></div>`;
}
AZIONI['filtro-cantieri-statosel']=(d,t)=>{ui.filtri.cantieri=Object.assign({stato:'attivi',anno:'',comune:'',cerca:''},ui.filtri.cantieri,{stato:t.value});render()};
AZIONI['cantieri-vista']=d=>{ui.filtri.cantieriVista=d.valore;render()};
AZIONI['filtro-cantieri-stato']=d=>{ui.filtri.cantieri=Object.assign({stato:'attivi',anno:'',comune:'',cerca:''},ui.filtri.cantieri,{stato:d.valore});render()};
AZIONI['filtro-cantieri']=(d,t)=>{ui.filtri.cantieri=Object.assign({stato:'attivi',anno:'',comune:'',cerca:''},ui.filtri.cantieri,{[d.campo]:t.value});render();if(d.campo==='cerca')setTimeout(()=>{const i=el('.strumenti-tabella input[type=search]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
document.addEventListener('input',debounce(e=>{const t=e.target;if(t.matches&&t.matches('[data-cambio="filtro-cantieri"][data-campo="cerca"]'))AZIONI['filtro-cantieri']({campo:'cerca'},t)},250));
AZIONI['filtro-cantieri-reset']=()=>{ui.filtri.cantieri={stato:'attivi',anno:'',comune:'',cerca:''};render()};
AZIONI['cantiere-nuovo']=()=>dialogoCantiere(null);
AZIONI['cantiere-modifica']=d=>dialogoCantiere(cantiere(d.id));
// Foto del cantiere: sta nell'archivio dei file (compressa), il cantiere tiene solo il riferimento e l'inquadratura
AZIONI['cantiere-foto']=async d=>{
  const fs=await scegliFile({multipli:false,accetta:'image/*'});if(!fs.length)return;
  const r=await acquisisciFile(fs[0],{compressione:{maxLato:2200,obiettivo:500*1024}});
  esegui('Foto del cantiere',s=>{const c=s.cantieri.find(x=>x.id===d.id);c.fotoId=r.rec.id;c.fotoY=50;cestinaFileOrfani(s)});
};
AZIONI['cantiere-foto-togli']=async d=>{if(!(await conferma('Togliere la foto del cantiere? Resta nel cestino per 30 giorni.')))return;esegui('Tolta la foto del cantiere',s=>{const c=s.cantieri.find(x=>x.id===d.id);delete c.fotoId;delete c.fotoY;cestinaFileOrfani(s)})};
AZIONI['cantiere-foto-inquadra']=()=>{const l=el('.testata-cantiere .inquadra');if(l)l.classList.toggle('aperta')};
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.fotoY){const h=el('.testata-cantiere');if(h)h.style.setProperty('--fy',t.value+'%')}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.fotoY)esegui('Inquadratura della foto',s=>{s.cantieri.find(x=>x.id===t.dataset.fotoY).fotoY=+t.value},{senzaRender:true,silenzioso:true})});

function vistaCantiere(id,r){
  const c=cantiere(id); if(!c) return html`<div class="vuoto">${icona('attenzione')}<h3>Cantiere non trovato</h3><a class="pulsante" href="#/cantieri">Elenco</a></div>`;
  const ling=linguettaAttiva('cantiere:'+c.id,'panoramica');
  const ck=checklistCantiere(c,{tutto:ui.filtri.checklistTutto});
  const av=avanzamentoCantiere(c);const cliente_=nomeCliente(c.committenteId);const aff=nomeCliente(c.affidatariaId);
  if(c.fotoId) dopoRender(async()=>{const u=await urlFile(c.fotoId);const t=el('.testata-cantiere');if(u&&t)t.style.setProperty('--foto',`url("${u}")`)});
  return html`<div class="testata-cantiere ${c.fotoId?'con-foto':''}" style="--fy:${c.fotoY==null?50:c.fotoY}%">
    <div class="strumenti-foto">${c.fotoId?html`<button class="pulsante piccolo" data-azione="cantiere-foto" data-id="${c.id}">${icona('fotocamera','piccola')}Cambia foto</button><button class="pulsante piccolo" data-azione="cantiere-foto-inquadra">${icona('sposta','piccola')}Inquadratura</button><label class="inquadra"><span>su</span><input type="range" min="0" max="100" value="${c.fotoY==null?50:c.fotoY}" data-foto-y="${c.id}" aria-label="Inquadratura della foto"><span>giù</span></label><button class="pulsante piccolo icona" data-azione="cantiere-foto-togli" data-id="${c.id}" title="Togli la foto" aria-label="Togli la foto">${icona('elimina','piccola')}</button>`:html`<button class="pulsante piccolo" data-azione="cantiere-foto" data-id="${c.id}">${icona('fotocamera','piccola')}Aggiungi una foto del cantiere</button>`}</div>
    ${av?html`<div class="avanzamento-cantiere"><b>${av.ritardo?'+'+av.ritardo:Math.min(100,Math.round(av.fr*100))+'%'}</b><span>${av.ritardo?'giorni di ritardo sulla fine prevista':'del tempo · '+(av.mancano?plurale(av.mancano,'giorno','giorni')+' alla fine':'ultimo giorno')}</span></div>`:''}
    <div class="chip-cantiere"><span class="pillola"><span class="punto-stato ${c.stato==='attivo'?'valido':c.stato==='sospeso'?'scadenza':''}"></span>${STATI_CANTIERE[c.stato]||c.stato}</span>${c.anno?html`<span class="pillola">${c.anno}</span>`:''}${(c.lavorazioni||[]).length?html`<span class="pillola">${plurale(c.lavorazioni.length,'lavorazione','lavorazioni')}</span>`:''}</div>
    <h1>${c.nome}</h1>
    <div class="meta-cantiere"><span>${icona('luogo','piccola')}${indirizzoTesto(c.indirizzo)||'indirizzo da scrivere'}</span>${cliente_||aff?html`<span>${icona('clienti','piccola')}${[cliente_,aff&&aff!==cliente_?aff:''].filter(Boolean).join(' · ')}</span>`:''}<span>${icona('calendario','piccola')}${c.dataInizio?fData(c.dataInizio)+' → '+(c.dataFine?fData(c.dataFine):'…'):(c.periodoTesto||'date da scrivere')}</span>
      <span class="spazio"></span><a class="pulsante piccolo" href="#/cantieri/${c.id}/pos">${icona('scudo','piccola')}Genera POS</a><a class="pulsante piccolo" href="#/cantieri/${c.id}/pacchetto">${icona('pacchetto','piccola')}Pacchetto committenza</a><button class="pulsante piccolo" data-azione="cantiere-modifica" data-id="${c.id}">${icona('modifica','piccola')}Modifica</button></div>
  </div>
  ${ck.urgenti.length?html`<div class="avviso-inline critico">${icona('errore')}<div class="corpo"><b>Prima dell'ingresso in cantiere:</b> ${ck.urgenti.map(v=>html`${v.soggetto}: ${v.nome}${v.motivo?' ('+v.motivo+')':''}`).reduce((a,b)=>html`${a} · ${b}`)}</div></div>`:''}
  ${linguette('cantiere:'+c.id,[{id:'panoramica',testo:'Panoramica'},{id:'checklist',testo:'Documenti per la committenza',contatore:ck.pronti+'/'+ck.totale,critico:ck.urgenti.length>0},{id:'pagamenti',testo:'Pagamenti del mese'},{id:'squadra',testo:'Squadra',contatore:(c.operai||[]).length||null},{id:'scheda',testo:'Dati e figure'},{id:'documenti',testo:'Sicurezza e documenti'},{id:'economia',testo:'Economia'},{id:'diario',testo:'Diario e invii'}],ling)}
  ${ling==='panoramica'?schedaCantierePanoramica(c,ck):ling==='scheda'?schedaCantiereAnagrafica(c):ling==='squadra'?schedaCantiereSquadra(c):ling==='documenti'?schedaCantiereDocumenti(c):ling==='checklist'?schedaCantiereChecklist(c,ck):ling==='pagamenti'?schedaCantierePagamenti(c):ling==='economia'?schedaCantiereEconomia(c):schedaCantiereDiario(c)}`;
}
function schedaCantierePanoramica(c,ck){
  // documenti pronti persona per persona (dalla checklist), più l'impresa
  const perPersona=new Map();for(const v of ck.voci.filter(v=>v.persona&&v.stato!=='na')){if(!perPersona.has(v.persona.id))perPersona.set(v.persona.id,{p:v.persona,voci:[]});perPersona.get(v.persona.id).voci.push(v)}
  const impresa=ck.voci.filter(v=>v.gruppo==='Impresa'&&v.stato!=='na');
  const eco=economiaCantiere(c.id,stato.movimenti);
  // ore sul cantiere negli ultimi sei mesi (anche dalla località scritta in presenze)
  const d=new Date();const mesi=[];for(let i=5;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);const anno=x.getFullYear(),mese=x.getMonth()+1;const k=chiaveMese(anno,mese);const mm=meseP(anno,mese);let ore=0;if(mm)for(const pid of Object.keys(mm.persone))for(const [g,cella] of Object.entries(mm.persone[pid].giorni||{})){const v=valoreCella(cella);if(typeof v!=='number'||!v)continue;const cc=cantiereDaCella(cella,k+'-'+pad2(+g));if(cc&&cc.id===c.id)ore+=v}mesi.push({anno,mese,ore})}
  const mx=Math.max(...mesi.map(m=>m.ore),1);
  const pips=voci=>html`<span class="pips">${voci.map(v=>html`<i class="${v.stato==='ok'?'':v.stato==='scaduto'||v.stato==='richiedere'?'b':'w'}" title="${v.nome}: ${STATI_CHECKLIST[v.stato].t}"></i>`)}</span>`;
  return html`<div class="bento">
    <div class="guscio c-7"><div class="scheda"><div class="intesta"><h2>Documenti pronti per persona</h2><a class="vai" data-azione="linguetta-cantiere" data-id="${c.id}" data-valore="checklist">Checklist ${icona('destra','piccola')}</a></div>
      ${impresa.length?html`<div class="riga-ck"><span class="icona-tipo">${icona('azienda','piccola')}</span><div><b>${nomeImpresa(true)||'Impresa'}</b><span class="${impresa.some(v=>v.stato!=='ok')?'warn-t':''}">${impresa.filter(v=>v.stato!=='ok').map(v=>v.nome).join(', ')||'tutto pronto'}</span></div>${pips(impresa)}</div>`:''}
      ${Array.from(perPersona.values()).map(({p,voci})=>{const male=voci.filter(v=>v.stato!=='ok');return html`<a class="riga-ck" href="#/operai/${p.id}">${avatar(p,'medio')}<div><b>${nomePersona(p)}</b><span class="${male.some(v=>v.stato==='scaduto'||v.bloccante)?'bad-t':male.length?'warn-t':''}">${male.length?'Manca: '+male.map(v=>v.nome+(v.motivo?' ('+v.motivo+')':'')).join(', '):'Tutto pronto'}</span></div>${pips(voci)}</a>`})}
      ${perPersona.size?'':html`<p class="secondario piccolo">Nessun operaio assegnato: aggiungilo nella linguetta Squadra.</p>`}
      <div class="riga mt"><a class="pulsante" href="#/cantieri/${c.id}/pacchetto">${icona('pacchetto','piccola')}Pacchetto per entrare in cantiere</a><button class="pulsante discreto" data-azione="linguetta-cantiere" data-id="${c.id}" data-valore="pagamenti">Pagamenti del mese</button></div></div></div>
    <div class="guscio c-5"><div class="scheda"><div class="intesta"><h2>Economia</h2><span class="piccolo silenzioso">imponibile</span><a class="vai" data-azione="linguetta-cantiere" data-id="${c.id}" data-valore="economia">Movimenti ${icona('destra','piccola')}</a></div>
      ${eco.entrate||eco.uscite?html`<div class="grande-numero ${eco.margine<0?'bad-t':''}">${eco.margine>=0?'+':''}${fEuro(eco.margine,0).replace(' €','')}<small>€ margine</small></div><div class="coppia"><div><div class="k">Fatturato</div><div class="v">${fEuro(eco.entrate,0)}</div></div><div><div class="k">Costi</div><div class="v">${fEuro(eco.uscite,0)}</div></div></div>`:html`<p class="secondario piccolo">Ancora nessun movimento collegato. Le fatture e le spese assegnate a questo cantiere in Budget compaiono qui.</p><button class="pulsante piccolo" data-azione="movimento-nuovo" data-cantiere="${c.id}">${icona('piu','piccola')}Nuovo movimento</button>`}</div></div>
    <div class="guscio c-12"><div class="scheda"><div class="intesta"><h2>Ore su questo cantiere</h2><span class="piccolo silenzioso">dalle presenze, anche quando c'è scritta solo la località</span></div>
      <div class="sei-mesi">${mesi.map(m=>html`<a class="mese-col" href="#/presenze/${chiaveMese(m.anno,m.mese)}"><span class="colonna-ore"><i style="height:${m.ore?Math.max(6,m.ore/mx*100):3}%"></i></span><span class="riga stretta" style="justify-content:space-between"><b>${NOMI_MESI_BREVI[m.mese-1]}</b><span class="silenzioso">${fOre(m.ore)||0} h</span></span></a>`)}</div></div></div>
  </div>`;
}
AZIONI['linguetta-cantiere']=d=>{ui.filtri['ling:cantiere:'+d.id]=d.valore;render()};
function schedaCantiereAnagrafica(c){
  const v=(x,fmt)=>valoreODaCompilare(x,fmt);
  return html`<div class="bento">
  <div class="guscio c-7"><div class="scheda"><div class="intesta"><h2>Dati del cantiere</h2><a class="vai" data-azione="cantiere-modifica" data-id="${c.id}">Modifica</a></div>
    <dl class="dati-doc"><dt>Descrizione</dt><dd>${v(c.descrizione)}</dd><dt>Indirizzo</dt><dd>${v(c.indirizzo.via)}</dd><dt>Comune</dt><dd>${v(c.indirizzo.comune)}${c.indirizzo.provincia?' ('+c.indirizzo.provincia+')':''}${c.indirizzo.cap?' · '+c.indirizzo.cap:''}</dd><dt>Inizio lavori</dt><dd>${v(c.dataInizio,fData)}</dd><dt>Fine lavori</dt><dd>${v(c.dataFine,fData)}</dd>${c.periodoTesto?html`<dt>Periodo</dt><dd>${c.periodoTesto}</dd>`:''}<dt>Importo contratto</dt><dd>${v(c.importoContratto,fEuro)}</dd><dt>Orari</dt><dd>${v(c.orari)}</dd><dt>Uomini/giorno</dt><dd>${v(c.uominiGiorno)}</dd></dl>
    <div class="sezione-titolo">PSC</div><dl class="dati-doc"><dt>Data</dt><dd>${v(c.psc.data||c.psc.periodoTesto,x=>dataValida(x)?fData(x):x)}</dd><dt>Redattore</dt><dd>${v(c.psc.redattore)}</dd>${c.psc.prescrizioni?html`<dt>Prescrizioni</dt><dd>${c.psc.prescrizioni}</dd>`:''}<dt>File</dt><dd>${c.psc.fileId?html`<button class="pulsante piccolo" data-azione="file-apri" data-id="${c.psc.fileId}">${icona('pdf','piccola')}Apri PSC</button>`:html`<button class="pulsante piccolo" data-azione="cantiere-psc-carica" data-id="${c.id}">${icona('carica','piccola')}Carica PSC</button>`}</dd></dl>
    <div class="sezione-titolo">Denuncia di apertura cantiere</div><dl class="dati-doc"><dt>Data</dt><dd>${v(c.denuncia.data,fData)}</dd><dt>Periodo</dt><dd>${c.denuncia.dal?fData(c.denuncia.dal)+' → '+fData(c.denuncia.al):daCompilare()}</dd><dt>Importo lavori</dt><dd>${v(c.denuncia.importoComplessivo,fEuro)}</dd><dt>Importo impresa</dt><dd>${v(c.denuncia.importoPavimass,fEuro)}</dd></dl>
    ${c.note?html`<div class="sezione-titolo">Note</div><p>${c.note}</p>`:''}</div></div>
  <div class="guscio c-5"><div class="scheda"><div class="intesta"><h2>Le sei figure</h2><a class="vai" data-azione="cantiere-modifica" data-id="${c.id}">Modifica</a></div><p class="piccolo silenzioso">Progettista e direttore dei lavori non sono mai facoltativi.</p>
    <div class="figure">${FIGURE_CANTIERE.map(f=>{const t=testoFigura(c,f);return html`<div class="figura"><small>${f.ruolo}</small>${t?html`<b>${t.href?html`<a href="${t.href}">${t.nome}</a>`:t.nome}</b>${t.righe.map(x=>html`<span>${x}</span>`)}`:html`<b>${daCompilare()}</b>`}</div>`})}</div></div></div>
  </div>`;
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


// La checklist mostrava tutte le voci di tutti, sempre aperte: su un cantiere con quattro operai
// sono cinquanta righe da leggere per trovare le tre che non vanno. Ora ogni gruppo (e ogni operaio)
// è una sezione che si apre e si chiude, aperta solo se c'è qualcosa che non va: quello che è a
// posto si vede da una riga sola.
const CK_PROBLEMA=v=>v.stato==='scaduto'||v.stato==='richiedere'||v.stato==='senzafile'||v.stato==='preparare';
function riassuntoChecklist(voci){
  const cont={};for(const v of voci){if(v.stato==='na')continue;cont[v.stato]=(cont[v.stato]||0)+1}
  const parti=[];
  if(cont.scaduto)parti.push({t:cont.scaduto+' scadut'+(cont.scaduto===1?'o':'i'),cl:'scaduto'});
  if(cont.richiedere)parti.push({t:cont.richiedere+' da richiedere',cl:'mancante'});
  if(cont.senzafile)parti.push({t:cont.senzafile+(cont.senzafile===1?' senza file':' senza file'),cl:'scadenza'});
  if(cont.preparare)parti.push({t:cont.preparare+' da preparare',cl:'pianificare'});
  return parti;
}
function vociChecklist(voci,c){
  return html`${voci.map(v=>{const st=STATI_CHECKLIST[v.stato];return html`<div class="checklist-voce"><span class="pillola ${st.cl}">${icona(st.ic,'piccola')}${st.t}</span><span><b>${v.nome}</b> <span class="secondario">· ${v.soggetto}</span>${v.info&&v.info.data?html` <span class="piccolo ${v.info.stato==='scaduto'?'da-compilare':'secondario'}">${v.info.stato==='scaduto'?'scaduto il':'scade il'} ${fData(v.info.data)}</span>`:''}${v.motivo?html`<br><span class="piccolo secondario">${v.motivo}</span>`:''}</span><span>${v.doc?html`<button class="pulsante piccolo" data-azione="doc-apri" data-id="${v.doc.id}">${icona('occhio','piccola')}</button>`:v.azione==='pos'?html`<a class="pulsante piccolo" href="#/cantieri/${c.id}/pos">Genera</a>`:v.azione&&v.azione.startsWith('dichiarazione:')?html`<button class="pulsante piccolo" data-azione="dichiarazione-compila" data-cantiere="${c.id}" data-modello="${v.azione.split(':')[1]}">Compila</button>`:v.persona?html`<a class="pulsante piccolo" href="#/operai/${v.persona.id}">Vai</a>`:''}${v.extra?html`<button class="pulsante piccolo icona pericolo" data-azione="checklist-voce-elimina" data-id="${c.id}" data-voce="${v.id}" aria-label="Togli">${icona('chiudi','piccola')}</button>`:''}</span></div>`})}`;
}
function sezioneChecklist(titolo,voci,c,extra){
  const parti=riassuntoChecklist(voci);
  const fatte=voci.filter(v=>v.stato==='ok').length,tot=voci.filter(v=>v.stato!=='na').length;
  return html`<details class="ck-sezione" ${parti.length?'open':''}><summary><span class="freccia">${icona('destra','piccola')}</span>${extra||''}<b class="spazio">${titolo}</b>${parti.length?html`${parti.map(x=>html`<span class="pillola ${x.cl} piccolo">${x.t}</span> `)}`:html`<span class="pillola valido piccolo">${icona('ok','piccola')}tutto in regola</span>`}<span class="conteggio">${fatte}/${tot}</span></summary><div class="ck-corpo">${vociChecklist(voci,c)}</div></details>`;
}
function rendiGruppoChecklist(gruppo,voci,c){
  if(gruppo!=='Operai') return sezioneChecklist(gruppo,voci,c);
  // un operaio per riga: si apre solo chi ha qualcosa da sistemare
  const perPersona=raggruppa(voci,v=>v.persona?v.persona.id:v.soggetto);
  const parti=riassuntoChecklist(voci);
  return html`<details class="ck-sezione grande" ${parti.length?'open':''}><summary><span class="freccia">${icona('destra','piccola')}</span><b class="spazio">Operai</b>${parti.length?parti.map(x=>html`<span class="pillola ${x.cl} piccolo">${x.t}</span> `):html`<span class="pillola valido piccolo">${icona('ok','piccola')}tutti in regola</span>`}<span class="conteggio">${perPersona.size} person${perPersona.size===1?'a':'e'}</span></summary><div class="ck-corpo">${Array.from(perPersona.entries()).map(([k,vv])=>{const p=vv[0].persona;return sezioneChecklist(p?nomePersona(p):String(k),vv,c,p?avatar(p):'')})}</div></details>`;
}
function schedaCantiereChecklist(c,ck){
  const gruppi=raggruppa(ck.voci,v=>v.gruppo);
  return html`<div class="scheda"><h3>Checklist della committenza <span class="azioni"><button class="pulsante piccolo" data-azione="checklist-lista-incolla" data-id="${c.id}">${icona('incolla','piccola')}Incolla lista ricevuta</button><button class="pulsante piccolo" data-azione="checklist-lista-carica" data-id="${c.id}" title="Carica un PDF o un file di testo con la lista">${icona('carica','piccola')}Carica lista (PDF)</button><button class="pulsante piccolo" data-azione="checklist-voce-nuova" data-id="${c.id}">${icona('piu','piccola')}Voce</button><button class="pulsante piccolo" data-azione="checklist-copia" data-id="${c.id}">${icona('copia','piccola')}Copia testo</button><button class="pulsante piccolo" data-azione="checklist-stampa" data-id="${c.id}">${icona('stampa','piccola')}Stampa</button></span></h3>
  ${c.listaRicevuta?html`<div class="avviso-inline">${icona('info')}<div class="corpo">Ristretta alla lista ricevuta dalla committenza il ${fData(c.listaRicevuta.data)} (${plurale(c.listaRicevuta.richieste,'richiesta','richieste')}). Restano comunque i documenti che bloccano l'ingresso in cantiere e la sicurezza del cantiere.<div class="mt-s"><button class="pulsante piccolo" data-azione="checklist-tutto">${ui.filtri.checklistTutto?'Torna alla lista della committenza':'Mostra tutti i documenti'}</button> <button class="pulsante piccolo pericolo" data-azione="checklist-lista-togli" data-id="${c.id}">Togli la lista</button></div></div></div>`:''}
  <p class="secondario piccolo">${c.listaRicevuta&&!ui.filtri.checklistTutto?'Solo i documenti chiesti da questa committenza.':'Generata dai documenti d\'impresa obbligatori e dai documenti obbligatori per ciascun operaio assegnato, più sicurezza e dichiarazioni.'} <b>${ck.pronti}</b> su ${ck.totale} pronti.</p>
  <div class="progresso mb"><div style="width:${ck.totale?Math.round(ck.pronti/ck.totale*100):0}%"></div></div>
  ${Array.from(gruppi.entries()).map(([g,voci])=>rendiGruppoChecklist(g,voci,c))}</div>`;
}
AZIONI['doc-apri']=d=>apriDocumento(d.id);
AZIONI['checklist-tutto']=()=>{ui.filtri.checklistTutto=!ui.filtri.checklistTutto;render()};
AZIONI['checklist-lista-togli']=async d=>{if(!(await conferma('Togliere la lista della committenza? La checklist torna a mostrare tutti i documenti.',{pericolo:true})))return;esegui('Tolta la lista della committenza',s=>{delete s.cantieri.find(x=>x.id===d.id).listaRicevuta})};
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
  await elaboraListaCommittenza(d.id,testo);
};
AZIONI['checklist-lista-carica']=async d=>{
  const fs=await scegliFile({multipli:false,accetta:'.pdf,.txt'});
  if(!fs.length) return;
  const f=fs[0];
  let testo='';
  try{
    if(/\.pdf$/i.test(f.name)) testo=(await estraiTestoPdf(f)).testo;
    else testo=await leggiComeTesto(f);
  }catch(e){ return segnalaErrore(e,'Non sono riuscito a leggere il file'); }
  if(!testo||testo.replace(/\s/g,'').length<5) return avviso('Non ho trovato testo leggibile in questo file (se è una scansione, incolla la lista a mano)',{tipo:'errore'});
  await elaboraListaCommittenza(d.id,testo);
};
async function elaboraListaCommittenza(cantiereId,testo){
  const righe=testo.split(/\n|;|•/).map(x=>x.replace(/^[\s\-–*\d.)]+/,'').trim()).filter(x=>x.length>2);
  const ric=righe.map(riconosciVoceLista).filter(Boolean);
  const c=cantiere(cantiereId);const ck=checklistCantiere(c,{tutto:true});
  const corpo=html`<p>${ric.length} richieste lette. Per ciascuna: come l'ho interpretata e se è già coperta dalla checklist.</p><table class="tabella densa"><thead><tr><th>Richiesta</th><th>Interpretazione</th><th>Coperta</th><th>Aggiungi</th></tr></thead><tbody>${ric.map((x,i)=>{const cop=x.tipo?ck.voci.find(v=>v.tipo&&v.tipo.id===x.tipo.id):x.modello?ck.voci.find(v=>v.modelloId===x.modello):null;return html`<tr><td>${x.testo}</td><td>${x.tipo?html`<span class="pillola valido">${x.tipo.nome}</span>`:x.modello?html`<span class="pillola valido">Dichiarazione: ${(stato.modelli.dichiarazioni.find(m=>m.id===x.modello)||{}).nome||x.modello}</span>`:html`<span class="pillola pianificare">non riconosciuta</span>`}</td><td>${cop?html`<span class="pillola ${STATI_CHECKLIST[cop.stato].cl}">${STATI_CHECKLIST[cop.stato].t}</span>`:html`<span class="secondario">no</span>`}</td><td><input type="checkbox" data-agg="${i}" ${cop?'':'checked'}></td></tr>`})}</tbody></table>`;
  const scelte=await dialogo({titolo:'Lista della committenza',largo:true,corpo,pulsanti:[{testo:'Annulla',valore:null},{testo:'Aggiungi le voci selezionate',classe:'primario',primario:true,fn:v=>tutti('[data-agg]:checked',v).map(x=>ric[+x.dataset.agg])}]});
  if(!scelte||!scelte.length) return;
  // si registra tutto quello che la committenza ha chiesto (non solo le voci aggiunte a mano):
  // da qui in poi la checklist di questo cantiere mostra solo queste richieste
  const tipiId=unici(ric.map(x=>x.tipo&&x.tipo.id).filter(Boolean));
  const modelliId=unici(ric.map(x=>x.modello).filter(Boolean));
  esegui('Aggiunte '+scelte.length+' voci dalla lista della committenza',s=>{const cc=s.cantieri.find(x=>x.id===cantiereId);cc.listaRicevuta={data:oggi(),tipiId,modelliId,richieste:ric.length};for(const x of scelte)cc.checklistExtra.push({id:nuovoId('ck'),nome:x.testo,tipoId:x.tipo?x.tipo.id:null,soggetto:x.tipo&&x.tipo.ambito==='persona'?'ogni operaio':'',stato:x.modello?'preparare':'richiedere',motivo:x.modello?'dichiarazione da compilare':(x.tipo?'':'voce non riconosciuta: da valutare')})});
}
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
    {nome:'committenteId',etichetta:'Committente',tipo:'select',opzioni:clientiOpz('committente')},{nome:'affidatariaId',etichetta:'Impresa affidataria',tipo:'select',opzioni:clientiOpz('affidataria'),aiuto:'Chi ha subappaltato all’impresa'},
    {nome:'progettistaId',etichetta:'Progettista',tipo:'select',opzioni:profOpz('progettista')},{nome:'direttoreLavoriId',etichetta:'Direttore dei lavori',tipo:'select',opzioni:profOpz('direttoreLavori')},{nome:'cseId',etichetta:'Coordinatore in esecuzione (CSE)',tipo:'select',opzioni:profOpz('cse')},{nome:'cspId',etichetta:'Coordinatore in progettazione (CSP)',tipo:'select',opzioni:profOpz('csp')},
    {nome:'dataInizio',etichetta:'Inizio lavori',tipo:'data'},{nome:'dataFine',etichetta:'Fine lavori',tipo:'data'},{nome:'periodoTesto',etichetta:'Periodo (se le date non sono note)',segnaposto:'es. luglio 2026'},
    {nome:'lavorazioni',etichetta:'Lavorazioni previste',tipo:'chip',largo:true,opzioni:stato.lavorazioni.map(l=>({v:String(l.id),t:l.breve}))},
    {nome:'uominiGiorno',etichetta:'Entità presunta uomini/giorno',tipo:'numero',decimali:0,aiuto:'Operai dell'+String.fromCharCode(39)+'impresaass in cantiere: non si prende dal PSC'},{nome:'orari',etichetta:'Orari di lavoro',segnaposto:'lun-ven 08:00–12:00 / 13:00–17:00'},{nome:'importoContratto',etichetta:'Importo di contratto',tipo:'euro'},
    {nome:'operai',etichetta:'Operai assegnati',tipo:'chip',largo:true,opzioni:stato.persone.filter(p=>p.attivo&&p.inCantiere!==false).map(p=>{const i=idoneita(p);return {v:p.id,t:nomePersona(p)+(i.idonea?'':' ⚠')}}),aiuto:'⚠ = documenti scaduti o mancanti'},
    {nome:'prepostoId',etichetta:'Preposto',tipo:'select',opzioni:qualificati.map(p=>({v:p.id,t:nomePersona(p)})),vuotoTesto:qualificati.length?'— scegli —':'nessuno con corso preposto valido',aiuto:qualificati.length?'Solo chi ha il corso preposto in corso di validità':'Nessuna persona qualifica: serve un corso preposto valido'},
    {nome:'psc.data',etichetta:'Data PSC',tipo:'data'},{nome:'psc.periodoTesto',etichetta:'PSC: periodo (se senza data)'},{nome:'psc.redattore',etichetta:'PSC: redattore'},{nome:'psc.prescrizioni',etichetta:'PSC: prescrizioni particolari',tipo:'textarea',largo:true},
    {nome:'denuncia.data',etichetta:'Denuncia apertura: data',tipo:'data'},{nome:'denuncia.dal',etichetta:'Denuncia: dal',tipo:'data'},{nome:'denuncia.al',etichetta:'Denuncia: al',tipo:'data'},{nome:'denuncia.importoComplessivo',etichetta:'Importo complessivo lavori',tipo:'euro'},{nome:'denuncia.importoPavimass',etichetta:'Importo dell'+String.fromCharCode(39)+'impresa',tipo:'euro'},
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
