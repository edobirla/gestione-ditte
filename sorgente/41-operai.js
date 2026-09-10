// ---------------------------------------------------------------------
// OPERAI: elenco, scheda persona, documenti, scadenzario complessivo.
// Qui vivono anche gli aiuti condivisi sulle scadenze (usati da dashboard, cantieri, pacchetto).
// ---------------------------------------------------------------------
function infoDocumento(doc){return statoDocumento(doc,tipoDoc(doc.tipoId),oggi(),soglie())}
function documentiPersona(pid){return stato.documenti.filter(d=>d.soggettoTipo==='persona'&&d.soggettoId===pid)}
function documentiAzienda(){return stato.documenti.filter(d=>d.soggettoTipo==='azienda')}
function idoneita(p){
  const r=idoneitaPersona(p,documentiPersona(p.id),stato.tipiDocumento.filter(t=>t.ambito==='persona'&&t.bloccaIdoneita),oggi(),soglie());
  // documenti richiesti ma non bloccanti (checklist): mancanti/scaduti segnalati a parte
  const nonBloccanti=idoneitaPersona(p,documentiPersona(p.id),stato.tipiDocumento.filter(t=>t.ambito==='persona'&&!t.bloccaIdoneita&&t.obbligatorio!=='no'),oggi(),soglie());
  r.avvisi=nonBloccanti.motivi;
  r.dettagliTutti=[...r.dettagli,...nonBloccanti.dettagli];
  return r;
}
function nomeSoggettoDoc(d){
  if(d.soggettoTipo==='azienda') return stato.azienda.ragioneSociale;
  if(d.soggettoTipo==='persona') return nomePersona(persona(d.soggettoId))||'[persona eliminata]';
  if(d.soggettoTipo==='cantiere') return 'Cantiere '+nomeCantiere(d.soggettoId);
  if(d.soggettoTipo==='cliente') return nomeCliente(d.soggettoId);
  if(d.soggettoTipo==='mezzo') return 'Mezzo '+nomeMezzo(perId('mezzi',d.soggettoId));
  return '';
}
function hrefSoggettoDoc(d){return d.soggettoTipo==='persona'?'#/operai/'+d.soggettoId:d.soggettoTipo==='cantiere'?'#/cantieri/'+d.soggettoId:d.soggettoTipo==='cliente'?'#/clienti/'+d.soggettoId:d.soggettoTipo==='mezzo'?'#/mezzi/'+d.soggettoId:'#/impostazioni'}
// Riepilogo scadenze su tutte le persone attive (che vanno in cantiere) e sull'azienda
function riepilogoScadenze(){
  const righe=[];const mancanti=[];
  const oggiIso=oggi();
  for(const p of stato.persone.filter(p=>p.attivo)){
    const idn=idoneita(p);
    for(const det of idn.dettagliTutti){
      if(det.stato==='mancante'&&p.inCantiere!==false) mancanti.push({persona:p,tipo:det.tipo,nome:det.nome,bloccante:!!det.tipo.bloccaIdoneita});
    }
    for(const d of documentiPersona(p.id)){
      const info=infoDocumento(d);
      righe.push({doc:d,info,soggetto:nomePersona(p),persona:p,tipo:tipoDoc(d.tipoId)});
    }
  }
  for(const d of documentiAzienda()){righe.push({doc:d,info:infoDocumento(d),soggetto:stato.azienda.ragioneSociale,persona:null,tipo:tipoDoc(d.tipoId)})}
  for(const m of stato.mezzi){for(const d of documentiDi('mezzo',m.id)){righe.push({doc:d,info:infoDocumento(d),soggetto:'Mezzo '+nomeMezzo(m),persona:null,tipo:tipoDoc(d.tipoId)})}}
  const conData=righe.filter(r=>r.info.data);
  const s=soglie();
  return {
    righe,mancanti,
    scaduti:conData.filter(r=>r.info.stato==='scaduto'),
    entro60:conData.filter(r=>r.info.stato==='scadenza'),
    entro90:conData.filter(r=>r.info.stato==='pianificare'),
    validi:conData.filter(r=>r.info.stato==='valido'),
    senzaScadenza:righe.filter(r=>!r.info.data),
    soglie:s,oggi:oggiIso,
  };
}
function documentoPiuCritico(p){
  const docs=documentiPersona(p.id).map(d=>({d,info:infoDocumento(d)}));
  const idn=idoneita(p);
  const manc=idn.dettagliTutti.find(x=>x.stato==='mancante');
  const ord=['scaduto','scadenza','pianificare','valido','riferimento'];
  docs.sort((a,b)=>ord.indexOf(a.info.stato)-ord.indexOf(b.info.stato)||(a.info.giorni||0)-(b.info.giorni||0));
  const peggio=docs[0];
  if(manc&&manc.tipo.bloccaIdoneita&&(!peggio||peggio.info.stato!=='scaduto')) return {stato:'mancante',testo:manc.nome+': mancante'};
  if(!peggio) return manc?{stato:'mancante',testo:manc.nome+': mancante'}:{stato:'riferimento',testo:'Nessun documento'};
  const t=tipoDoc(peggio.d.tipoId);
  return {stato:peggio.info.stato,testo:(t?t.nome:'')+(peggio.info.data?' · '+fData(peggio.info.data):''),info:peggio.info,doc:peggio.d};
}

// ---- elenco ----
VISTE.operai=function(r){
  if(r.query.nuovo){setTimeout(()=>{dialogoPersona(null)},0);history.replaceState(null,'','#/operai')}
  if(r.id==='scadenzario') return vistaScadenzario(r);
  if(r.id) return vistaPersona(r.id,r);
  const filtro=ui.filtri.operai||{stato:'attivi',cerca:''};
  let persone=stato.persone.slice();
  if(filtro.stato==='attivi') persone=persone.filter(p=>p.attivo);
  if(filtro.stato==='cessati') persone=persone.filter(p=>!p.attivo);
  if(filtro.cerca){const q=normalizzaTesto(filtro.cerca);persone=persone.filter(p=>normalizzaTesto(nomePersona(p)+' '+(p.mansione||'')+' '+(p.cf||'')).includes(q))}
  const righe=persone.map(p=>{const idn=p.inCantiere!==false?idoneita(p):null;const crit=documentoPiuCritico(p);const prossima=documentiPersona(p.id).map(d=>infoDocumento(d)).filter(i=>i.data&&i.giorni>=0).sort((a,b)=>a.giorni-b.giorni)[0];return {p,idn,crit,prossima}});
  const sc=riepilogoScadenze();
  return html`<div class="testata"><div><h1>Operai</h1><div class="sotto">${plurale(stato.persone.filter(p=>p.attivo).length,'persona attiva','persone attive')} · ${sc.scaduti.length} documenti scaduti · ${sc.mancanti.filter(m=>m.bloccante).length} mancanti bloccanti</div></div>
    <div class="azioni"><a class="pulsante" href="#/operai/scadenzario">${icona('calendario')}Scadenzario</a><button class="pulsante" data-azione="persona-da-documento" title="Carica l'UNILAV (o un altro PDF con i dati scritti) e compilo l'anagrafica">${icona('magia')}Da UNILAV o documento</button><button class="pulsante primario" data-azione="persona-nuova">${icona('piu')}Nuova persona</button></div></div>
  <div class="strumenti-tabella"><input type="search" placeholder="Cerca per nome, mansione, codice fiscale" value="${filtro.cerca}" data-cambio="filtro-operai" data-campo="cerca" aria-label="Cerca persone"><div class="gruppo-pulsanti">${['attivi','tutti','cessati'].map(s=>html`<button class="pulsante piccolo ${filtro.stato===s?'attivo':''}" data-azione="filtro-operai-stato" data-valore="${s}">${capitalizza(s)}</button>`)}</div>${pulsanteCancellaFiltri(!!filtro.cerca||filtro.stato!=='attivi','filtro-operai-reset')}<span class="conteggio">${righe.length} persone</span></div>
  ${tabella({id:'operai',righe,chiaveOrd:'nome',href:r=>'#/operai/'+r.p.id,classeRiga:r=>'riga-'+r.crit.stato,colonne:[
    {chiave:'nome',titolo:'Persona',principale:true,valore:r=>nomePersona(r.p),formatta:r=>html`<span class="riga stretta">${avatar(r.p)}<span><b>${nomePersona(r.p)}</b><br><span class="piccolo secondario">${r.p.mansione||''}${r.p.attivo?'':' · cessato'}</span></span></span>`},
    {chiave:'tipo',titolo:'Tipo',valore:r=>TIPI_PERSONA[r.p.tipo]||r.p.tipo},
    {chiave:'idoneita',titolo:'Idoneità al cantiere',valore:r=>r.idn?(r.idn.idonea?1:0):2,formatta:r=>r.idn?(r.idn.idonea?html`<span class="pillola valido">${icona('ok')}Idoneo</span>${r.idn.avvisi.length?html` <span class="piccolo secondario" title="${r.idn.avvisi.join('; ')}">manca ${r.idn.avvisi.length}</span>`:''}`:html`<span class="pillola scaduto" title="${r.idn.motivi.join('; ')}">${icona('blocco')}Non idoneo</span><br><span class="piccolo secondario">${tronca(r.idn.motivi[0],48)}</span>`):html`<span class="silenzioso">non va in cantiere</span>`},
    {chiave:'critico',titolo:'Documento più critico',valore:r=>STATI_DOC[r.crit.stato]?STATI_DOC[r.crit.stato].ordine:9,formatta:r=>html`${pillola(r.crit.stato,undefined,{stimata:r.crit.info&&r.crit.info.stimata})}<br><span class="piccolo secondario">${r.crit.testo}</span>`},
    {chiave:'prossima',titolo:'Prossima scadenza',valore:r=>r.prossima?r.prossima.giorni:99999,formatta:r=>r.prossima?html`${fData(r.prossima.data)} <span class="piccolo secondario">(${fGiorni(r.prossima.giorni)})</span>`:html`<span class="silenzioso">—</span>`},
    {chiave:'tariffa',titolo:'Retribuzione',num:true,valore:r=>r.p.retribuzione.tariffaOraria||r.p.retribuzione.importoFisso||0,formatta:r=>testoRetribuzione(r.p)},
  ],vuoto:vuoto({icona:'operai',titolo:'Nessuna persona',testo:'Aggiungi le persone dell\'azienda per seguire documenti, scadenze e presenze.',azione:{testo:'Nuova persona',azione:'persona-nuova'}})})}`;
};
function testoRetribuzione(p){const r=p.retribuzione||{};const parti=[];if(r.tariffaOraria)parti.push(fNum(r.tariffaOraria,r.tariffaOraria%1?2:0)+' €/h');if(r.importoFisso)parti.push(fEuroInt(r.importoFisso)+'/mese');return parti.length?grezzo(parti.map(h).join(' + ')):daCompilare('da definire')}
AZIONI['filtro-operai']=(d,t)=>{ui.filtri.operai=Object.assign({stato:'attivi',cerca:''},ui.filtri.operai,{[d.campo]:t.value});render();setTimeout(()=>{const i=el('.strumenti-tabella input[type=search]');if(i&&d.campo==='cerca'){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
document.addEventListener('input',debounce(e=>{const t=e.target;if(t.matches&&t.matches('[data-cambio="filtro-operai"]')){AZIONI['filtro-operai']({campo:t.dataset.campo},t)}},250));
AZIONI['filtro-operai-stato']=d=>{ui.filtri.operai=Object.assign({stato:'attivi',cerca:''},ui.filtri.operai,{stato:d.valore});render()};
AZIONI['filtro-operai-reset']=()=>{ui.filtri.operai={stato:'attivi',cerca:''};render()};
AZIONI['persona-nuova']=()=>dialogoPersona(null);
// ---- anagrafica ricavata da un documento (UNILAV, o qualsiasi PDF con i dati scritti) ----
// L'UNILAV è il caso buono: è un modulo con "etichetta: valore", e la sezione del lavoratore è
// separata da quella del datore di lavoro (che ha gli stessi nomi di campo, e senza distinguerle si
// finirebbe per registrare l'impresa stessa come persona).
function daCodiceFiscale(cf){
  const MESI={A:1,B:2,C:3,D:4,E:5,H:6,L:7,M:8,P:9,R:10,S:11,T:12};
  if(!cf||!validaCodiceFiscale(cf).ok) return null;
  cf=cf.toUpperCase();
  const dec=(x)=>x.replace(/[LMNPQRSTUV]/g,c=>String('LMNPQRSTUV'.indexOf(c)));
  const anno=+dec(cf.slice(6,8)),mese=MESI[cf[8]],giorno=+dec(cf.slice(9,11));
  if(!mese||!giorno) return null;
  const donna=giorno>40;const g=donna?giorno-40:giorno;
  const secolo=anno>(new Date().getFullYear()%100)?1900:2000;
  return {dataNascita:(secolo+anno)+'-'+pad2(mese)+'-'+pad2(g),sesso:donna?'F':'M'};
}
function anagraficaDaTesto(testo){
  const t=testo.replace(/\r/g,'');
  const eUnilav=/unilav|comunicazione\s+obbligatoria/i.test(t);
  // nell'UNILAV si guarda solo da "Lavoratore" in poi, altrimenti si prende il datore di lavoro
  const zona=eUnilav?t.slice(Math.max(0,t.search(/\bLavoratore\b/))):t;
  const campo=(...etichette)=>{
    for(const e of etichette){
      const re=new RegExp(e+'\\s*[:\\.]?\\s*([^\\n]{1,90})','i');
      const m=re.exec(zona);
      if(m){const v=m[1].trim().replace(/\s{2,}/g,' ');if(v&&!/^[:\-–]/.test(v))return v}
    }
    return null;
  };
  const data=(x)=>{const m=x&&/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(x);return m?interpretaData(m[0]):null};
  let cf=campo('codice\\s*fiscale','codice\\s*f');
  if(cf) cf=(cf.match(/[A-Z0-9]{16}/i)||[cf])[0].toUpperCase();
  if(!cf||!validaCodiceFiscale(cf).ok){const m=zona.match(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/);if(m&&validaCodiceFiscale(m[0]).ok)cf=m[0]}
  const capM=/\bCAP[^\n:]{0,20}:\s*(\d{5})\b/i.exec(zona);
  const cap=capM?capM[1]:null;
  const comune=campo('comune\\s+di\\s+domicilio','comune\\s+di\\s+residenza','comune'),via=campo('indirizzo\\s+di\\s+domicilio','indirizzo\\s+di\\s+residenza','indirizzo');
  const dalCf=daCodiceFiscale(cf);
  const out={
    cognome:campo('cognome'),nome:campo('^nome','\\bnome\\b'),cf:cf||null,
    dataNascita:data(campo('data\\s+di\\s+nascita','nato\\s+il','nata\\s+il'))||(dalCf?dalCf.dataNascita:null),
    luogoNascita:campo('comune\\s+o\\s+in\\s+alternativa\\s+stato\\s+straniero\\s+di\\s+nascita','luogo\\s+di\\s+nascita','comune\\s+di\\s+nascita','nato\\s+a','nata\\s+a'),
    nazionalita:campo('cittadinanza','nazionalit'),
    residenza:[via,[cap,comune&&capitalizzaNome(comune)].filter(Boolean).join(' ')].filter(Boolean).join(', ')||campo('residenza')||null,
    mansione:campo('qualifica\\s+professionale[^:]*','qualifica'),
    dataAssunzione:data(campo('data\\s+inizio\\s+rapporto')),
  };
  if(out.cognome) out.cognome=capitalizzaNome(out.cognome);
  if(out.nome) out.nome=capitalizzaNome(out.nome);
  if(out.luogoNascita) out.luogoNascita=capitalizzaNome(out.luogoNascita);
  if(out.nazionalita) out.nazionalita=capitalizzaNome(out.nazionalita);
  if(out.mansione) out.mansione=capitalizzaNome(out.mansione);
  const scadPermesso=data(campo('scadenza\\s+titolo\\s+di\\s+soggiorno'));
  return {dati:out,eUnilav,scadenzaPermesso:scadPermesso,trovati:Object.entries(out).filter(([k,v])=>v).map(([k])=>k)};
}
function capitalizzaNome(x){return String(x||'').toLowerCase().replace(/(^|[\s'\-])([a-zà-ù])/g,(m,a,b)=>a+b.toUpperCase())}
AZIONI['persona-da-documento']=async d=>{
  const fs=await scegliFile({multipli:false});
  if(!fs.length) return;
  const f=fs[0];
  if(!ePdf(f.type,f.name)) return informa('Serve un documento con il testo dentro','Da una fotografia o da una scansione l’applicazione non sa leggere le lettere: servirebbe un riconoscimento del testo che non ha.\n\nFunziona con l’UNILAV e con i PDF scaricati (non fotografati). Con la carta d’identità in fotografia, compila a mano: i campi sono gli stessi.');
  const prog=dialogoAvanzamento('Lettura del documento',{testo:'Leggo «'+f.name+'»…'});
  let testo=''; try{ testo=(await estraiTestoPdf(f)).testo }catch(e){ prog.chiudi(); return segnalaErrore(e,'Non sono riuscito a leggere il PDF') }
  prog.chiudi();
  if(!testo||testo.replace(/\s/g,'').length<40) return informa('Niente testo in questo PDF','Sembra una scansione: le lettere sono un’immagine, non testo. Compila a mano oppure usa il PDF originale scaricato.');
  const r=anagraficaDaTesto(testo);
  if(!r.dati.cognome&&!r.dati.cf) return informa('Non ho riconosciuto un’anagrafica','In questo documento non ho trovato né un cognome né un codice fiscale validi.');
  const esistente=r.dati.cf?stato.persone.find(x=>x.cf&&x.cf.toUpperCase()===r.dati.cf):null;
  const conferma_=await dialogo({titolo:'Dati letti da «'+f.name+'»',corpo:html`<p class="piccolo secondario">${r.eUnilav?'Riconosciuto come UNILAV: ho letto la sezione del lavoratore, non quella del datore di lavoro.':'Letto come modulo con etichette.'} Controlla e correggi nella scheda che si apre: niente viene salvato finché non premi Salva.</p>
    <table class="tabella densa"><tbody>${Object.entries({Cognome:r.dati.cognome,Nome:r.dati.nome,'Codice fiscale':r.dati.cf,'Data di nascita':r.dati.dataNascita?fData(r.dati.dataNascita):null,'Luogo di nascita':r.dati.luogoNascita,'Cittadinanza':r.dati.nazionalita,'Residenza':r.dati.residenza,'Mansione':r.dati.mansione,'Assunzione':r.dati.dataAssunzione?fData(r.dati.dataAssunzione):null}).map(([k,v])=>html`<tr><td>${k}</td><td>${v?html`<b>${v}</b>`:html`<span class="silenzioso">non trovato</span>`}</td></tr>`)}</tbody></table>
    ${esistente?html`<div class="avviso-inline attenzione mt-s">${icona('attenzione')}<div class="corpo">Questo codice fiscale è già di <b>${nomePersona(esistente)}</b>: aggiorno la sua scheda invece di crearne una nuova.</div></div>`:''}
    ${r.scadenzaPermesso?html`<p class="piccolo secondario mt-s">Il documento indica un permesso di soggiorno in scadenza il ${fData(r.scadenzaPermesso)}: registralo fra i documenti della persona.</p>`:''}`,
    pulsanti:[{testo:'Annulla',valore:false},{testo:esistente?'Aggiorna la scheda':'Apri la scheda compilata',classe:'primario',primario:true,valore:true}]});
  if(!conferma_) return;
  const base=esistente?Object.assign({},esistente):{attivo:true,inLibroPresenze:true,sezionePresenze:'dipendenti',inCantiere:true,qualifiche:[],retribuzione:{tipo:'oraria'},tipo:'dipendente'};
  for(const [k,v] of Object.entries(r.dati)) if(v) base[k]=v;
  dialogoPersona(esistente?base:Object.assign(base,{id:undefined}));
};
AZIONI['persona-modifica']=d=>dialogoPersona(persona(d.id));
AZIONI['persona-cessa']=async d=>{
  const p=persona(d.id);
  const v=await dialogoModulo('Cessa '+nomePersona(p),[{nome:'dataCessazione',etichetta:'Data di cessazione',tipo:'data',obbligatorio:true}],{dataCessazione:oggi()},{ok:'Cessa',intro:html`<p class="piccolo secondario">Non risulterà più attiva: sparisce da nuove assegnazioni in cantiere, dalle presenze future e dallo scadenzario. Resta nello storico e si può riattivare in ogni momento.</p>`});
  if(!v)return;
  esegui('Cessato '+nomePersona(p),s=>{const x=s.persone.find(x=>x.id===p.id);x.attivo=false;x.dataCessazione=v.dataCessazione});
};
AZIONI['persona-riattiva']=async d=>{
  const p=persona(d.id);
  if(!(await conferma('Riattivare '+nomePersona(p)+'? Torna attiva e assegnabile ai cantieri.')))return;
  esegui('Riattivato '+nomePersona(p),s=>{const x=s.persone.find(x=>x.id===p.id);x.attivo=true;x.dataCessazione=null});
};

// ---- scheda persona ----
function vistaPersona(id,r){
  const p=persona(id); if(!p) return html`<div class="vuoto">${icona('attenzione')}<h3>Persona non trovata</h3><a class="pulsante" href="#/operai">Torna all'elenco</a></div>`;
  const idn=p.inCantiere!==false?idoneita(p):null;
  const ling=linguettaAttiva('persona:'+p.id,'documenti');
  const docs=documentiPersona(p.id);
  const nDocCritici=docs.filter(d=>['scaduto','scadenza'].includes(infoDocumento(d).stato)).length+(idn?idn.dettagliTutti.filter(x=>x.stato==='mancante').length:0);
  return html`<div class="briciole"><a href="#/operai">Operai</a> › ${nomePersona(p)}</div>
  <div class="testata"><div class="riga stretta" style="gap:14px">${avatar(p,true)}<div><h1>${nomePersona(p)}</h1><div class="sotto">${p.mansione||''} · ${TIPI_PERSONA[p.tipo]||p.tipo}${p.attivo?'':' · cessato il '+fData(p.dataCessazione)}${(p.qualifiche||[]).length?' · '+p.qualifiche.map(q=>QUALIFICHE[q]||q).join(', '):''}</div></div></div>
    <div class="azioni"><button class="pulsante" data-azione="documento-nuovo" data-soggetto-tipo="persona" data-soggetto-id="${p.id}">${icona('allega')}Aggiungi documento</button><button class="pulsante" data-azione="persona-modifica" data-id="${p.id}">${icona('modifica')}Modifica</button>${p.attivo?html`<button class="pulsante pericolo" data-azione="persona-cessa" data-id="${p.id}">${icona('elimina')}Cessa</button>`:html`<button class="pulsante" data-azione="persona-riattiva" data-id="${p.id}">${icona('aggiorna')}Riattiva</button>`}</div></div>
  ${idn?html`<div class="mb">${idn.idonea?html`<span class="idoneita si">${icona('ok')}Può entrare in cantiere oggi</span>`:html`<span class="idoneita no">${icona('blocco')}Non può entrare in cantiere: ${idn.motivi.join('; ')}</span>`}${idn.avvisi.length?html`<div class="piccolo secondario mt-s">Da regolarizzare (richiesti dalle committenze, non bloccanti): ${idn.avvisi.join('; ')}</div>`:''}</div>`:html`<div class="mb piccolo secondario">Questa persona non va in cantiere: l'idoneità non viene calcolata.</div>`}
  ${linguette('persona:'+p.id,[{id:'documenti',testo:'Documenti',icona:'documenti',contatore:nDocCritici||null,critico:nDocCritici>0},{id:'anagrafica',testo:'Anagrafica',icona:'persona'},{id:'buste',testo:'Buste paga',icona:'busta-paga'},{id:'ore',testo:'Ore',icona:'presenze'},{id:'cantieri',testo:'Cantieri',icona:'cantieri'},{id:'retribuzione',testo:'Retribuzione',icona:'euro'}],ling)}
  ${ling==='documenti'?schedaDocumentiPersona(p,idn):ling==='anagrafica'?schedaAnagrafica(p):ling==='buste'?schedaBustePersona(p):ling==='ore'?schedaOrePersona(p):ling==='cantieri'?schedaCantieriPersona(p):schedaRetribuzione(p)}`;
}
function schedaDocumentiPersona(p,idn){
  const docs=documentiPersona(p.id).map(d=>({d,info:infoDocumento(d),tipo:tipoDoc(d.tipoId)}));
  const mancanti=idn?idn.dettagliTutti.filter(x=>x.stato==='mancante'):[];
  const ord=['scaduto','scadenza','pianificare','valido','riferimento'];
  docs.sort((a,b)=>ord.indexOf(a.info.stato)-ord.indexOf(b.info.stato)||(a.info.giorni||0)-(b.info.giorni||0));
  return html`<div class="zona-drop mb" data-azione="documento-nuovo" data-soggetto-tipo="persona" data-soggetto-id="${p.id}" data-drop-soggetto="persona:${p.id}">${icona('carica')}Trascina qui una scansione o un PDF, oppure clicca per aggiungere un documento</div>
  ${mancanti.length?html`<div class="avviso-inline ${mancanti.some(m=>m.tipo.bloccaIdoneita)?'critico':'attenzione'}">${icona('attenzione')}<div class="corpo"><b>Documenti mancanti:</b> ${mancanti.map(m=>html`<span class="pillola mancante">${icona('blocco')}${m.nome}${m.tipo.bloccaIdoneita?'':' (non bloccante)'}</span> `)}</div></div>`:''}
  ${tabella({id:'docpersona',righe:docs,onRiga:r=>apriDocumento(r.d.id),classeRiga:r=>'riga-'+r.info.stato,colonne:[
    {chiave:'tipo',titolo:'Documento',principale:true,valore:r=>r.tipo?r.tipo.nome:'',formatta:r=>html`<b>${r.tipo?r.tipo.nome:'[tipo?]'}</b>${r.d.titolo?html`<br><span class="piccolo secondario">${r.d.titolo}</span>`:''}${!(r.d.file||[]).length?html`<br><span class="piccolo da-compilare">nessun file allegato</span>`:''}`},
    {chiave:'emissione',titolo:'Emissione',valore:r=>r.d.dataEmissione||'',formatta:r=>r.d.dataEmissione?fData(r.d.dataEmissione):html`<span class="silenzioso">—</span>`},
    {chiave:'scadenza',titolo:'Scadenza',valore:r=>r.info.data||'',formatta:r=>r.info.data?html`<span class="${r.info.stimata?'stimata':''}" title="${r.info.stimata?'Stimata dalla validità tipica':''}">${fData(r.info.data)}${r.info.stimata?' ~':''}</span>`:r.d.senzaScadenza?html`<span class="silenzioso">nessuna</span>`:daCompilare('data?')},
    {chiave:'stato',titolo:'Stato',valore:r=>ord.indexOf(r.info.stato),formatta:r=>pillolaDocumento(r.info)},
    {chiave:'file',titolo:'File',valore:r=>(r.d.file||[]).length,formatta:r=>html`${(r.d.file||[]).map(f=>{const m=fileMeta(f);return m?html`<span class="etichetta-tag" title="${m.nome}">${icona(ePdf(m.mime,m.nome)?'pdf':'immagine','piccola')} ${fPeso(m.dimensione)}</span> `:''})}`},
  ],vuoto:vuoto({icona:'documenti',titolo:'Nessun documento',testo:'Trascina qui le scansioni o aggiungi il primo documento.',azione:{testo:'Aggiungi documento',azione:'documento-nuovo',dati:{'soggetto-tipo':'persona','soggetto-id':p.id}}})})}`;
}
function schedaAnagrafica(p){
  const cfv=p.cf?validaCodiceFiscale(p.cf):null;
  const campo=(et,v,fmt)=>html`<div class="campo"><span class="etichetta-campo">${et}</span><div>${valoreODaCompilare(v,fmt)}</div></div>`;
  return html`<div class="griglia due">
  <div class="scheda"><h3>${icona('persona')}Dati anagrafici</h3><div class="campi">
    ${campo('Cognome',p.cognome)}${campo('Nome',p.nome)}
    <div class="campo"><span class="etichetta-campo">Codice fiscale</span><div class="mono">${valoreODaCompilare(p.cf)} ${cfv&&!cfv.ok?html`<span class="da-compilare piccolo">${cfv.errore}</span>`:''}</div></div>
    ${campo('Data di nascita',p.dataNascita,fData)}${campo('Luogo di nascita',p.luogoNascita)}${campo('Nazionalità',p.nazionalita)}
    <div class="campo largo"><span class="etichetta-campo">Residenza</span><div>${valoreODaCompilare(p.residenza)}</div></div>
  </div></div>
  <div class="scheda"><h3>${icona('telefono')}Contatti</h3><div class="campi">
    <div class="campo"><span class="etichetta-campo">Telefono</span><div>${p.telefono?contattoCliccabile('tel',p.telefono):daCompilare()}</div></div>
    <div class="campo"><span class="etichetta-campo">Email</span><div>${p.email?contattoCliccabile('mail',p.email):daCompilare()}</div></div>
  </div>
  <h3 class="mt">${icona('cantieri')}Rapporto di lavoro</h3><div class="campi">
    ${campo('Tipo',TIPI_PERSONA[p.tipo])}${campo('Mansione',p.mansione)}
    ${campo('Assunzione',p.dataAssunzione,fData)}${campo('Cessazione',p.dataCessazione||(p.attivo?'in forza':null),v=>v==='in forza'?v:fData(v))}
    <div class="campo largo"><span class="etichetta-campo">Qualifiche</span><div>${(p.qualifiche||[]).length?p.qualifiche.map(q=>html`<span class="etichetta-tag">${QUALIFICHE[q]||q}</span> `):html`<span class="silenzioso">nessuna</span>`}</div></div>
  </div></div>
  <div class="scheda"><h3>${icona('presenze')}Presenze e cantiere</h3><div class="campi">
    <div class="campo"><span class="etichetta-campo">Libro presenze</span><div>${p.inLibroPresenze?html`sì, sezione ${p.sezionePresenze}${p.soloTrasferte?' (solo riga trasferte)':''}`:'no'}</div></div>
    <div class="campo"><span class="etichetta-campo">Va in cantiere</span><div>${p.inCantiere!==false?'sì':'no'}</div></div>
    ${p.schemaOrario?html`<div class="campo largo"><span class="etichetta-campo">Schema orario personale</span><div>${['lun','mar','mer','gio','ven'].map(g=>g+' '+(p.schemaOrario[g]||0)).join(' · ')}</div></div>`:''}
  </div></div>
  <div class="scheda"><h3>${icona('fotocamera')}Foto <span class="azioni"><button class="pulsante piccolo" data-azione="persona-foto" data-id="${p.id}">${icona('fotocamera','piccola')}${p.fotoImg?'Sostituisci':'Carica'}</button>${p.fotoImg?html`<button class="pulsante piccolo pericolo" data-azione="persona-foto-togli" data-id="${p.id}">${icona('elimina','piccola')}Togli</button>`:''}</span></h3>
    ${p.fotoImg?html`<img src="${p.fotoImg}" alt="Foto di ${nomePersona(p)}" class="foto-persona">`:html`<p class="secondario piccolo">Nessuna foto. Serve a riconoscere l'operaio a colpo d'occhio negli elenchi.</p>`}</div>
  <div class="scheda"><h3>${icona('firma')}Firma <span class="azioni"><button class="pulsante piccolo" data-azione="persona-firma" data-id="${p.id}">${icona('fotocamera','piccola')}${p.firmaImg?'Sostituisci':'Carica da una foto'}</button>${p.firmaImg?html`<button class="pulsante piccolo pericolo" data-azione="persona-firma-togli" data-id="${p.id}">${icona('elimina','piccola')}Togli</button>`:''}</span></h3>
    ${p.firmaImg?html`<div class="riquadro-firma"><img src="${p.firmaImg}" alt="Firma di ${nomePersona(p)}"></div>`:html`<p class="secondario piccolo">Nessuna firma. Fotografa la firma su un foglio bianco: l'app toglie lo sfondo e la usa nelle nomine che questa persona deve firmare per accettazione.</p>`}</div>
  ${p.note?html`<div class="scheda"><h3>${icona('info')}Note</h3><p>${p.note}</p></div>`:''}
  </div>`;
}
// Firma da foto: si sceglie la soglia guardando l'anteprima, perché la carta fotografata non è mai
// bianca allo stesso modo (ombra, foglio giallino, scansione chiara).
AZIONI['persona-foto-togli']=async d=>{const p=persona(d.id);if(!(await conferma('Togliere la foto di '+nomePersona(p)+'?',{pericolo:true})))return;esegui('Tolta la foto di '+nomePersona(p),s=>{s.persone.find(x=>x.id===d.id).fotoImg=null})};
AZIONI['persona-foto']=async d=>{
  const p=persona(d.id);
  const fs=await scegliFile({multipli:false,accetta:'image/*'});
  if(!fs.length) return;
  let img; try{ img=await caricaImmagine(fs[0]); }
  catch(e){ return segnalaErrore(e,'Non sono riuscito a leggere «'+fs[0].name+'»: se è una foto HEIC dell\'iPhone riesportala in JPG'); }
  const dataUrl=await ritagliaFoto(img,nomePersona(p));
  if(!dataUrl) return;
  esegui('Foto di '+nomePersona(p),s=>{s.persone.find(x=>x.id===d.id).fotoImg=dataUrl});
};
// Il ritaglio si fa a mano: la faccia non sta quasi mai al centro della foto, e un ritaglio
// automatico centrato taglia le teste. Si trascina l'immagine e si ingrandisce finché sta nel
// cerchio, che è la forma con cui la foto si vede davvero negli elenchi.
function ritagliaFoto(img,nome){
  const LATO=320;
  let scala=1,ox=0,oy=0;
  const corpo=html`<p class="piccolo secondario">Trascina la foto per spostarla e usa la barra (o la rotella) per ingrandirla. Quello che resta dentro il cerchio è quello che si vedrà.</p>
    <div class="ritaglio-foto"><canvas id="rf-tela" width="${LATO}" height="${LATO}"></canvas><div class="maschera"></div></div>
    <div class="riga mt-s"><span class="piccolo secondario">Ingrandimento</span><input type="range" id="rf-zoom" min="100" max="400" value="100" style="flex:1"></div>`;
  return dialogo({titolo:'Foto di '+nome,corpo,senzaFocus:true,valoreEscape:null,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Usa questa foto',classe:'primario',primario:true,fn:v=>v.querySelector('#rf-tela').toDataURL('image/jpeg',0.85)}],
    alMontaggio:v=>{
      const tela=v.querySelector('#rf-tela'),ctx=tela.getContext('2d'),zoom=v.querySelector('#rf-zoom');
      const base=Math.max(LATO/img.width,LATO/img.height); // la foto copre sempre tutto il quadrato
      ox=(LATO-img.width*base)/2;oy=(LATO-img.height*base)/2;
      const limita=()=>{const w=img.width*base*scala,hh=img.height*base*scala;ox=Math.min(0,Math.max(LATO-w,ox));oy=Math.min(0,Math.max(LATO-hh,oy))};
      const disegna=()=>{limita();ctx.fillStyle='#fff';ctx.fillRect(0,0,LATO,LATO);ctx.drawImage(img,ox,oy,img.width*base*scala,img.height*base*scala)};
      disegna();
      zoom.addEventListener('input',()=>{const nuovo=+zoom.value/100;const c=LATO/2;ox=c-(c-ox)*(nuovo/scala);oy=c-(c-oy)*(nuovo/scala);scala=nuovo;disegna()});
      let trascina=null;
      tela.addEventListener('pointerdown',e=>{trascina={x:e.clientX-ox,y:e.clientY-oy};tela.setPointerCapture(e.pointerId)});
      tela.addEventListener('pointermove',e=>{if(!trascina)return;ox=e.clientX-trascina.x;oy=e.clientY-trascina.y;disegna()});
      const fine=()=>trascina=null;tela.addEventListener('pointerup',fine);tela.addEventListener('pointercancel',fine);
      tela.addEventListener('wheel',e=>{e.preventDefault();const nuovo=Math.min(4,Math.max(1,scala*(e.deltaY<0?1.1:1/1.1)));const c=LATO/2;ox=c-(c-ox)*(nuovo/scala);oy=c-(c-oy)*(nuovo/scala);scala=nuovo;zoom.value=Math.round(nuovo*100);disegna()},{passive:false});
    }});
}
AZIONI['persona-firma-togli']=async d=>{const p=persona(d.id);if(!(await conferma('Togliere la firma di '+nomePersona(p)+'?',{pericolo:true})))return;esegui('Tolta la firma di '+nomePersona(p),s=>{s.persone.find(x=>x.id===d.id).firmaImg=null})};
AZIONI['persona-firma']=async d=>{
  const p=persona(d.id);
  const fs=await scegliFile({multipli:false,accetta:'image/*'});
  if(!fs.length) return;
  let soglia=SOGLIA_FIRMA,ultima=null;
  const ris=await dialogo({titolo:'Firma di '+nomePersona(p),largo:true,
    corpo:html`<p class="piccolo secondario">Lo sfondo del foglio diventa trasparente: resta solo il tratto della penna. Se sparisce troppo alza la soglia, se resta il grigio del foglio abbassala.</p>
      <div class="campo"><span class="etichetta-campo">Soglia dello sfondo</span><input type="range" id="fr-soglia" min="120" max="245" value="${SOGLIA_FIRMA}"> <span id="fr-val">${SOGLIA_FIRMA}</span></div>
      <div class="riquadro-firma mt" style="min-height:120px"><img id="fr-ant" alt="Anteprima della firma"></div>
      <p class="piccolo da-compilare" id="fr-errore"></p>`,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Salva la firma',classe:'primario',primario:true,fn:()=>ultima}],
    alMontaggio:v=>{
      const sl=v.querySelector('#fr-soglia'),val=v.querySelector('#fr-val'),ant=v.querySelector('#fr-ant'),err=v.querySelector('#fr-errore');
      const aggiorna=async()=>{val.textContent=sl.value;try{ultima=await firmaSenzaSfondo(fs[0],+sl.value);ant.src=ultima;err.textContent=''}catch(e){ultima=null;ant.removeAttribute('src');err.textContent=e.message}};
      sl.addEventListener('input',debounce(aggiorna,120));
      aggiorna();
    }});
  if(!ris) return;
  esegui('Firma di '+nomePersona(p),s=>{s.persone.find(x=>x.id===d.id).firmaImg=ris});
};
function schedaBustePersona(p){
  const buste=stato.bustePaga.filter(b=>b.personaId===p.id);
  const anni=unici([...buste.map(b=>b.anno),new Date().getFullYear()]).sort((a,b)=>b-a);
  const oggiD=new Date();
  return html`<div class="scheda"><h3>Buste paga <span class="azioni"><a class="pulsante piccolo" href="#/documenti/buste?persona=${p.id}">${icona('busta-paga')}Smistamento</a></span></h3>
  ${anni.map(anno=>html`<div class="sezione-titolo">${anno}</div><div class="griglia-mesi">${Array.from({length:12},(_,i)=>i+1).map(m=>{const b=buste.find(x=>x.anno===anno&&x.mese===m);const futuro=anno>oggiD.getFullYear()||(anno===oggiD.getFullYear()&&m>oggiD.getMonth());const lavorato=!!(meseP(anno,m)&&meseP(anno,m).persone[p.id]);return html`<div class="mese-cella ${b?'presente':futuro?'futuro':lavorato?'mancante':''}" ${b?html`data-azione="busta-apri" data-id="${b.id}"`:''} title="${b?'Busta paga presente':futuro?'':lavorato?'Mese lavorato senza busta paga':'Nessuna busta'}">${NOMI_MESI_BREVI[m-1]}${b?html`<br>${icona('ok','piccola')}`:lavorato&&!futuro?html`<br>${icona('attenzione','piccola')}`:''}</div>`})}</div>`)}
  <p class="piccolo secondario mt">I mesi con presenze registrate ma senza busta paga sono evidenziati in rosso.</p></div>`;
}
function schedaOrePersona(p){
  const oggiD=new Date();const righe=[];
  for(let i=0;i<12;i++){const d=new Date(oggiD.getFullYear(),oggiD.getMonth()-i,1);const anno=d.getFullYear(),mese=d.getMonth()+1;const m=meseP(anno,mese);const mp=m&&m.persone[p.id];const calc=mp?calcolaMesePersona(mp,p):null;righe.push({anno,mese,mp,calc})}
  return html`<div class="scheda"><h3>Ore negli ultimi dodici mesi</h3>${tabella({righe,colonne:[
    {chiave:'mese',titolo:'Mese',principale:true,formatta:r=>html`<a href="#/presenze/${r.anno}-${pad2(r.mese)}">${fMeseAnno(r.anno,r.mese)}</a>`},
    {chiave:'ore',titolo:'Ore',num:true,formatta:r=>r.calc?fOre(r.calc.oreGriglia):html`<span class="silenzioso">—</span>`},
    {chiave:'assenze',titolo:'Assenze',formatta:r=>r.calc?Object.entries(r.calc.perCodice).map(([c,n])=>html`<span class="etichetta-tag" title="${CODICI_ASSENZA[c]?CODICI_ASSENZA[c].nome:c}">${c} ${n}</span> `):''},
    {chiave:'importo',titolo:'Importo',num:true,formatta:r=>r.calc?html`${fEuro(r.calc.importo,0)}${r.mp.importoForzato?html` <span class="piccolo secondario" title="Importo forzato a mano">✎</span>`:''}`:html`<span class="silenzioso">—</span>`},
    {chiave:'foglio',titolo:'Foglio ore',formatta:r=>r.mp&&r.mp.foglioOreId?html`<button class="pulsante piccolo" data-azione="file-apri" data-id="${r.mp.foglioOreId}">${icona('immagine','piccola')}Vedi</button>`:html`<span class="silenzioso">—</span>`},
  ]})}</div>`;
}
function schedaCantieriPersona(p){
  const cs=stato.cantieri.filter(c=>(c.operai||[]).includes(p.id)||c.prepostoId===p.id);
  return html`<div class="scheda"><h3>Cantieri</h3>${cs.length?tabella({righe:cs,href:c=>'#/cantieri/'+c.id,colonne:[{chiave:'nome',titolo:'Cantiere',principale:true,formatta:c=>html`<b>${c.nome}</b>${c.prepostoId===p.id?html` <span class="etichetta-tag">preposto</span>`:''}`},{chiave:'periodo',titolo:'Periodo',formatta:c=>c.dataInizio?fData(c.dataInizio)+' → '+(c.dataFine?fData(c.dataFine):'…'):(c.periodoTesto||'')},{chiave:'aff',titolo:'Impresa affidataria',formatta:c=>nomeCliente(c.affidatariaId)},{chiave:'stato',titolo:'Stato',formatta:c=>STATI_CANTIERE[c.stato]||c.stato}]}):html`<p class="secondario">Non è assegnato a nessun cantiere.</p>`}</div>`;
}
function schedaRetribuzione(p){
  const r=p.retribuzione||{};
  const mesi=Object.keys(stato.presenze).sort().reverse().filter(k=>stato.presenze[k].persone[p.id]).slice(0,24);
  const righe=mesi.map(k=>{const {anno,mese}=daChiaveMese(k);const mp=stato.presenze[k].persone[p.id];const calc=calcolaMesePersona(mp,p);return {k,anno,mese,calc,mp}});
  return html`<div class="griglia due"><div class="scheda"><h3>Retribuzione <span class="azioni"><button class="pulsante piccolo" data-azione="persona-modifica" data-id="${p.id}">${icona('modifica')}Modifica</button></span></h3>
    <div class="campi"><div class="campo"><span class="etichetta-campo">Tipo</span><div>${{oraria:'Oraria',fissa:'Fissa mensile',mista:'Oraria + fisso'}[r.tipo]||daCompilare()}</div></div><div class="campo"><span class="etichetta-campo">Tariffa oraria</span><div>${r.tariffaOraria?fNum(r.tariffaOraria,2)+' €/h':html`<span class="silenzioso">—</span>`}</div></div><div class="campo"><span class="etichetta-campo">Importo fisso</span><div>${r.importoFisso?fEuro(r.importoFisso)+'/mese':html`<span class="silenzioso">—</span>`}</div></div></div>
    <p class="piccolo secondario mt">Importo mensile = arrotondamento aziendale (ore in griglia × tariffa + aggiustamenti + fisso). L'arrotondamento è a multipli di 10: resto 0–3 per difetto, 4–9 per eccesso.</p></div>
  <div class="scheda"><h3>Storico importi mensili</h3>${righe.length?html`${graficoBarre(righe.slice().reverse().map(x=>({etichetta:NOMI_MESI_BREVI[x.mese-1]+' '+String(x.anno).slice(2),valore:x.calc.importo||0})),{formatta:v=>fNum(v,0),altezza:180})}${tabella({righe,colonne:[{chiave:'k',titolo:'Mese',principale:true,formatta:x=>html`<a href="#/presenze/${x.k}">${fMeseAnno(x.anno,x.mese)}</a>`},{chiave:'ore',titolo:'Ore',num:true,formatta:x=>fOre(x.calc.oreGriglia)},{chiave:'imp',titolo:'Importo',num:true,formatta:x=>fEuro(x.calc.importo,0)}]})}`:html`<p class="secondario">Nessun mese registrato.</p>`}</div></div>`;
}
// ---- dialogo persona ----
function dialogoPersona(p){
  const nuovo=!p; p=p||{attivo:true,inLibroPresenze:true,sezionePresenze:'dipendenti',inCantiere:true,qualifiche:[],retribuzione:{tipo:'oraria'}};
  const campi=[
    {nome:'cognome',etichetta:'Cognome',obbligatorio:true},{nome:'nome',etichetta:'Nome',obbligatorio:true},
    {nome:'tipo',etichetta:'Tipo',tipo:'select',vuoto:false,opzioni:Object.entries(TIPI_PERSONA).map(([v,t])=>({v,t}))},{nome:'mansione',etichetta:'Mansione'},
    {nome:'cf',etichetta:'Codice fiscale',maiuscolo:true,valida:validatoreCF},{nome:'dataNascita',etichetta:'Data di nascita',tipo:'data'},{nome:'luogoNascita',etichetta:'Luogo di nascita'},{nome:'nazionalita',etichetta:'Nazionalità',aiuto:'Serve per sapere se occorre il permesso di soggiorno'},
    {nome:'residenza',etichetta:'Residenza',largo:true},{nome:'telefono',etichetta:'Telefono',tipo:'tel'},{nome:'email',etichetta:'Email',tipo:'email',valida:validatoreEmail},
    {nome:'dataAssunzione',etichetta:'Data assunzione',tipo:'data'},{nome:'dataCessazione',etichetta:'Data cessazione',tipo:'data'},
    {nome:'qualifiche',etichetta:'Qualifiche',tipo:'chip',largo:true,opzioni:Object.entries(QUALIFICHE).map(([v,t])=>({v,t}))},
    {nome:'retribuzione.tipo',etichetta:'Retribuzione',tipo:'select',vuoto:false,opzioni:[{v:'oraria',t:'Oraria'},{v:'fissa',t:'Fissa mensile'},{v:'mista',t:'Oraria + fisso mensile'}]},
    {nome:'retribuzione.tariffaOraria',etichetta:'Tariffa oraria',tipo:'euro'},{nome:'retribuzione.importoFisso',etichetta:'Importo fisso mensile',tipo:'euro'},
    {nome:'attivo',tipo:'spunta',testo:'In forza (attivo)'},{nome:'inCantiere',tipo:'spunta',testo:'Va in cantiere (calcola idoneità)'},{nome:'inLibroPresenze',tipo:'spunta',testo:'Compare nel libro presenze'},
  ];
  if(!nuovo) campi.push(
    {nome:'sezionePresenze',etichetta:'Sezione presenze',tipo:'select',vuoto:false,opzioni:[{v:'soci',t:'Soci'},{v:'dipendenti',t:'Dipendenti'}]},{nome:'soloTrasferte',tipo:'spunta',testo:'Solo riga trasferte (niente ore)'},
    {nome:'schemaOrarioAttivo',tipo:'spunta',testo:'Schema orario settimanale personale'},
    ...['lun','mar','mer','gio','ven'].map(g=>({nome:'schemaOrario.'+g,etichetta:'Ore '+g,tipo:'ore',decimali:0})),
    {nome:'note',etichetta:'Note',tipo:'textarea',largo:true},
  );
  const val=clona(p);val.schemaOrarioAttivo=!!p.schemaOrario;if(!val.schemaOrario)val.schemaOrario={};
  return dialogoModulo(nuovo?'Nuova persona':'Modifica '+nomePersona(p),campi,val,{validaTutto:v=>{if(v.dataAssunzione&&v.dataCessazione&&v.dataCessazione<v.dataAssunzione)return 'La cessazione non può precedere l\'assunzione';return null}}).then(v=>{
    if(!v) return;
    const schema=v.schemaOrarioAttivo?{lun:+v.schemaOrario.lun||0,mar:+v.schemaOrario.mar||0,mer:+v.schemaOrario.mer||0,gio:+v.schemaOrario.gio||0,ven:+v.schemaOrario.ven||0}:null;
    delete v.schemaOrarioAttivo;v.schemaOrario=schema;
    if(v.dataCessazione) v.attivo=false;
    if(nuovo){const id=nuovoId('p');esegui('Aggiunta '+v.cognome+' '+v.nome,s=>{s.persone.push(Object.assign({id,fotoId:null,firmaId:null},v))});vai('operai/'+id)}
    else esegui('Modificata '+nomePersona(p),s=>{const x=s.persone.find(x=>x.id===p.id);Object.assign(x,v)});
  });
}

// ---- scadenzario complessivo ----
function vistaScadenzario(r){
  const sc=riepilogoScadenze();
  const conData=sc.righe.filter(x=>x.info.data).sort((a,b)=>a.info.data<b.info.data?-1:1);
  const gruppi=raggruppa(conData,x=>x.info.data.slice(0,7));
  const filtro=ui.filtri.scadenzario||'tutti';
  const visibili=filtro==='tutti'?conData:filtro==='critici'?conData.filter(x=>['scaduto','scadenza','pianificare'].includes(x.info.stato)):conData.filter(x=>x.info.stato===filtro);
  const gruppiV=raggruppa(visibili,x=>x.info.data.slice(0,7));
  return html`<div class="briciole"><a href="#/operai">Operai</a> › Scadenzario</div>
  <div class="testata"><div><h1>Scadenzario</h1><div class="sotto">Tutte le scadenze di persone, azienda e mezzi, in ordine cronologico. Aggiornato a oggi ${fData(sc.oggi)}.</div></div>
  <div class="azioni"><button class="pulsante" data-azione="stampa-scadenzario">${icona('stampa')}Stampa</button><button class="pulsante" data-azione="esporta-scadenzario-md">${icona('scarica')}Markdown</button><button class="pulsante" data-azione="esporta-scadenzario-csv">${icona('scarica')}CSV</button></div></div>
  <div class="griglia quattro mb">
    <div class="indicatore critico" data-azione="filtro-scadenzario" data-valore="scaduto"><span class="etichetta">${icona('errore')}Scaduti</span><span class="valore">${sc.scaduti.length}</span></div>
    <div class="indicatore critico" data-azione="filtro-scadenzario" data-valore="mancanti"><span class="etichetta">${icona('blocco')}Mancanti</span><span class="valore">${sc.mancanti.length}</span><span class="nota">${sc.mancanti.filter(m=>m.bloccante).length} bloccanti</span></div>
    <div class="indicatore attenzione" data-azione="filtro-scadenzario" data-valore="scadenza"><span class="etichetta">${icona('attenzione')}Entro ${sc.soglie.scadenza} giorni</span><span class="valore">${sc.entro60.length}</span></div>
    <div class="indicatore" data-azione="filtro-scadenzario" data-valore="pianificare"><span class="etichetta">${icona('calendario')}Entro ${sc.soglie.pianificare} giorni</span><span class="valore">${sc.entro90.length}</span></div>
  </div>
  ${filtro!=='mancanti'?html`<div class="strumenti-tabella"><div class="gruppo-pulsanti">${[['tutti','Tutti'],['critici','Da fare'],['scaduto','Scaduti'],['scadenza','In scadenza'],['pianificare','Da pianificare'],['valido','Validi']].map(([v,t])=>html`<button class="pulsante piccolo ${filtro===v?'attivo':''}" data-azione="filtro-scadenzario" data-valore="${v}">${t}</button>`)}</div><span class="conteggio">${visibili.length} scadenze</span></div>`:''}
  ${sc.mancanti.length&&(filtro==='tutti'||filtro==='mancanti')?html`<div class="scheda mb"><h3>${icona('blocco')}Documenti mancanti</h3>${tabella({righe:sc.mancanti,href:m=>'#/operai/'+m.persona.id,colonne:[{chiave:'p',titolo:'Persona',principale:true,formatta:m=>nomePersona(m.persona)},{chiave:'d',titolo:'Documento',formatta:m=>m.nome},{chiave:'b',titolo:'Effetto',formatta:m=>m.bloccante?html`<span class="pillola scaduto">${icona('blocco')}Blocca l'ingresso in cantiere</span>`:html`<span class="pillola pianificare">${icona('info')}Richiesto dalle committenze</span>`}]})}</div>`:''}
  ${filtro!=='mancanti'?html`${Array.from(gruppiV.entries()).length?Array.from(gruppiV.entries()).map(([k,righe])=>{const {anno,mese}=daChiaveMese(k);return html`<div class="sezione-titolo">${fMeseAnno(anno,mese)} · ${righe.length}</div>${tabella({righe,onRiga:x=>apriDocumento(x.doc.id),classeRiga:x=>'riga-'+x.info.stato,colonne:[{chiave:'data',titolo:'Scadenza',principale:true,formatta:x=>html`<b class="${x.info.stimata?'stimata':''}">${fData(x.info.data)}${x.info.stimata?' ~':''}</b> <span class="piccolo secondario">${fGiorni(x.info.giorni)}</span>`},{chiave:'sogg',titolo:'Chi',formatta:x=>x.soggetto},{chiave:'doc',titolo:'Documento',formatta:x=>html`${x.tipo?x.tipo.nome:''}${x.doc.titolo?html` <span class="piccolo secondario">${x.doc.titolo}</span>`:''}`},{chiave:'stato',titolo:'Stato',formatta:x=>pillolaDocumento(x.info,{breve:true})},{chiave:'file',titolo:'File',formatta:x=>(x.doc.file||[]).length?icona('allega','piccola'):html`<span class="da-compilare piccolo">nessuno</span>`}]})}`}):html`<div class="vuoto">${icona('ok')}<h3>Niente in questo filtro</h3></div>`}`:''}
  ${filtro==='tutti'&&sc.senzaScadenza.length?html`<div class="sezione-titolo">Senza scadenza (riferimento) · ${sc.senzaScadenza.length}</div>${tabella({righe:sc.senzaScadenza,onRiga:x=>apriDocumento(x.doc.id),colonne:[{chiave:'sogg',titolo:'Chi',principale:true,formatta:x=>x.soggetto},{chiave:'doc',titolo:'Documento',formatta:x=>html`${x.tipo?x.tipo.nome:''}${x.doc.titolo?html` <span class="piccolo secondario">${x.doc.titolo}</span>`:''}`},{chiave:'em',titolo:'Emissione',formatta:x=>x.doc.dataEmissione?fData(x.doc.dataEmissione):html`<span class="silenzioso">—</span>`},{chiave:'file',titolo:'File',formatta:x=>(x.doc.file||[]).length?icona('allega','piccola'):html`<span class="da-compilare piccolo">nessuno</span>`}]})}`:''}`;
}
AZIONI['filtro-scadenzario']=d=>{ui.filtri.scadenzario=ui.filtri.scadenzario===d.valore?'tutti':d.valore;render()};
